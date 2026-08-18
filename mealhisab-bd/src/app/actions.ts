'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const mealSchema = z.object({
  flatId: z.string().uuid(), cycleId: z.string().uuid(), userId: z.string().uuid(), date: z.string(), mealType: z.enum(['lunch','dinner','extra']), count: z.number().int().min(0).max(100),
})
const expenseSchema = z.object({
  flatId: z.string().uuid(), cycleId: z.string().uuid(), amount: z.number().positive(), category: z.enum(['grocery','cook_salary','gas','other']), note: z.string().max(500).optional(),
})
const contributionSchema = z.object({
  flatId: z.string().uuid(), cycleId: z.string().uuid(), userId: z.string().uuid(), amount: z.number().positive(), note: z.string().max(500).optional(),
})

export async function createFlat(input: { name: string; address?: string; monthStartDay: number; mealPolicy: 'opt_in'|'opt_out' }) {
  const data = z.object({ name: z.string().min(2).max(100), address: z.string().max(200).optional(), monthStartDay: z.number().int().min(1).max(28), mealPolicy: z.enum(['opt_in','opt_out']) }).parse(input)
  const supabase = await createClient()
  const { error } = await supabase.rpc('create_flat', { p_name: data.name, p_address: data.address ?? null, p_month_start_day: data.monthStartDay, p_meal_policy: data.mealPolicy })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function joinFlat(inviteCode: string) {
  const code = z.string().trim().min(6).max(16).parse(inviteCode)
  const supabase = await createClient()
  const { error } = await supabase.rpc('join_flat', { p_invite_code: code })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function saveMeal(input: unknown) {
  const data = mealSchema.parse(input)
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')
  const { error } = await supabase.from('meal_logs').upsert({ ...data, created_by: userData.user.id }, { onConflict: 'flat_id,user_id,date,meal_type' })
  if (error) throw new Error(error.message)
  revalidatePath('/meals'); revalidatePath('/dashboard')
}

export async function saveExpense(input: unknown) {
  const data = expenseSchema.parse(input)
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')
  const { error } = await supabase.from('expenses').insert({ ...data, created_by: userData.user.id, note: data.note ?? null })
  if (error) throw new Error(error.message)
  revalidatePath('/expenses'); revalidatePath('/dashboard')
}

export async function saveContribution(input: unknown) {
  const data = contributionSchema.parse(input)
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')
  const { error } = await supabase.from('contributions').insert({ ...data, created_by: userData.user.id, note: data.note ?? null })
  if (error) throw new Error(error.message)
  revalidatePath('/contributions'); revalidatePath('/dashboard')
}

export async function closeCycle(cycleId: string) {
  const id = z.string().uuid().parse(cycleId)
  const supabase = await createClient()
  const { error } = await supabase.rpc('close_cycle', { p_cycle_id: id })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard'); revalidatePath('/reports'); revalidatePath('/meals'); revalidatePath('/expenses'); revalidatePath('/contributions')
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', z.string().uuid().parse(id))
  if (error) throw new Error(error.message)
}
