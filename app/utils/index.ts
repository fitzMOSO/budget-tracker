import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import type { AppSettings, BudgetSummary, Income, Expense, SavingsContribution, Bill, CreditCardStatement } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, settings?: AppSettings): string {
  const symbol = settings?.currencySymbol || '₱';
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: string | Date, formatStr: string = 'MMM d, yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

export function getMonthYear(date: Date = new Date()): { month: number; year: number } {
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1];
}

export function filterByMonth<T extends { date?: string; dueDate?: string }>(
  items: T[],
  month: number,
  year: number
): T[] {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));

  return items.filter((item) => {
    const dateStr = item.date || item.dueDate;
    if (!dateStr) return false;
    const date = parseISO(dateStr);
    return isWithinInterval(date, { start, end });
  });
}

export function calculateBudgetSummary(
  incomes: Income[],
  expenses: Expense[],
  savingsContributions: SavingsContribution[],
  essentialsPercentage: number = 50,
  nonEssentialsPercentage: number = 30,
  savingsPercentage: number = 20
): BudgetSummary {
  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

  const essentialsBudget = (totalIncome * essentialsPercentage) / 100;
  const nonEssentialsBudget = (totalIncome * nonEssentialsPercentage) / 100;
  const savingsBudget = (totalIncome * savingsPercentage) / 100;

  const essentialsActual = expenses
    .filter((e) => e.expenseType === 'essential')
    .reduce((sum, e) => sum + e.amount, 0);

  const nonEssentialsActual = expenses
    .filter((e) => e.expenseType === 'non-essential')
    .reduce((sum, e) => sum + e.amount, 0);

  const savingsActual = savingsContributions.reduce((sum, s) => sum + s.amount, 0);

  const totalExpenses = essentialsActual + nonEssentialsActual + savingsActual;
  const remaining = totalIncome - totalExpenses;

  return {
    totalIncome,
    essentialsBudget,
    essentialsActual,
    nonEssentialsBudget,
    nonEssentialsActual,
    savingsBudget,
    savingsActual,
    totalExpenses,
    remaining,
  };
}

export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'partial':
      return 'bg-yellow-100 text-yellow-800';
    case 'pending':
      return 'bg-blue-100 text-blue-800';
    case 'overdue':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getExpenseTypeColor(type: string): string {
  switch (type) {
    case 'essential':
      return 'bg-rose-500';
    case 'non-essential':
      return 'bg-amber-500';
    case 'savings':
      return 'bg-emerald-500';
    default:
      return 'bg-gray-500';
  }
}

export function getExpenseTypeBgColor(type: string): string {
  switch (type) {
    case 'essential':
      return 'bg-rose-50 border-rose-200';
    case 'non-essential':
      return 'bg-amber-50 border-amber-200';
    case 'savings':
      return 'bg-emerald-50 border-emerald-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function isOverdue(dueDate: string, isPaid: boolean): boolean {
  if (isPaid) return false;
  return parseISO(dueDate) < new Date();
}

export function calculateCreditCardBalance(statement: CreditCardStatement): number {
  return statement.statementBalance - statement.amountPaid;
}

/**
 * The one definition of "this is a payment amount", shared by every screen that
 * records one. The credit-card page and the dashboard summary each carried their
 * own near-miss version; duplicated guards drifting apart is the bug class the
 * derived-balance refactor exists to remove.
 *
 * `Number.isFinite` is load-bearing, not defensive noise: callers pass
 * `parseFloat(<text input>)`, an empty field yields `NaN`, and `NaN <= 0` is
 * false — so a bare `amount <= 0` check lets NaN through into `amountPaid`,
 * where it becomes a NaN debit on the paying account's derived balance.
 */
export function isValidPayment(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

/** The single wording for a rejected payment amount, so both screens agree. */
export const INVALID_PAYMENT_MESSAGE = 'Enter a payment amount greater than zero.';

/**
 * `isPaid` is passed in because a bill no longer stores it — it is derived from
 * whether a linked expense exists (see `utils/balances.ts#isPaidBill`).
 */
export function groupBillsByStatus(
  bills: Bill[],
  isPaid: (billId: string) => boolean
): {
  paid: Bill[];
  pending: Bill[];
  overdue: Bill[];
} {
  const today = new Date();
  return {
    paid: bills.filter((b) => isPaid(b.id)),
    pending: bills.filter((b) => !isPaid(b.id) && parseISO(b.dueDate) >= today),
    overdue: bills.filter((b) => !isPaid(b.id) && parseISO(b.dueDate) < today),
  };
}

export function getProgressPercentage(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}
