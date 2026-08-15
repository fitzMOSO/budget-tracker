import { describe, it, expect } from 'vitest'
import { buildDemoData } from '../demo-data'
import { calculateBudgetSummary } from '../index'

describe('buildDemoData', () => {
    const demo = buildDemoData()

    it('populates every collection a page renders from', () => {
        // An empty collection means a blank page in the demo, which is worse
        // than no demo at all.
        expect(demo.accounts?.length).toBeGreaterThan(0)
        expect(demo.categories?.length).toBeGreaterThan(0)
        expect(demo.incomes?.length).toBeGreaterThan(0)
        expect(demo.expenses?.length).toBeGreaterThan(0)
        expect(demo.bills?.length).toBeGreaterThan(0)
        expect(demo.creditCards?.length).toBeGreaterThan(0)
        expect(demo.creditCardStatements?.length).toBeGreaterThan(0)
        expect(demo.savingsGoals?.length).toBeGreaterThan(0)
        expect(demo.savingsContributions?.length).toBeGreaterThan(0)
    })

    it('uses unique ids across every collection', () => {
        const ids = [
            ...(demo.accounts ?? []),
            ...(demo.categories ?? []),
            ...(demo.incomes ?? []),
            ...(demo.expenses ?? []),
            ...(demo.bills ?? []),
            ...(demo.creditCards ?? []),
            ...(demo.creditCardStatements ?? []),
            ...(demo.savingsGoals ?? []),
            ...(demo.savingsContributions ?? []),
        ].map((entity) => entity.id)

        expect(new Set(ids).size).toBe(ids.length)
    })

    it('references only categories and accounts it also defines', () => {
        const categoryIds = new Set((demo.categories ?? []).map((c) => c.id))
        const accountIds = new Set((demo.accounts ?? []).map((a) => a.id))

        for (const income of demo.incomes ?? []) {
            expect(categoryIds).toContain(income.categoryId)
            if (income.accountId) expect(accountIds).toContain(income.accountId)
        }
        for (const expense of demo.expenses ?? []) {
            expect(categoryIds).toContain(expense.categoryId)
            if (expense.accountId) expect(accountIds).toContain(expense.accountId)
        }
        for (const bill of demo.bills ?? []) {
            if (bill.categoryId) expect(categoryIds).toContain(bill.categoryId)
        }
    })

    it('links every bill-linked expense to a bill it also defines', () => {
        // A dangling billId would render as an unpaid bill whose money already
        // left the account.
        const billIds = new Set((demo.bills ?? []).map((b) => b.id))
        for (const expense of demo.expenses ?? []) {
            if (expense.billId) expect(billIds).toContain(expense.billId)
        }
    })

    it('shows at least one paid and one unpaid bill', () => {
        // "Paid" is derived from the link, so the demo needs both shapes present
        // or the bills page renders one empty column.
        const linked = new Set((demo.expenses ?? []).map((e) => e.billId).filter(Boolean))
        const bills = demo.bills ?? []
        expect(bills.some((b) => linked.has(b.id))).toBe(true)
        expect(bills.some((b) => !linked.has(b.id))).toBe(true)
    })

    it('links statements and contributions to their parents', () => {
        const cardIds = new Set((demo.creditCards ?? []).map((c) => c.id))
        const goalIds = new Set((demo.savingsGoals ?? []).map((g) => g.id))

        for (const statement of demo.creditCardStatements ?? []) {
            expect(cardIds).toContain(statement.creditCardId)
        }
        for (const contribution of demo.savingsContributions ?? []) {
            expect(goalIds).toContain(contribution.savingsGoalId)
        }
    })

    it('assigns income categories to incomes and expense categories to expenses', () => {
        const byId = new Map((demo.categories ?? []).map((c) => [c.id, c]))
        for (const income of demo.incomes ?? []) {
            expect(byId.get(income.categoryId)?.type).toBe('income')
        }
        for (const expense of demo.expenses ?? []) {
            expect(byId.get(expense.categoryId)?.type).toBe('expense')
        }
    })

    it('produces a non-zero figure in all three budget buckets', () => {
        // The regression this guards: savingsActual is derived ONLY from
        // savingsContributions. Seeding an expense tagged expenseType:'savings'
        // instead would leave this bucket at zero while the money vanished from
        // every other bucket too, making the demo dashboard look broken.
        const summary = calculateBudgetSummary(
            demo.incomes ?? [],
            demo.expenses ?? [],
            demo.savingsContributions ?? []
        )

        expect(summary.totalIncome).toBeGreaterThan(0)
        expect(summary.essentialsActual).toBeGreaterThan(0)
        expect(summary.nonEssentialsActual).toBeGreaterThan(0)
        expect(summary.savingsActual).toBeGreaterThan(0)
    })

    it('seeds no expense that would fall outside every budget bucket', () => {
        const savingsTagged = (demo.expenses ?? []).filter((e) => e.expenseType === 'savings')
        expect(savingsTagged).toHaveLength(0)
    })

    it('keeps spending below income so the demo shows a healthy budget', () => {
        const summary = calculateBudgetSummary(
            demo.incomes ?? [],
            demo.expenses ?? [],
            demo.savingsContributions ?? []
        )
        expect(summary.remaining).toBeGreaterThan(0)
    })

    it('returns fresh dates on each call, so the demo is never stale', () => {
        const today = new Date().toISOString().slice(0, 10)
        const dates = (demo.expenses ?? []).map((e) => e.date)
        for (const date of dates) {
            expect(date <= today).toBe(true)
        }
        // At least one entry should be within the last week so the current
        // month's dashboard is populated.
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const cutoff = weekAgo.toISOString().slice(0, 10)
        expect(dates.some((d) => d >= cutoff)).toBe(true)
    })
})
