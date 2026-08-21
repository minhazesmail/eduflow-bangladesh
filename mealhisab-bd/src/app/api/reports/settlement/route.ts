import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const cycleId = request.nextUrl.searchParams.get('cycleId')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!cycleId) return NextResponse.json({ error: 'cycleId is required' }, { status: 400 })
  const { data: membership } = await supabase.from('flat_members').select('flat_id').eq('user_id', user.id).eq('status','active').maybeSingle()
  if (!membership) return NextResponse.json({ error: 'No active flat' }, { status: 403 })
  const { data: cycle } = await supabase.from('cycles').select('id,flat_id,start_date,end_date,status').eq('id', cycleId).eq('flat_id', membership.flat_id).single()
  if (!cycle) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
  const { data: settlements } = await supabase.from('settlements').select('total_meals,meal_cost,total_contribution,balance,opening_balance,user_id').eq('cycle_id', cycle.id)
  const summary = (settlements ?? []).map(s => ({ ...s, is_self: s.user_id === user.id }))
  const body = [`MealHisab BD`, `${cycle.start_date} → ${cycle.end_date}`, '', ...summary.map(s => `${s.is_self?'You':'Member'}: ${s.total_meals} meals | meal cost ৳${Number(s.meal_cost).toFixed(2)} | contribution ৳${Number(s.total_contribution).toFixed(2)} | balance ৳${Number(s.balance).toFixed(2)}`)].join('\n')
  return NextResponse.json({ cycle, settlements: summary, whatsappUrl: `https://wa.me/?text=${encodeURIComponent(body)}` })
}
