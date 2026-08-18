import { describe, expect, it } from 'vitest'
import { calculateMealRate, calculateMemberMeals, calculateSettlements, effectiveMealCount } from '../src/domain/accounting'

describe('MealHisab accounting',()=>{
 it('uses implicit opt-out lunch/dinner meals',()=>{
   const overrides=new Map()
   expect(effectiveMealCount('opt_out','u1','2026-08-19','lunch',overrides)).toBe(1)
   expect(effectiveMealCount('opt_out','u1','2026-08-19','lunch',new Map([['u1:2026-08-19:lunch',{userId:'u1',date:'2026-08-19',mealType:'lunch',count:0}]]))).toBe(0)
 })
 it('uses zero for missing opt-in meals',()=>{ expect(effectiveMealCount('opt_in','u1','2026-08-19','dinner',new Map())).toBe(0) })
 it('protects zero meal rate',()=>{ expect(calculateMealRate(1000,0)).toBe(0) })
 it('calculates member cost and carry-forward balance',()=>{
   const result=calculateSettlements([{userId:'u1',mealCount:80,contribution:5000,openingBalance:500}],20000,1000)[0]
   expect(result.mealCost).toBe(1600); expect(result.closingBalance).toBe(3900)
 })
 it('attributes extra meals to the host member',()=>{
   const member={userId:'u1',joinedDate:'2026-08-01'}
   const logs=new Map([['u1:2026-08-19:extra',{userId:'u1',date:'2026-08-19',mealType:'extra',count:2}]])
   expect(calculateMemberMeals('opt_in',member,'2026-08-19','2026-08-19',logs)).toBe(2)
 })
})
