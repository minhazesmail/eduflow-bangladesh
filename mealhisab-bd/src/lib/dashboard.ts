import { eachDayOfInterval, format, parseISO } from 'date-fns'
import { calculateMealRate, effectiveMealCount, type MealOverride } from '@/domain/accounting'

export type DashboardMember = { id: string; name: string; role: string; meals: number; mealCost: number; contribution: number; openingBalance: number; balance: number }

export function buildDashboardMembers(params: {
  flat: { meal_policy: 'opt_in'|'opt_out' }
  cycle: { start_date: string; end_date: string }
  members: { user_id: string; opening_balance: number; profiles: { full_name: string } | null; active_from: string; active_to: string | null }[]
  logs: { user_id: string; date: string; meal_type: 'lunch'|'dinner'|'extra'; count: number }[]
  contributions: { user_id: string; amount: number }[]
  foodCost: number
}): DashboardMember[] {
  const overrides = new Map<string, MealOverride>(params.logs.map((l) => [`${l.user_id}:${l.date}:${l.meal_type}`, { userId: l.user_id, date: l.date, mealType: l.meal_type, count: l.count }]))
  const rows = params.members.map((member) => {
    let meals = 0
    for (const day of eachDayOfInterval({ start: parseISO(params.cycle.start_date), end: parseISO(params.cycle.end_date) })) {
      const date = format(day, 'yyyy-MM-dd')
      if (date < member.active_from || (member.active_to && date > member.active_to)) continue
      meals += effectiveMealCount(params.flat.meal_policy, member.user_id, date, 'lunch', overrides)
      meals += effectiveMealCount(params.flat.meal_policy, member.user_id, date, 'dinner', overrides)
      meals += effectiveMealCount(params.flat.meal_policy, member.user_id, date, 'extra', overrides)
    }
    const contribution = params.contributions.filter((c) => c.user_id === member.user_id).reduce((sum, c) => sum + Number(c.amount), 0)
    return { id: member.user_id, name: member.profiles?.full_name ?? 'Member', role: '', meals, mealCost: 0, contribution, openingBalance: Number(member.opening_balance), balance: 0 }
  })
  const totalMeals = rows.reduce((sum, r) => sum + r.meals, 0)
  const rate = calculateMealRate(params.foodCost, totalMeals)
  return rows.map((r) => ({ ...r, mealCost: r.meals * rate, balance: r.openingBalance + r.contribution - r.meals * rate }))
}
