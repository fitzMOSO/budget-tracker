import { describe, it, expect } from 'vitest'
import { calculateBudgetSummary } from '../index'
import type { Expense, Income, SavingsContribution } from '../../types'

let seq = 0
const nextId = () => `test-${++seq}`

const income = (amount: number): Income => ({
  id: nextId(),
  description: 'test income',
  amount,
  date: '2026-08-01',
  categoryId: 'cat-income',
})

const expense = (amount: number, expenseType: Expense['expenseType']): Expense => ({
  id: nextId(),
  description: 'test expense',
  amount,
  date: '2026-08-01',
  categoryId: 'cat-expense',
  expenseType,
})

const contribution = (amount: number): SavingsContribution => ({
  id: nextId(),
  savingsGoalId: 'goal-1',
  amount,
  date: '2026-08-01',
})

describe('calculateBudgetSummary', () => {
  it('splits total income by the 50/30/20 rule', () => {
    const s = calculateBudgetSummary([income(10000)], [], [])
    expect(s.totalIncome).toBe(10000)
    expect(s.essentialsBudget).toBe(5000)
    expect(s.nonEssentialsBudget).toBe(3000)
    expect(s.savingsBudget).toBe(2000)
  })

  it('honours custom allocation percentages', () => {
    const s = calculateBudgetSummary([income(10000)], [], [], 60, 25, 15)
    expect(s.essentialsBudget).toBe(6000)
    expect(s.nonEssentialsBudget).toBe(2500)
    expect(s.savingsBudget).toBe(1500)
  })

  it('sums multiple income sources', () => {
    const s = calculateBudgetSummary([income(62000), income(12500)], [], [])
    expect(s.totalIncome).toBe(74500)
  })

  it('sums actuals per expense type', () => {
    const s = calculateBudgetSummary(
      [income(10000)],
      [
        expense(1200, 'essential'),
        expense(300, 'essential'),
        expense(800, 'non-essential'),
      ],
      [contribution(500)]
    )
    expect(s.essentialsActual).toBe(1500)
    expect(s.nonEssentialsActual).toBe(800)
    expect(s.savingsActual).toBe(500)
    expect(s.totalExpenses).toBe(2800)
    expect(s.remaining).toBe(7200)
  })

  // Documents current behaviour, which is arguably surprising: savingsActual is
  // sourced from savingsContributions only. An Expense tagged
  // expenseType: 'savings' is counted in NO bucket, so it affects neither
  // totalExpenses nor remaining.
  it('ignores expenses tagged as savings when computing totals', () => {
    const s = calculateBudgetSummary([income(10000)], [expense(2000, 'savings')], [])
    expect(s.savingsActual).toBe(0)
    expect(s.totalExpenses).toBe(0)
    expect(s.remaining).toBe(10000)
  })

  it('returns zeroes rather than NaN for empty input', () => {
    const s = calculateBudgetSummary([], [], [])
    expect(s.totalIncome).toBe(0)
    expect(s.essentialsBudget).toBe(0)
    expect(s.remaining).toBe(0)
    expect(Number.isNaN(s.remaining)).toBe(false)
  })

  it('reports a negative remaining when spending exceeds income', () => {
    const s = calculateBudgetSummary([income(1000)], [expense(1500, 'essential')], [])
    expect(s.remaining).toBe(-500)
  })

  // Monetary values are stored as floats. This documents the resulting
  // imprecision; converting to integer cents is a recorded follow-up.
  it('accumulates fractional amounts to within a cent', () => {
    const s = calculateBudgetSummary(
      [],
      [expense(0.1, 'essential'), expense(0.2, 'essential')],
      []
    )
    expect(s.essentialsActual).toBeCloseTo(0.3, 2)
    expect(s.essentialsActual).not.toBe(0.3)
  })
})
