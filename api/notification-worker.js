import crypto from 'node:crypto';

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function isAuthorized(req, secret) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return false;
  return safeEqual(header.slice(7).trim(), secret);
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[notification-worker] CRON_SECRET is not configured');
    return res.status(500).json({ error: 'Notification worker is not configured' });
  }

  if (!isAuthorized(req, cronSecret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const base = process.env.SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !service) {
    return res.status(500).json({ error: 'Notification worker is not configured' });
  }

  const r = await fetch(`${base}/functions/v1/process-notification-queue`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${service}`,
      'Content-Type': 'application/json'
    },
    body: '{}'
  });

  const text = await r.text();
  return res.status(r.status).send(text);
}
