/*
  api/index.js — Vercel Thin Proxy
  Forwards every /api/* request to the Sovereign Brain (Mac Mini via Cloudflare tunnel).
  No secrets, no logic, no database — all of that lives on the local server.
*/

async function getTunnelUrl() {
  try {
    const { BRAIN_ENDPOINT } = await import('./brain_config.js');
    if (BRAIN_ENDPOINT) return BRAIN_ENDPOINT;
  } catch (_e) {}
  return process.env.BRAIN_URL || null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const tunnelUrl = await getTunnelUrl();
  if (!tunnelUrl) {
    return res.status(503).json({ error: 'backend_offline', message: 'Sovereign brain tunnel not configured.' });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const target = `${tunnelUrl}${url.pathname}${url.search}`;

  const forwardHeaders = {
    'content-type': req.headers['content-type'] || 'application/json',
    'user-agent': req.headers['user-agent'] || '',
    'x-forwarded-for': req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip'] || '',
    'cf-connecting-ip': req.headers['cf-connecting-ip'] || '',
    'cf-ray': req.headers['cf-ray'] || '',
    'cf-ipcountry': req.headers['cf-ipcountry'] || '',
  };
  if (req.headers['authorization']) {
    forwardHeaders['authorization'] = req.headers['authorization'];
  }

  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  try {
    const upstream = await fetch(target, { method: req.method, headers: forwardHeaders, body });

    // SSE streaming (e.g. /api/zayvora/execute)
    const contentType = upstream.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      const reader = upstream.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(dec.decode(value, { stream: true }));
      }
      return res.end();
    }

    const text = await upstream.text();
    res.setHeader('Content-Type', contentType || 'application/json');
    return res.status(upstream.status).send(text);

  } catch (err) {
    console.error('[PROXY] Brain tunnel unreachable:', err.message);
    return res.status(503).json({ error: 'backend_offline', message: 'Sovereign brain tunnel unreachable.' });
  }
}
