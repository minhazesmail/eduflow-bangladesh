import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-payment-signature',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const env = (name: string) => { const value = Deno.env.get(name); if (!value) throw new Error(`Missing ${name}`); return value; };

async function rateLimit(admin: ReturnType<typeof createClient>, key: string, limit = 60) {
  const { data, error } = await admin.rpc('check_edge_rate_limit', { p_key: `payment-ipn:${key}`, p_limit: limit, p_window_seconds: 60 });
  if (error) throw new Error(error.message);
  return data?.allowed !== false;
}

async function bkashGrant(base: string) {
  const username = env('BKASH_USERNAME');
  const password = env('BKASH_PASSWORD');
  const appKey = env('BKASH_APP_KEY');
  const appSecret = env('BKASH_APP_SECRET');
  const response = await fetch(`${base.replace(/\/$/, '')}/tokenized/checkout/token/grant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', username, password },
    body: JSON.stringify({ app_key: appKey, app_secret: appSecret }),
  });
  const data = await response.json();
  if (!response.ok || !data.id_token) throw new Error(data.errorMessage || data.errorCode || 'bKash token request failed');
  return data.id_token as string;
}

async function bkashVerify(paymentId: string) {
  const base = env('BKASH_BASE_URL');
  const token = await bkashGrant(base);
  const response = await fetch(`${base.replace(/\/$/, '')}/tokenized/checkout/payment/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: token, 'X-App-Key': env('BKASH_APP_KEY') },
    body: JSON.stringify({ paymentID: paymentId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.errorMessage || data.errorCode || 'bKash payment verification failed');
  return data;
}

async function nagadVerify(input: Record<string, unknown>) {
  const url = env('NAGAD_VERIFY_URL');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-KM-Api-Version': Deno.env.get('NAGAD_API_VERSION') || 'v-0.2.0',
    'X-KM-Client-Type': Deno.env.get('NAGAD_CLIENT_TYPE') || 'PC_WEB',
  };
  const key = Deno.env.get('NAGAD_API_KEY');
  if (key) headers.Authorization = `Bearer ${key}`;
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(input) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.reason || 'Nagad payment verification failed');
  return data;
}

function getParam(req: Request, name: string, body: Record<string, unknown> = {}) {
  const url = new URL(req.url);
  return String(url.searchParams.get(name) || body[name] || '').trim();
}

function looksSuccessful(provider: string, data: Record<string, unknown>) {
  const status = String(data.transactionStatus || data.status || data.statusMessage || '').toLowerCase();
  if (provider === 'bkash') return status === 'completed' && String(data.currency || 'BDT') === 'BDT' && Number(data.statusCode || 0) === 0 || status === 'completed' && String(data.currency || 'BDT') === 'BDT';
  return ['success', 'successful', 'completed', 'paid'].includes(status);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const supabaseUrl = env('SUPABASE_URL');
    const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || 'unknown';
    if (!(await rateLimit(admin, ip, 60))) return json({ error: 'Too many requests' }, 429);

    let body: Record<string, unknown> = {};
    if (req.method === 'POST') { try { body = await req.json(); } catch { body = {}; } }
    const provider = getParam(req, 'provider', body).toLowerCase();
    if (!['bkash', 'nagad'].includes(provider)) return json({ error: 'provider must be bkash or nagad' }, 400);

    const paymentId = getParam(req, 'paymentID', body) || getParam(req, 'payment_id', body);
    const invoice = getParam(req, 'merchantInvoiceNumber', body) || getParam(req, 'merchantInvoice', body) || getParam(req, 'merchant_invoice_number', body);
    if (!paymentId && !invoice) return json({ error: 'payment identifier is required' }, 400);

    let transactionQuery = admin.from('payment_transactions').select('*').eq('provider', provider).limit(1);
    if (paymentId) transactionQuery = transactionQuery.eq('provider_payment_id', paymentId);
    else transactionQuery = transactionQuery.eq('merchant_invoice_number', invoice);
    const { data: transaction, error: transactionError } = await transactionQuery.maybeSingle();
    if (transactionError) return json({ error: transactionError.message }, 500);
    if (!transaction) return json({ error: 'Payment intent not found' }, 404);

    let verified: Record<string, unknown>;
    if (provider === 'bkash') {
      verified = await bkashVerify(String(transaction.provider_payment_id || paymentId));
    } else {
      verified = await nagadVerify({ paymentReferenceId: getParam(req, 'paymentRefId', body) || transaction.provider_payment_id || paymentId, orderId: transaction.merchant_invoice_number });
    }

    const providerAmount = Number(verified.amount || verified.totalAmount || verified.orderAmount || 0);
    const providerTx = String(verified.trxID || verified.transactionId || verified.paymentRefId || verified.reference || '').trim();
    const providerStatus = String(verified.transactionStatus || verified.status || verified.statusMessage || 'unknown');
    if (!looksSuccessful(provider, verified)) return json({ ok: false, verified: false, status: providerStatus }, 402);
    if (!(providerAmount > 0) || Math.round(providerAmount * 100) !== Math.round(Number(transaction.amount) * 100)) return json({ error: 'Verified provider amount does not match payment intent' }, 409);
    if (!providerTx) return json({ error: 'Provider did not return a transaction identifier' }, 502);

    const { data: result, error: reconcileError } = await admin.rpc('reconcile_verified_payment', {
      p_transaction_id: transaction.id,
      p_provider: provider,
      p_provider_status: providerStatus,
      p_provider_transaction_id: providerTx,
      p_amount: providerAmount,
      p_raw_response: verified,
    });
    if (reconcileError) return json({ error: reconcileError.message }, 409);

    if (req.method === 'GET') {
      const site = Deno.env.get('SITE_URL') || 'https://eduflow-bangladesh.vercel.app';
      return Response.redirect(`${site.replace(/\/$/, '')}/app.html?payment=verified&transaction=${encodeURIComponent(transaction.id)}`, 303);
    }
    return json({ ok: true, verified: true, result });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Payment reconciliation failed' }, 502);
  }
});
