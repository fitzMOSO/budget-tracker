// Core Types for Budget Tracker Application

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon?: string;
  isDefault?: boolean;
  isBill?: boolean; // If true, expenses with this category will also create bills
}

// Account for tracking where money comes from/goes to
export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'e-wallet' | 'other';
  /** Seed value; the live balance is derived, never stored. */
  openingBalance: number;
  color?: string;
  isDefault?: boolean;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
}

export interface Income {
  id: string;
  description: string;
  amount: number;
  expectedAmount?: number;
  date: string; // ISO date string
  categoryId: string;
  accountId?: string; // Which account the income was deposited to
  isRecurring?: boolean;
  notes?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  budgetAmount?: number;
  date: string;
  categoryId: string;
  accountId?: string; // Which account the expense was deducted from
  expenseType: ExpenseType;
  notes?: string;
  billId?: string; // Set when this expense represents a paid bill (migration backfill or bill payment)
}

export type ExpenseType = 'essential' | 'non-essential' | 'savings';

/**
 * A bill is a scheduled obligation, never a movement of money. Whether it is
 * paid, when it was paid and which account paid it are all DERIVED from the
 * linked expense (`Expense.billId`) — see `utils/balances.ts#isPaidBill`.
 * Storing them here as well would be a second source of truth for one fact.
 */
export interface Bill {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  isRecurring?: boolean;
  recurringSourceId?: string; // ID of the original recurring bill this was generated from
  categoryId?: string;
  notes?: string;
}

export interface CreditCard {
  id: string;
  bank: string;
  cardType: string;
  cardName?: string;
  creditLimit?: number;
  currentAvailableLimit?: number;
  color?: string;
}

export interface CreditCardStatement {
  id: string;
  creditCardId: string;
  statementBalance: number;
  amountPaid: number;
  dueDate: string;
  status: PaymentStatus;
  paidDate?: string;
  paidFromAccountId?: string; // Which account the payment was made from
  notes?: string;
}

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export interface MonthlyBudget {
  id: string;
  month: number; // 1-12
  year: number;
  totalIncome: number;
  essentialsPercentage: number; // Default 50%
  nonEssentialsPercentage: number; // Default 30%
  savingsPercentage: number; // Default 20%
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  color?: string;
  linkedAccountId?: string;
}

export interface SavingsContribution {
  id: string;
  savingsGoalId: string;
  amount: number;
  date: string;
  fromAccountId?: string; // Which account the contribution was made from
  notes?: string;
}

// Budget Summary Types
export interface BudgetSummary {
  totalIncome: number;
  essentialsBudget: number;
  essentialsActual: number;
  nonEssentialsBudget: number;
  nonEssentialsActual: number;
  savingsBudget: number;
  savingsActual: number;
  totalExpenses: number;
  remaining: number;
}

export interface MonthlyData {
  incomes: Income[];
  expenses: Expense[];
  bills: Bill[];
  creditCardStatements: CreditCardStatement[];
  savingsContributions: SavingsContribution[];
}

// App State
export interface AppState {
  categories: Category[];
  accounts: Account[];
  incomes: Income[];
  expenses: Expense[];
  bills: Bill[];
  creditCards: CreditCard[];
  creditCardStatements: CreditCardStatement[];
  savingsGoals: SavingsGoal[];
  savingsContributions: SavingsContribution[];
  monthlyBudgets: MonthlyBudget[];
  transfers: Transfer[];
  schemaVersion: number;
  settings: AppSettings;
}

export interface AppSettings {
  currency: string;
  currencySymbol: string;
  defaultEssentialsPercentage: number;
  defaultNonEssentialsPercentage: number;
  defaultSavingsPercentage: number;
  theme: 'light' | 'dark' | 'system';
}

// Default Categories
export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Salary', type: 'income', color: '#22c55e', isDefault: true },
  { name: 'Business', type: 'income', color: '#3b82f6', isDefault: true },
  { name: 'Freelance', type: 'income', color: '#8b5cf6', isDefault: true },
  { name: 'Investments', type: 'income', color: '#f59e0b', isDefault: true },
  { name: 'Other Income', type: 'income', color: '#6b7280', isDefault: true },
];

export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'id'>[] = [
  // Essentials
  { name: 'Rent', type: 'expense', color: '#ef4444', isDefault: true },
  { name: 'Utilities', type: 'expense', color: '#f97316', isDefault: true },
  { name: 'Groceries', type: 'expense', color: '#84cc16', isDefault: true },
  { name: 'Transportation', type: 'expense', color: '#06b6d4', isDefault: true },
  { name: 'Insurance', type: 'expense', color: '#8b5cf6', isDefault: true },
  { name: 'Healthcare', type: 'expense', color: '#ec4899', isDefault: true },
  // Non-Essentials
  { name: 'Shopping', type: 'expense', color: '#f43f5e', isDefault: true },
  { name: 'Entertainment', type: 'expense', color: '#a855f7', isDefault: true },
  { name: 'Dining Out', type: 'expense', color: '#fb923c', isDefault: true },
  { name: 'Subscriptions', type: 'expense', color: '#38bdf8', isDefault: true },
  { name: 'Travel', type: 'expense', color: '#4ade80', isDefault: true },
  // Bills
  { name: 'Phone', type: 'expense', color: '#2dd4bf', isDefault: true },
  { name: 'Internet', type: 'expense', color: '#818cf8', isDefault: true },
  { name: 'Electricity', type: 'expense', color: '#fbbf24', isDefault: true },
  { name: 'Water', type: 'expense', color: '#60a5fa', isDefault: true },
  { name: 'Credit Card', type: 'expense', color: '#f472b6', isDefault: true },
  // Other
  { name: 'Other', type: 'expense', color: '#9ca3af', isDefault: true },
];

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'PHP',
  currencySymbol: '₱',
  defaultEssentialsPercentage: 50,
  defaultNonEssentialsPercentage: 30,
  defaultSavingsPercentage: 20,
  theme: 'light',
};

// Default Accounts
export const DEFAULT_ACCOUNTS: Omit<Account, 'id'>[] = [
  { name: 'Cash', type: 'cash', openingBalance: 0, color: '#22c55e', isDefault: true },
  { name: 'Bank Account', type: 'bank', openingBalance: 0, color: '#3b82f6', isDefault: true },
  { name: 'GCash', type: 'e-wallet', openingBalance: 0, color: '#0070f3', isDefault: true },
  { name: 'Maya', type: 'e-wallet', openingBalance: 0, color: '#00b894', isDefault: true },
];
