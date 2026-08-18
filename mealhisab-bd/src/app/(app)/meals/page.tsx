import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import MealTracker from '@/components/meal-tracker'

export default async function MealsPage(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect('/login')
 const {data:membership}=await supabase.from('flat_members').select('flat_id').eq('user_id',user.id).eq('status','active').maybeSingle(); if(!membership) redirect('/onboarding')
 const {data:flat}=await supabase.from('flats').select('meal_policy,name').eq('id',membership.flat_id).single();
 const {data:cycle}=await supabase.from('cycles').select('id,start_date,end_date').eq('flat_id',membership.flat_id).eq('status','open').order('start_date',{ascending:false}).limit(1).single()
 const today=format(new Date(),'yyyy-MM-dd')
 const {data:logs}=cycle ? await supabase.from('meal_logs').select('meal_type,count').eq('cycle_id',cycle.id).eq('user_id',user.id).eq('date',today) : {data:[] as never[]}
 const initial: Record<string,number>={}; for(const log of logs??[]) initial[log.meal_type]=log.count
 if(!cycle) return <div className="card">No open cycle.</div>
 return <div className="space-y-6"><div><p className="text-sm text-slate-500">{today}</p><h1 className="text-2xl font-bold">Today&apos;s meals</h1><p className="mt-1 text-sm text-slate-500">{flat.meal_policy==='opt_out'?'Meals start counted; tap Skip when you will not eat.':'Tap I ate when you consume a meal.'}</p></div><MealTracker flatId={membership.flat_id} cycleId={cycle.id} userId={user.id} date={today} policy={flat.meal_policy} initial={initial}/></div>
}
