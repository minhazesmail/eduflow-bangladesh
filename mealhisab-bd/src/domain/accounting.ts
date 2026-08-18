import { eachDayOfInterval, isAfter, isBefore, parseISO } from 'date-fns'

export type MealPolicy = 'opt_out' | 'opt_in'
export type MealType = 'lunch' | 'dinner' | 'extra'

export interface MealOverride {
  userId: string
  date: string
  mealType: MealType
  count: number
}

export interface CycleMember {
  userId: string
  joinedDate: string
  leftDate?: string | null
}

export interface MemberSettlementInput {
  userId: string
  mealCount: number
  contribution: number
  openingBalance: number
}

export interface MemberSettlement {
  userId: string
  mealCount: number
  mealCost: number
  contribution: number
  openingBalance: number
  closingBalance: number
}

export function effectiveMealCount(
  policy: MealPolicy,
  memberId: string,
  date: string,
  mealType: MealType,
  overrides: Map<string, MealOverride>,
): number {
  const key = `${memberId}:${date}:${mealType}`
  const override = overrides.get(key)
  if (mealType === 'extra') return override?.count ?? 0
  if (policy === 'opt_out') return override ? override.count : 1
  return override?.count ?? 0
}

export function isMemberPresentOnDate(member: CycleMember, date: string): boolean {
  const d = parseISO(date)
  const joined = parseISO(member.joinedDate)
  if (isBefore(d, joined)) return false
  if (member.leftDate && isAfter(d, parseISO(member.leftDate))) return false
  return true
}

export function calculateMemberMeals(
  policy: MealPolicy,
  member: CycleMember,
  startDate: string,
  endDate: string,
  overrides: Map<string, MealOverride>,
): number {
  let total = 0
  for (const day of eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })) {
    const date = day.toISOString().slice(0, 10)
    if (!isMemberPresentOnDate(member, date)) continue
    total += effectiveMealCount(policy, member.userId, date, 'lunch', overrides)
    total += effectiveMealCount(policy, member.userId, date, 'dinner', overrides)
    total += effectiveMealCount(policy, member.userId, date, 'extra', overrides)
  }
  return total
}

export function calculateMealRate(foodCost: number, totalMeals: number): number {
  if (totalMeals <= 0) return 0
  return foodCost / totalMeals
}

export function calculateSettlements(
  inputs: MemberSettlementInput[],
  foodCost: number,
  totalMeals: number,
): MemberSettlement[] {
  const rate = calculateMealRate(foodCost, totalMeals)
  return inputs.map((input) => {
    const mealCost = input.mealCount * rate
    const closingBalance = input.openingBalance + input.contribution - mealCost
    return { ...input, mealCost, closingBalance }
  })
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
