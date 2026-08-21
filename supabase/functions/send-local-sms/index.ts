/**
 * Local Bangladesh SMS gateway Edge Function.
 * Supports: SSL Wireless (ismsplus / pushapi) and MIM SMS.
 * Falls back guidance when provider is not configured.
 *
 * Secrets (Supabase Edge Function env):
 *   SMS_PROVIDER = sslwireless | mimsms | twilio
 *
 * SSL Wireless:
 *   SSL_SMS_API_URL   (e.g. https://api.sms.sslwireless.com/api/v3/send-sms  OR legacy pushapi URL)
 *   SSL_SMS_API_TOKEN (or SSL_SMS_USER + SSL_SMS_PASS for legacy)
 *   SSL_SMS_SID
 *   SSL_SMS_CSMS_PREFIX (optional, default EF)
 *
 * MIM SMS:
 *   MIM_SMS_API_URL   (default https://api.mimsms.com)
 *   MIM_SMS_USER      (panel email)
 *   MIM_SMS_API_KEY
 *   MIM_SMS_SENDER    (registered Sender ID)
 *
 * Twilio (existing fallback):
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimit } from '../_shared/rate-limit.ts';

const headers: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });

function normalizeBdPhone(raw: string): string {
  let p = String(raw || '').replace(/[\s\-()]/g, '');
  if (p.startsWith('+88')) p = p.slice(3);
  if (p.startsWith('88') && p.length >= 13) p = p.slice(2);
  if (p.startsWith('01') && p.length === 11) return '88' + p;
  if (p.length === 10 && p.startsWith('1')) return '880' + p;
  return p.startsWith('880') ? p : '88' + p;
}

async function sendSslWireless(to: string, body: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const apiUrl = Deno.env.get('SSL_SMS_API_URL') || '';
  const token = Deno.env.get('SSL_SMS_API_TOKEN') || '';
  const user = Deno.env.get('SSL_SMS_USER') || '';
  const pass = Deno.env.get('SSL_SMS_PASS') || '';
  const sid = Deno.env.get('SSL_SMS_SID') || '';
  const csmsPrefix = Deno.env.get('SSL_SMS_CSMS_PREFIX') || 'EF';
  const csmsId = `${csmsPrefix}${Date.now().toString(36)}`.slice(0, 20);
  const msisdn = normalizeBdPhone(to);

  if (token && apiUrl) {
    const r = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        api_token: token,
        sid,
        sms: [{ msisdn, text: body, csms_id: csmsId }],
        msisdn,
        text: body,
        csms_id: csmsId,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok && (data?.status_code === 200 || data?.status === 'SUCCESS' || data?.ok)) {
      return { ok: true, id: data?.smsinfo?.[0]?.reference_id || data?.reference_id || csmsId };
    }
    if (!user || !pass) {
      return { ok: false, error: data?.error_message || data?.message || `SSL Wireless error ${r.status}` };
    }
  }

  const legacyUrl = apiUrl || 'https://sms.sslwireless.com/pushapi/dynamic/server.php';
  if (!user || !pass || !sid) {
    return { ok: false, error: 'SSL Wireless credentials incomplete (need SSL_SMS_USER, SSL_SMS_PASS, SSL_SMS_SID)' };
  }
  const form = new URLSearchParams();
  form.set('user', user);
  form.set('pass', pass);
  form.set('sid', sid);
  form.set('sms[0][0]', msisdn.replace(/^88/, ''));
  form.set('sms[0][1]', body);
  form.set('sms[0][2]', csmsId);

  const r = await fetch(legacyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const text = await r.text();
  const ok = r.ok && (/SUCCESS/i.test(text) || /REFERENCEID/i.test(text) || /status_code.?200/i.test(text));
  if (ok) return { ok: true, id: csmsId };
  return { ok: false, error: text.slice(0, 300) || `SSL Wireless HTTP ${r.status}` };
}

async function sendMimSms(to: string, body: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const base = (Deno.env.get('MIM_SMS_API_URL') || 'https://api.mimsms.com').replace(/\/$/, '');
  const user = Deno.env.get('MIM_SMS_USER') || '';
  const apiKey = Deno.env.get('MIM_SMS_API_KEY') || '';
  const sender = Deno.env.get('MIM_SMS_SENDER') || '';
  if (!user || !apiKey || !sender) {
    return { ok: false, error: 'MIM SMS credentials incomplete (MIM_SMS_USER, MIM_SMS_API_KEY, MIM_SMS_SENDER)' };
  }
  const mobile = normalizeBdPhone(to).replace(/^88/, '0');
  const payload = {
    UserName: user,
    Apikey: apiKey,
    MobileNumber: mobile,
    CampaignId: 'null',
    SenderName: sender,
    TransactionType: 'T',
    Message: body,
  };
  const r = await fetch(`${base}/api/SmsSending/SMS`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const r2 = await fetch(`${base}/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ to: mobile, message: body, senderName: sender, userName: user }),
    });
    const data2 = await r2.json().catch(() => ({}));
    if (r2.ok && (data2?.status === 'success' || data2?.ok || data2?.statusCode === 200)) {
      return { ok: true, id: data2?.messageId || data2?.id || String(Date.now()) };
    }
    return { ok: false, error: data2?.message || data?.message || `MIM SMS error ${r.status}` };
  }
  if (data?.status === 'success' || data?.Status === 'success' || data?.statusCode === 200 || data?.ok) {
    return { ok: true, id: data?.messageId || data?.MessageId || String(Date.now()) };
  }
  return { ok: false, error: data?.message || data?.ErrorMessage || 'MIM SMS rejected message' };
}

async function sendTwilio(to: string, body: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
  const token = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
  const from = Deno.env.get('TWILIO_SMS_FROM') || '';
  if (!sid || !token || !from) return { ok: false, error: 'Twilio is not configured' };
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const form = new URLSearchParams({ To: to.startsWith('+') ? to : `+${normalizeBdPhone(to)}`, From: from, Body: body });
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });
  const data = await r.json().catch(() => ({}));
  if (r.ok) return { ok: true, id: data.sid };
  return { ok: false, error: data?.message || `Twilio error ${r.status}` };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return json({ error: 'Missing authorization token' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !service) return json({ error: 'Server configuration is incomplete' }, 500);

  const db = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: { user } } = await db.auth.getUser(auth.slice(7));
  if (!user) return json({ error: 'Invalid session' }, 401);

  const rateLimited = await enforceRateLimit(req, admin, user.id, {
    scope: 'send-local-sms',
    ipLimit: 40,
    userLimit: 20,
    windowSeconds: 60,
  });
  if (rateLimited) return rateLimited;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const phone = String(body.phone || '').trim();
  const message = String(body.message || body.body || '').trim();
  const template = String(body.template || '').trim();
  const templateParams = body.template_params || {};
  const organizationId = String(body.organization_id || '').trim();
  const studentId = body.student_id ? String(body.student_id) : null;
  const channel = 'sms';

  if (!phone) return json({ error: 'phone is required' }, 400);

  let finalMessage = message;
  if (template === 'fee_reminder') {
    finalMessage =
      `প্রিয় অভিভাবক, ${templateParams.studentName || 'শিক্ষার্থী'} এর ${templateParams.month || 'এই মাসের'} ফি ৳${templateParams.amount || '0'} বাকি আছে। অনুগ্রহ করে দ্রুত পরিশোধ করুন। — ${templateParams.orgName || 'EduFlow'}`;
  } else if (template === 'exam_result') {
    finalMessage =
      `প্রিয় অভিভাবক, ${templateParams.studentName || 'শিক্ষার্থী'} এর ${templateParams.examName || 'পরীক্ষা'} পরীক্ষায় নম্বর: ${templateParams.marks || 0}/${templateParams.totalMarks || 0} (${templateParams.percent || 0}%)। — ${templateParams.orgName || 'EduFlow'}`;
  }

  if (!finalMessage) return json({ error: 'message or template is required' }, 400);
  if (finalMessage.length > 640) return json({ error: 'Message too long (max ~4 SMS segments)' }, 400);

  const { data: profile } = await db.from('profiles').select('role,organization_id').eq('id', user.id).single();
  if (!profile || !['owner', 'admin', 'staff'].includes(profile.role || '')) {
    return json({ error: 'Forbidden' }, 403);
  }
  if (organizationId && profile.organization_id !== organizationId) {
    return json({ error: 'Organization mismatch' }, 403);
  }

  const provider = (Deno.env.get('SMS_PROVIDER') || 'sslwireless').toLowerCase();
  let result: { ok: boolean; id?: string; error?: string };

  if (provider === 'mimsms') {
    result = await sendMimSms(phone, finalMessage);
  } else if (provider === 'twilio') {
    result = await sendTwilio(phone, finalMessage);
  } else {
    result = await sendSslWireless(phone, finalMessage);
    if (!result.ok && Deno.env.get('TWILIO_ACCOUNT_SID')) {
      const fb = await sendTwilio(phone, finalMessage);
      if (fb.ok) result = { ...fb, id: `twilio:${fb.id}` };
    }
  }

  try {
    await admin.from('notifications').insert({
      organization_id: profile.organization_id,
      guardian_id: body.guardian_id || null,
      channel,
      title: template || 'sms',
      body: finalMessage,
      status: result.ok ? 'sent' : 'failed',
      provider_message_id: result.id || null,
      sent_at: result.ok ? new Date().toISOString() : null,
      metadata: {
        student_id: studentId,
        provider,
        template: template || null,
        error: result.error || null,
      },
    });
  } catch (_) {}

  if (!result.ok) return json({ error: result.error || 'Provider delivery failed', provider }, 502);
  return json({ ok: true, provider, provider_message_id: result.id });
});
