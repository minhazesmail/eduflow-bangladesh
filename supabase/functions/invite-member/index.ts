import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Missing authorization token' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const siteUrl = Deno.env.get('SITE_URL') || 'https://eduflow-bangladesh.vercel.app';
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Server configuration is incomplete' }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const token = authHeader.slice('Bearer '.length);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: 'Invalid session' }, 401);

  const { data: actor, error: actorError } = await admin
    .from('profiles')
    .select('id,organization_id,role,full_name')
    .eq('id', userData.user.id)
    .single();
  if (actorError || !actor || actor.role !== 'owner') return json({ error: 'Only the organization owner can invite members' }, 403);

  let payload: { email?: string; full_name?: string; role?: string };
  try { payload = await req.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

  const email = String(payload.email || '').trim().toLowerCase();
  const fullName = String(payload.full_name || '').trim() || email.split('@')[0];
  const role = String(payload.role || '').trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'A valid email address is required' }, 400);
  if (!['admin', 'teacher', 'staff'].includes(role)) return json({ error: 'Invalid role' }, 400);

  const { data: existing } = await admin
    .from('organization_invitations')
    .select('id,status')
    .eq('organization_id', actor.organization_id)
    .eq('email', email)
    .in('status', ['pending', 'sent'])
    .maybeSingle();
  if (existing) return json({ error: 'An active invitation already exists for this email' }, 409);

  const { data: invitation, error: invitationError } = await admin
    .from('organization_invitations')
    .insert({ organization_id: actor.organization_id, email, full_name: fullName, role, invited_by: actor.id, status: 'pending' })
    .select('id')
    .single();
  if (invitationError || !invitation) return json({ error: invitationError?.message || 'Could not create invitation' }, 500);

  const redirectTo = `${siteUrl.replace(/\/$/, '')}/app.html?invite=${encodeURIComponent(invitation.id)}`;
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { invitation_id: invitation.id, full_name: fullName, organization_id: actor.organization_id, role },
  });

  if (inviteError) {
    await admin.from('organization_invitations').update({ status: 'cancelled' }).eq('id', invitation.id);
    return json({ error: inviteError.message }, 502);
  }

  await admin.from('organization_invitations').update({ status: 'sent' }).eq('id', invitation.id);
  return json({ ok: true, invitation_id: invitation.id });
});
