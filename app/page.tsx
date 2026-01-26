'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { AppLayout } from './components/AppLayout'
import {
  BudgetOverview,
  SummaryCards,
  UpcomingBills,
  CreditCardSummary,
  RecentTransactions,
  SavingsGoals,
} from './components/dashboard'
import { useBudget } from './context/BudgetContext'
import { filterByMonth, calculateBudgetSummary, getMonthYear } from './utils'

export default function DashboardPage() {
  const { state, isLoading, generateRecurringBills, payBill } = useBudget()
  const { month: currentMonth, year: currentYear } = getMonthYear()
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)

  // Generate recurring bills when month changes
  useEffect(() => {
    generateRecurringBills(selectedMonth, selectedYear)
  }, [selectedMonth, selectedYear, generateRecurringBills])

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month)
    setSelectedYear(year)
  }

  // Filter data by selected month
  const monthlyIncomes = useMemo(
    () => filterByMonth(state.incomes, selectedMonth, selectedYear),
    [state.incomes, selectedMonth, selectedYear]
  )

  const monthlyExpenses = useMemo(
    () => filterByMonth(state.expenses, selectedMonth, selectedYear),
    [state.expenses, selectedMonth, selectedYear]
  )

  const monthlyBills = useMemo(
    () => filterByMonth(state.bills, selectedMonth, selectedYear),
    [state.bills, selectedMonth, selectedYear]
  )

  const monthlyContributions = useMemo(
    () => filterByMonth(state.savingsContributions, selectedMonth, selectedYear),
    [state.savingsContributions, selectedMonth, selectedYear]
  )

  const monthlyCreditCardStatements = useMemo(
    () => filterByMonth(state.creditCardStatements, selectedMonth, selectedYear),
    [state.creditCardStatements, selectedMonth, selectedYear]
  )

  // Calculate budget summary
  const budgetSummary = useMemo(
    () =>
      calculateBudgetSummary(
        monthlyIncomes,
        monthlyExpenses,
        monthlyContributions,
        state.settings.defaultEssentialsPercentage,
        state.settings.defaultNonEssentialsPercentage,
        state.settings.defaultSavingsPercentage
      ),
    [monthlyIncomes, monthlyExpenses, monthlyContributions, state.settings]
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
      onMonthChange={handleMonthChange}
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <SummaryCards summary={budgetSummary} settings={state.settings} />

        {/* Budget Overview & Credit Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BudgetOverview
            summary={budgetSummary}
            settings={state.settings}
          />
          <CreditCardSummary
            creditCards={state.creditCards}
            statements={monthlyCreditCardStatements}
            settings={state.settings}
          />
        </div>

        {/* Bills, Transactions & Savings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <UpcomingBills
            bills={monthlyBills}
            settings={state.settings}
            accounts={state.accounts}
            onPayBill={payBill}
          />
          <RecentTransactions
            incomes={monthlyIncomes}
            expenses={monthlyExpenses}
            categories={state.categories}
            settings={state.settings}
          />
          <SavingsGoals
            savingsGoals={state.savingsGoals}
            settings={state.settings}
          />
        </div>
      </div>
    </AppLayout>
  )
}
