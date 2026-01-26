import { useState, useEffect, useCallback } from 'react';
import type {
  Category,
  Income,
  Expense,
  Bill,
  CreditCard,
  CreditCardStatement,
  SavingsGoal,
  SavingsContribution,
  AppSettings,
} from '../types';

// Generic fetch hook
function useFetch<T>(url: string, dependencies: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, ...dependencies]);

  return { data, isLoading, error, refetch: fetchData };
}

// Categories
export function useCategories() {
  const { data, isLoading, error, refetch } = useFetch<Category[]>('/api/categories');
  return { categories: data || [], isLoading, error, refetch };
}

export async function createCategory(category: Omit<Category, 'id'>) {
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category),
  });
  if (!response.ok) throw new Error('Failed to create category');
  return response.json();
}

export async function updateCategory(id: string, category: Partial<Category>) {
  const response = await fetch(`/api/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category),
  });
  if (!response.ok) throw new Error('Failed to update category');
  return response.json();
}

export async function deleteCategory(id: string) {
  const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete category');
  return response.json();
}

// Incomes
export function useIncomes(month?: number, year?: number) {
  const url = month && year ? `/api/incomes?month=${month}&year=${year}` : '/api/incomes';
  const { data, isLoading, error, refetch } = useFetch<Income[]>(url, [month, year]);
  return { incomes: data || [], isLoading, error, refetch };
}

export async function createIncome(income: Omit<Income, 'id'>) {
  const response = await fetch('/api/incomes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(income),
  });
  if (!response.ok) throw new Error('Failed to create income');
  return response.json();
}

export async function updateIncome(id: string, income: Partial<Income>) {
  const response = await fetch(`/api/incomes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(income),
  });
  if (!response.ok) throw new Error('Failed to update income');
  return response.json();
}

export async function deleteIncome(id: string) {
  const response = await fetch(`/api/incomes/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete income');
  return response.json();
}

// Expenses
export function useExpenses(month?: number, year?: number) {
  const url = month && year ? `/api/expenses?month=${month}&year=${year}` : '/api/expenses';
  const { data, isLoading, error, refetch } = useFetch<Expense[]>(url, [month, year]);
  return { expenses: data || [], isLoading, error, refetch };
}

export async function createExpense(expense: Omit<Expense, 'id'>) {
  const response = await fetch('/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
  if (!response.ok) throw new Error('Failed to create expense');
  return response.json();
}

export async function updateExpense(id: string, expense: Partial<Expense>) {
  const response = await fetch(`/api/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
  if (!response.ok) throw new Error('Failed to update expense');
  return response.json();
}

export async function deleteExpense(id: string) {
  const response = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete expense');
  return response.json();
}

// Bills
export function useBills(month?: number, year?: number) {
  const url = month && year ? `/api/bills?month=${month}&year=${year}` : '/api/bills';
  const { data, isLoading, error, refetch } = useFetch<Bill[]>(url, [month, year]);
  return { bills: data || [], isLoading, error, refetch };
}

export async function createBill(bill: Omit<Bill, 'id'>) {
  const response = await fetch('/api/bills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bill),
  });
  if (!response.ok) throw new Error('Failed to create bill');
  return response.json();
}

export async function updateBill(id: string, bill: Partial<Bill>) {
  const response = await fetch(`/api/bills/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bill),
  });
  if (!response.ok) throw new Error('Failed to update bill');
  return response.json();
}

export async function deleteBill(id: string) {
  const response = await fetch(`/api/bills/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete bill');
  return response.json();
}

// Credit Cards
export function useCreditCards() {
  const { data, isLoading, error, refetch } = useFetch<CreditCard[]>('/api/credit-cards');
  return { creditCards: data || [], isLoading, error, refetch };
}

export async function createCreditCard(card: Omit<CreditCard, 'id'>) {
  const response = await fetch('/api/credit-cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
  });
  if (!response.ok) throw new Error('Failed to create credit card');
  return response.json();
}

export async function updateCreditCard(id: string, card: Partial<CreditCard>) {
  const response = await fetch(`/api/credit-cards/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
  });
  if (!response.ok) throw new Error('Failed to update credit card');
  return response.json();
}

export async function deleteCreditCard(id: string) {
  const response = await fetch(`/api/credit-cards/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete credit card');
  return response.json();
}

// Credit Card Statements
export function useCreditCardStatements(month?: number, year?: number) {
  const url =
    month && year
      ? `/api/credit-card-statements?month=${month}&year=${year}`
      : '/api/credit-card-statements';
  const { data, isLoading, error, refetch } = useFetch<CreditCardStatement[]>(url, [
    month,
    year,
  ]);
  return { statements: data || [], isLoading, error, refetch };
}

export async function createCreditCardStatement(statement: Omit<CreditCardStatement, 'id'>) {
  const response = await fetch('/api/credit-card-statements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(statement),
  });
  if (!response.ok) throw new Error('Failed to create credit card statement');
  return response.json();
}

export async function updateCreditCardStatement(
  id: string,
  statement: Partial<CreditCardStatement>
) {
  const response = await fetch(`/api/credit-card-statements/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(statement),
  });
  if (!response.ok) throw new Error('Failed to update credit card statement');
  return response.json();
}

export async function deleteCreditCardStatement(id: string) {
  const response = await fetch(`/api/credit-card-statements/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete credit card statement');
  return response.json();
}

// Savings Goals
export function useSavingsGoals() {
  const { data, isLoading, error, refetch } = useFetch<SavingsGoal[]>('/api/savings-goals');
  return { savingsGoals: data || [], isLoading, error, refetch };
}

export async function createSavingsGoal(goal: Omit<SavingsGoal, 'id'>) {
  const response = await fetch('/api/savings-goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goal),
  });
  if (!response.ok) throw new Error('Failed to create savings goal');
  return response.json();
}

export async function updateSavingsGoal(id: string, goal: Partial<SavingsGoal>) {
  const response = await fetch(`/api/savings-goals/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goal),
  });
  if (!response.ok) throw new Error('Failed to update savings goal');
  return response.json();
}

export async function deleteSavingsGoal(id: string) {
  const response = await fetch(`/api/savings-goals/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete savings goal');
  return response.json();
}

// Savings Contributions
export function useSavingsContributions(month?: number, year?: number) {
  const url =
    month && year
      ? `/api/savings-contributions?month=${month}&year=${year}`
      : '/api/savings-contributions';
  const { data, isLoading, error, refetch } = useFetch<SavingsContribution[]>(url, [
    month,
    year,
  ]);
  return { contributions: data || [], isLoading, error, refetch };
}

export async function createSavingsContribution(contribution: Omit<SavingsContribution, 'id'>) {
  const response = await fetch('/api/savings-contributions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contribution),
  });
  if (!response.ok) throw new Error('Failed to create savings contribution');
  return response.json();
}

export async function deleteSavingsContribution(id: string) {
  const response = await fetch(`/api/savings-contributions/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete savings contribution');
  return response.json();
}

// App Settings
export function useSettings() {
  const { data, isLoading, error, refetch } = useFetch<AppSettings>('/api/settings');
  return { settings: data, isLoading, error, refetch };
}

export async function updateSettings(settings: Partial<AppSettings>) {
  const response = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!response.ok) throw new Error('Failed to update settings');
  return response.json();
}
