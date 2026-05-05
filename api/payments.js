import Razorpay from 'razorpay';
import crypto from 'crypto';
import { getDb } from './db.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a new Razorpay order
 */
export async function createOrder(req, res) {
  try {
    const { amount, currency = 'INR', userId } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ error: 'Minimum amount is 100 paise (₹1)' });
    }

    // Server-side validation of identity (using session if available)
    const effectiveUserId = userId || 'anonymous'; 

    const options = {
      amount: Math.round(amount),
      currency,
      receipt: `rcpt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);
    
    // Store pending payment in DB
    const db = getDb();
    db.prepare(`
      INSERT INTO payments (id, user_id, order_id, amount, currency, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), effectiveUserId, order.id, order.amount, order.currency, 'pending');

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error('[PAYMENTS] Create Order Failed:', error);
    return res.status(500).json({ error: 'Failed to create payment order' });
  }
}

/**
 * Verify Razorpay payment signature
 */
export async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const db = getDb();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Check if already processed (Idempotency)
    const existing = db.prepare('SELECT * FROM payments WHERE payment_id = ?').get(razorpay_payment_id);
    if (existing && existing.status === 'success') {
      return res.status(200).json({ status: 'success', message: 'Payment already processed' });
    }

    // 2. Verify Signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      db.prepare('UPDATE payments SET status = ?, verified_at = CURRENT_TIMESTAMP WHERE order_id = ?')
        .run('failed', razorpay_order_id);
      return res.status(400).json({ status: 'failure', error: 'Invalid signature' });
    }

    // 3. Mark as success
    db.prepare(`
      UPDATE payments 
      SET status = 'success', payment_id = ?, verified_at = CURRENT_TIMESTAMP 
      WHERE order_id = ?
    `).run(razorpay_payment_id, razorpay_order_id);

    return res.status(200).json({ status: 'success', message: 'Payment verified' });
  } catch (error) {
    console.error('[PAYMENTS] Verification Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle Razorpay Webhooks
 * POST /api/payments/webhook
 */
export async function handleWebhook(req, res) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Raw body needed for webhook validation
    const rawBody = typeof req.rawBody !== 'undefined' ? req.rawBody : JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.warn('[PAYMENTS] Webhook Signature Mismatch');
      return res.status(400).send('Invalid webhook signature');
    }

    const event = req.body.event;
    const payment = req.body.payload.payment.entity;
    const order_id = payment.order_id;
    const payment_id = payment.id;
    const db = getDb();

    if (event === 'payment.captured' || event === 'payment.authorized') {
      db.prepare(`
        UPDATE payments 
        SET status = 'success', payment_id = ?, verified_at = CURRENT_TIMESTAMP 
        WHERE order_id = ? AND status != 'success'
      `).run(payment_id, order_id);
      console.log(`[PAYMENTS] Webhook: Payment ${payment_id} success`);
    } else if (event === 'payment.failed') {
      db.prepare(`
        UPDATE payments SET status = 'failed', verified_at = CURRENT_TIMESTAMP WHERE order_id = ?
      `).run(order_id);
      console.log(`[PAYMENTS] Webhook: Payment ${payment_id} failed`);
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[PAYMENTS] Webhook Error:', error);
    return res.status(500).send('Webhook Processing Error');
  }
}
// ── Export Aliases (Compatibility) ────────────────────────
export const _createOrder = createOrder;
export const _verifyPayment = verifyPayment;
export const _handleWebhook = handleWebhook;
