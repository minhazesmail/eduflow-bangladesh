'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

function normalizeBdPhone(value: string) {
  const raw = value.replace(/\s+/g, '')
  if (/^01\d{9}$/.test(raw)) return `+88${raw}`
  if (/^8801\d{9}$/.test(raw)) return `+${raw}`
  if (/^\+8801\d{9}$/.test(raw)) return raw
  return raw
}

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function sendCode() {
    setLoading(true); setError('')
    const normalized = normalizeBdPhone(phone)
    if (!/^\+8801\d{9}$/.test(normalized)) { setError('Use a Bangladesh number such as +8801712345678.'); setLoading(false); return }
    const { error: e } = await supabase.auth.signInWithOtp({ phone: normalized, options: { shouldCreateUser: true, data: { full_name: name.trim() || 'MealHisab User' } } })
    if (e) setError(e.message); else setSent(true)
    setLoading(false)
  }

  async function verify() {
    setLoading(true); setError('')
    const { error: e } = await supabase.auth.verifyOtp({ phone: normalizeBdPhone(phone), token: code.trim(), type: 'sms' })
    if (e) setError(e.message); else router.push('/dashboard')
    setLoading(false)
  }

  return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
    <div className="w-full max-w-md card">
      <div className="mb-6"><div className="mb-3 text-2xl font-bold">MealHisab BD</div><h1 className="text-xl font-semibold">Your monthly meal ledger</h1><p className="mt-1 text-sm text-slate-500">Sign in with a Bangladesh phone number.</p></div>
      {!sent ? <div className="space-y-4"><label className="block text-sm font-medium">Your name<input className="input mt-1" value={name} onChange={e=>setName(e.target.value)} placeholder="Rahim Ahmed" /></label><label className="block text-sm font-medium">Phone<input className="input mt-1" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+8801712345678" inputMode="tel" /></label><button className="btn-primary w-full" onClick={sendCode} disabled={loading}>{loading ? 'Sending…' : 'Send OTP'}</button></div>
      : <div className="space-y-4"><p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">We sent an OTP to {normalizeBdPhone(phone)}.</p><label className="block text-sm font-medium">Verification code<input className="input mt-1 text-center text-lg tracking-[0.4em]" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} maxLength={6} inputMode="numeric" autoFocus /></label><button className="btn-primary w-full" onClick={verify} disabled={loading || code.length < 4}>{loading ? 'Verifying…' : 'Verify & continue'}</button><button className="btn-secondary w-full" onClick={()=>setSent(false)}>Change number</button></div>}
      {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
    </div>
  </div>
}
