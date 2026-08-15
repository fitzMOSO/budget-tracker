// app/utils/__tests__/payment.test.ts
//
// The credit-card page and the dashboard's CreditCardSummary each grew their
// own guard for "is this a payment amount": `!Number.isFinite(x) || x <= 0` in
// one, `!x || x <= 0` in the other, with different error copy. They agreed by
// luck rather than by construction, and two guards drifting apart is the exact
// bug class this refactor exists to kill. One predicate, tested here directly.
import { describe, it, expect } from 'vitest'
import { isValidPayment } from '../index'

describe('isValidPayment', () => {
    it('accepts positive amounts', () => {
        expect(isValidPayment(0.01)).toBe(true)
        expect(isValidPayment(1)).toBe(true)
        expect(isValidPayment(1500.75)).toBe(true)
        expect(isValidPayment(Number.MAX_SAFE_INTEGER)).toBe(true)
    })

    it('rejects zero and negatives', () => {
        // A negative "payment" would CREDIT the paying account: the statement's
        // amountPaid goes down, so the derived debit does too.
        expect(isValidPayment(0)).toBe(false)
        expect(isValidPayment(-0)).toBe(false)
        expect(isValidPayment(-1)).toBe(false)
        expect(isValidPayment(-0.01)).toBe(false)
    })

    it('rejects what parseFloat produces from junk input', () => {
        // The only real caller is `parseFloat(<text input>)`, and an empty or
        // non-numeric field yields NaN. `NaN <= 0` is false, so a bare
        // `x <= 0` check would let NaN straight through and poison amountPaid.
        expect(isValidPayment(NaN)).toBe(false)
        expect(isValidPayment(parseFloat(''))).toBe(false)
        expect(isValidPayment(parseFloat('abc'))).toBe(false)
    })

    it('rejects infinities', () => {
        expect(isValidPayment(Infinity)).toBe(false)
        expect(isValidPayment(-Infinity)).toBe(false)
    })
})
