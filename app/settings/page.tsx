'use client'

import React, { useState, useRef } from 'react'
import { Settings as SettingsIcon, Save, RefreshCw, Download, Upload, FileSpreadsheet, Sparkles } from 'lucide-react'
import { AppLayout } from '../components/AppLayout'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select } from '../components/ui'
import { useBudget } from '../context/BudgetContext'
import { getMonthYear } from '../utils'
import { exportToExcel } from '../utils/excel'
import { showSuccess, showError, showDeleteConfirm, showConfirm } from '../utils/swal'
import { buildDemoData } from '../utils/demo-data'
import { buildBackup } from '../utils/backup'

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
    const { state, updateSettings, resetData, importData, isLoading } = useBudget()
    const { month: currentMonth, year: currentYear } = getMonthYear()
    const [selectedMonth, setSelectedMonth] = useState(currentMonth)
    const [selectedYear, setSelectedYear] = useState(currentYear)
    const fileInputRef = useRef<HTMLInputElement>(null)

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

    const handleLoadDemoData = async () => {
        const confirmed = await showConfirm(
            'Load demo data?',
            'This replaces all data on this device with a realistic sample budget.',
            'Load demo data'
        )
        if (!confirmed) return

        // Reset first: IMPORT_DATA appends to the existing collections rather
        // than replacing them, so importing alone would duplicate the demo on a
        // second run and interleave it with any real data already present.
        resetData()
        importData(buildDemoData())
        showSuccess('Demo data loaded.')
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

    // Export Backup (JSON)
    const handleExportBackup = () => {
        try {
            // Deliberately not a field list written out here: the one that used
            // to live at this spot silently omitted `transfers`, which made a
            // restore move money back. utils/backup.ts derives the payload from
            // AppState's own keys, so a new collection cannot be forgotten.
            const dataStr = JSON.stringify(buildBackup(state), null, 2)
            const blob = new Blob([dataStr], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `budget-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
            showSuccess('Backup exported successfully!')
        } catch (error) {
            showError('Failed to export backup')
        }
    }

    // Import Backup (JSON)
    const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const text = await file.text()
            const backupData = JSON.parse(text)

            // Validate backup structure
            if (!backupData.data || !backupData.version) {
                showError('Invalid backup file format')
                return
            }

            const confirmed = await showConfirm(
                'Restore Backup?',
                'This will replace all your current data with the backup data. This action cannot be undone.',
                'Yes, Restore',
                'Cancel'
            )

            if (confirmed) {
                importData(backupData.data)
                showSuccess('Backup restored successfully!')
            }
        } catch (error) {
            showError('Failed to read backup file. Please ensure it is a valid JSON file.')
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
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
                        {/* Backup & Restore */}
                        <div>
                            <h4 className="font-medium text-gray-800 mb-3">Backup & Restore</h4>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button variant="outline" onClick={handleExportBackup}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Export Backup
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Import Backup
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json"
                                    onChange={handleImportBackup}
                                    className="hidden"
                                />
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                Export all your data (accounts, income, expenses, transfers, bills, credit cards, savings, categories, and settings) as a backup file.
                                You can restore this backup later to recover your data.
                            </p>
                        </div>

                        <hr className="my-4" />

                        {/* Analytics Export */}
                        <div>
                            <h4 className="font-medium text-gray-800 mb-3">Analytics Report</h4>
                            <Button variant="outline" onClick={handleExportExcel}>
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                Export to Excel
                            </Button>
                            <p className="text-sm text-gray-500 mt-2">
                                Export a comprehensive analytics report to Excel (.xlsx) with detailed breakdowns of income, expenses,
                                monthly trends, account activity, budget analysis, and more.
                            </p>
                        </div>

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

                {/* Demo Data */}
                <Card>
                    <CardHeader>
                        <CardTitle>Demo Data</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" onClick={handleLoadDemoData}>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Load demo data
                        </Button>
                        <p className="text-sm text-gray-500 mt-2">
                            Fill the app with a realistic sample month — accounts, income, expenses, bills,
                            credit cards, and savings goals — so you can explore every screen without entering
                            anything. This replaces all data currently on this device.
                        </p>
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
                                <span className="font-medium">Kaching</span> - Personal Finance Manager
                            </p>
                            <p>Version: {process.env.NEXT_PUBLIC_APP_VERSION}</p>
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
