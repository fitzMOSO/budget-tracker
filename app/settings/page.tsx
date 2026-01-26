'use client'

import React, { useState } from 'react'
import { Settings as SettingsIcon, Save, RefreshCw, Download, FileSpreadsheet } from 'lucide-react'
import { AppLayout } from '../components/AppLayout'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select } from '../components/ui'
import { useBudget } from '../context/BudgetContext'
import { getMonthYear } from '../utils'
import { exportToExcel } from '../utils/excel'
import { showSuccess, showError, showDeleteConfirm } from '../utils/swal'

const CURRENCIES = [
    { value: 'PHP', label: 'Philippine Peso (₱)', symbol: '₱' },
    { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
    { value: 'EUR', label: 'Euro (€)', symbol: '€' },
    { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
    { value: 'JPY', label: 'Japanese Yen (¥)', symbol: '¥' },
    { value: 'KRW', label: 'Korean Won (₩)', symbol: '₩' },
    { value: 'SGD', label: 'Singapore Dollar (S$)', symbol: 'S$' },
    { value: 'AUD', label: 'Australian Dollar (A$)', symbol: 'A$' },
    { value: 'CAD', label: 'Canadian Dollar (C$)', symbol: 'C$' },
    { value: 'INR', label: 'Indian Rupee (₹)', symbol: '₹' },
]

export default function SettingsPage() {
    const { state, updateSettings, resetData, isLoading } = useBudget()
    const { month: currentMonth, year: currentYear } = getMonthYear()
    const [selectedMonth, setSelectedMonth] = useState(currentMonth)
    const [selectedYear, setSelectedYear] = useState(currentYear)

    const [formData, setFormData] = useState({
        currency: state.settings.currency,
        defaultEssentialsPercentage: state.settings.defaultEssentialsPercentage.toString(),
        defaultNonEssentialsPercentage: state.settings.defaultNonEssentialsPercentage.toString(),
        defaultSavingsPercentage: state.settings.defaultSavingsPercentage.toString(),
    })

    const handleMonthChange = (month: number, year: number) => {
        setSelectedMonth(month)
        setSelectedYear(year)
    }

    const handleCurrencyChange = (currency: string) => {
        const selectedCurrency = CURRENCIES.find((c) => c.value === currency)
        setFormData({ ...formData, currency })
        if (selectedCurrency) {
            updateSettings({
                currency: selectedCurrency.value,
                currencySymbol: selectedCurrency.symbol,
            })
            showSuccess('Currency updated!')
        }
    }

    const handleSaveSettings = () => {
        const essentials = parseFloat(formData.defaultEssentialsPercentage)
        const nonEssentials = parseFloat(formData.defaultNonEssentialsPercentage)
        const savings = parseFloat(formData.defaultSavingsPercentage)

        // Validate that percentages add up to 100
        if (essentials + nonEssentials + savings !== 100) {
            showError('Budget percentages must add up to 100%')
            return
        }

        const selectedCurrency = CURRENCIES.find((c) => c.value === formData.currency)

        updateSettings({
            currency: formData.currency,
            currencySymbol: selectedCurrency?.symbol || '₱',
            defaultEssentialsPercentage: essentials,
            defaultNonEssentialsPercentage: nonEssentials,
            defaultSavingsPercentage: savings,
        })

        showSuccess('Settings saved successfully!')
    }

    const handleResetData = async () => {
        const confirmed = await showDeleteConfirm('all your data')
        if (confirmed) {
            resetData()
            showSuccess('All data has been reset.')
        }
    }

    // Export to Excel
    const handleExportExcel = () => {
        try {
            exportToExcel(state, 'budget-tracker-analytics')
            showSuccess('Analytics report exported to Excel successfully!')
        } catch (error) {
            showError('Failed to export data')
        }
    }

    const totalPercentage =
        parseFloat(formData.defaultEssentialsPercentage || '0') +
        parseFloat(formData.defaultNonEssentialsPercentage || '0') +
        parseFloat(formData.defaultSavingsPercentage || '0')

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
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Currency Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <SettingsIcon className="w-5 h-5" />
                            Currency Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select
                            label="Currency"
                            value={formData.currency}
                            onChange={(e) => handleCurrencyChange(e.target.value)}
                            options={CURRENCIES.map((c) => ({ value: c.value, label: c.label }))}
                        />
                        <p className="text-sm text-gray-500">
                            Current symbol: <span className="font-semibold">{state.settings.currencySymbol}</span>
                        </p>
                    </CardContent>
                </Card>

                {/* Budget Allocation */}
                <Card>
                    <CardHeader>
                        <CardTitle>Budget Allocation (50/30/20 Rule)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-600">
                            The 50/30/20 rule is a simple budgeting guideline: 50% for needs (essentials), 30%
                            for wants (non-essentials), and 20% for savings. Adjust these percentages to match
                            your personal financial goals.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                label="Essentials (%)"
                                type="number"
                                min="0"
                                max="100"
                                value={formData.defaultEssentialsPercentage}
                                onChange={(e) =>
                                    setFormData({ ...formData, defaultEssentialsPercentage: e.target.value })
                                }
                            />
                            <Input
                                label="Non-Essentials (%)"
                                type="number"
                                min="0"
                                max="100"
                                value={formData.defaultNonEssentialsPercentage}
                                onChange={(e) =>
                                    setFormData({ ...formData, defaultNonEssentialsPercentage: e.target.value })
                                }
                            />
                            <Input
                                label="Savings (%)"
                                type="number"
                                min="0"
                                max="100"
                                value={formData.defaultSavingsPercentage}
                                onChange={(e) =>
                                    setFormData({ ...formData, defaultSavingsPercentage: e.target.value })
                                }
                            />
                        </div>

                        <div
                            className={`text-sm ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'
                                }`}
                        >
                            Total: {totalPercentage}% {totalPercentage !== 100 && '(must equal 100%)'}
                        </div>

                        <Button onClick={handleSaveSettings} disabled={totalPercentage !== 100}>
                            <Save className="w-4 h-4 mr-2" />
                            Save Settings
                        </Button>
                    </CardContent>
                </Card>

                {/* Data Management */}
                <Card>
                    <CardHeader>
                        <CardTitle>Data Management</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button variant="outline" onClick={handleExportExcel}>
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                Export Analytics Report
                            </Button>
                        </div>
                        <p className="text-sm text-gray-500">
                            Export a comprehensive analytics report to Excel (.xlsx) with detailed breakdowns of income, expenses,
                            monthly trends, account activity, budget analysis, and more.
                        </p>

                        <hr className="my-4" />

                        <div>
                            <h4 className="font-medium text-red-600 mb-2">Danger Zone</h4>
                            <Button variant="danger" onClick={handleResetData}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reset All Data
                            </Button>
                            <p className="text-sm text-gray-500 mt-2">
                                This will permanently delete all your data including income, expenses, bills,
                                credit cards, and savings goals. This action cannot be undone.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* App Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>About</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm text-gray-600">
                            <p>
                                <span className="font-medium">Budget Tracker</span> - Personal Finance Manager
                            </p>
                            <p>Version: 1.0.0</p>
                            <p>
                                Built with Next.js, React, and Tailwind CSS. All data is stored locally in your
                                browser.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    )
}
