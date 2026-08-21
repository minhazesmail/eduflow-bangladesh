/**
 * SMS action helpers — fee reminders & exam results via send-local-sms Edge Function.
 * Messages are always Bangla (parent-facing).
 */
(function () {
  'use strict';

  const t = (key) => (window.EduFlowI18n ? window.EduFlowI18n.t(key) : key);

  async function invokeSendSms(payload) {
    const cfg = window.eduflowConfig || {};
    const url = cfg.supabaseUrl;
    const key = cfg.supabaseKey;
    if (!url || !key) throw new Error('Supabase config missing');

    const session = await window.supabase?.createClient?.(url, key).auth.getSession?.();
    let accessToken = session?.data?.session?.access_token;
    if (!accessToken && window.EduFlow?._session?.access_token) {
      accessToken = window.EduFlow._session.access_token;
    }
    if (!accessToken) {
      try {
        const raw = localStorage.getItem(
          Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token')) || ''
        );
        if (raw) accessToken = JSON.parse(raw)?.access_token;
      } catch (_) {}
    }
    if (!accessToken) throw new Error('Not signed in');

    const res = await fetch(`${url}/functions/v1/send-local-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: key,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `SMS failed (${res.status})`);
    return data;
  }

  async function sendFeeReminder({ studentId, studentName, phone, amount, month, orgName, organizationId }) {
    if (!phone) {
      window.EduFlow?.toast?.(t('sms.no_phone'), 'error');
      return;
    }
    if (!confirm(t('sms.confirm_fee'))) return;
    window.EduFlow?.toast?.(t('sms.sending'), 'info');
    try {
      await invokeSendSms({
        phone,
        organization_id: organizationId,
        student_id: studentId,
        template: 'fee_reminder',
        template_params: {
          studentName: studentName || 'শিক্ষার্থী',
          amount: amount ?? 0,
          month: month || '',
          orgName: orgName || 'EduFlow',
        },
      });
      window.EduFlow?.toast?.(t('sms.sent'), 'success');
    } catch (e) {
      window.EduFlow?.toast?.(e.message || t('sms.failed'), 'error');
    }
  }

  async function sendExamResult({
    studentId,
    studentName,
    phone,
    examName,
    marks,
    totalMarks,
    orgName,
    organizationId,
  }) {
    if (!phone) {
      window.EduFlow?.toast?.(t('sms.no_phone'), 'error');
      return;
    }
    if (!confirm(t('sms.confirm_result'))) return;
    const percent = totalMarks ? Math.round((Number(marks) / Number(totalMarks)) * 100) : 0;
    window.EduFlow?.toast?.(t('sms.sending'), 'info');
    try {
      await invokeSendSms({
        phone,
        organization_id: organizationId,
        student_id: studentId,
        template: 'exam_result',
        template_params: {
          studentName: studentName || 'শিক্ষার্থী',
          examName: examName || 'পরীক্ষা',
          marks,
          totalMarks,
          percent,
          orgName: orgName || 'EduFlow',
        },
      });
      window.EduFlow?.toast?.(t('sms.sent'), 'success');
    } catch (e) {
      window.EduFlow?.toast?.(e.message || t('sms.failed'), 'error');
    }
  }

  window.EduFlowSms = { sendFeeReminder, sendExamResult, invokeSendSms };
})();
