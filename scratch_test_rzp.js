import Razorpay from 'razorpay';
import 'dotenv/config';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function test() {
  try {
    await razorpay.orders.all({ count: 1 });
    console.log('SUCCESS: Authenticated with Razorpay.');
  } catch (err) {
    console.error('FAILURE:', err);
  }
}

test();
