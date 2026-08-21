import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buildDashboardMembers, type DashboardMember } from '@/lib/dashboard'

type CycleMemberRow = { user_id: string; opening_balance: number; profiles: { full_name: string } | null; active_from: string; active_to: string | null }
type MealRow = { user_id: string; date: string; meal_type: 'lunch'|'dinner'|'extra'; count: number }
type ContributionRow = { user_id: string; amount: number }
type ExpenseRow = { amount: number; category: 'grocery'|'cook_salary'|'gas'|'other' }
const money = (n:number) => `৳${n.toFixed(2)}`

export default async function DashboardPage() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if(!user) redirect('/login')
  const { data: membership } = await supabase.from('flat_members').select('flat_id, role').eq('user_id',user.id).eq('status','active').maybeSingle(); if(!membership) redirect('/onboarding')
  const { data: flat } = await supabase.from('flats').select('*').eq('id',membership.flat_id).single()
  const { data: cycle } = await supabase.from('cycles').select('*').eq('flat_id',membership.flat_id).eq('status','open').order('start_date',{ascending:false}).limit(1).single(); if(!cycle) return <div className="card">No open cycle.</div>
  const [{data:members},{data:logs},{data:expenses},{data:contributions}] = await Promise.all([
    supabase.from('cycle_members').select('user_id,opening_balance,active_from,active_to,profiles(full_name)').eq('cycle_id',cycle.id),
    supabase.from('meal_logs').select('user_id,date,meal_type,count').eq('cycle_id',cycle.id),
    supabase.from('expenses').select('amount,category').eq('cycle_id',cycle.id),
    supabase.from('contributions').select('user_id,amount').eq('cycle_id',cycle.id),
  ])
  const typedMembers = (members ?? []) as unknown as CycleMemberRow[]
  const typedLogs = (logs ?? []) as unknown as MealRow[]
  const typedExpenses = (expenses ?? []) as unknown as ExpenseRow[]
  const typedContributions = (contributions ?? []) as unknown as ContributionRow[]
  const foodCost=typedExpenses.filter(e=>e.category==='grocery').reduce((s,e)=>s+Number(e.amount),0)
  const totalShared=typedExpenses.reduce((s,e)=>s+Number(e.amount),0)
  const rows: DashboardMember[] = buildDashboardMembers({flat: {meal_policy: flat.meal_policy},cycle:{start_date:cycle.start_date,end_date:cycle.end_date},members:typedMembers,logs:typedLogs,contributions:typedContributions,foodCost})
  const totalMeals=rows.reduce((s,r)=>s+r.meals,0); const rate=totalMeals?foodCost/totalMeals:0
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm text-slate-500">{cycle.start_date} → {cycle.end_date}</p><h1 className="text-2xl font-bold">{flat.name}</h1></div><div className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">Invite code: <strong>{flat.invite_code}</strong></div></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="card"><p className="text-sm text-slate-500">Total meals</p><p className="mt-1 text-2xl font-bold">{totalMeals}</p></div><div className="card"><p className="text-sm text-slate-500">Food cost</p><p className="mt-1 text-2xl font-bold">{money(foodCost)}</p></div><div className="card"><p className="text-sm text-slate-500">Cost / meal</p><p className="mt-1 text-2xl font-bold">{money(rate)}</p></div><div className="card"><p className="text-sm text-slate-500">All shared expenses</p><p className="mt-1 text-2xl font-bold">{money(totalShared)}</p></div></div>
    <section className="card overflow-x-auto"><div className="mb-4"><h2 className="font-semibold">Member balances</h2><p className="text-sm text-slate-500">Positive = credit, negative = amount due.</p></div><table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="py-3">Member</th><th>Meals</th><th>Meal cost</th><th>Contributed</th><th>Balance</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-b last:border-0"><td className="py-3 font-medium">{r.name}</td><td>{r.meals}</td><td>{money(r.mealCost)}</td><td>{money(r.contribution)}</td><td className={r.balance<0?'font-semibold text-red-600':'font-semibold text-green-700'}>{money(r.balance)}</td></tr>)}</tbody></table></section>
    <section className="card"><h2 className="font-semibold">Meal policy</h2><p className="mt-2 text-sm text-slate-600">{flat.meal_policy==='opt_out'?'Lunch and dinner count automatically unless a member records a skip.':'Lunch and dinner count only when a member records that they ate.'} Extra meals are always explicit.</p></section>
  </div>
}
