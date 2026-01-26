'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    CreditCard,
    Receipt,
    PiggyBank,
    Tags,
    Settings,
    Menu,
    X,
    TrendingUp,
    TrendingDown,
    ChevronLeft,
    ChevronRight,
    Building2,
    MoreHorizontal,
} from 'lucide-react'
import { cn } from '../utils'
import { useBudget } from '../context/BudgetContext'
import { getMonthName, getMonthYear } from '../utils'
import { QuickActions } from './QuickActions'

interface NavItem {
    href: string
    label: string
    icon: React.ReactNode
}

const navItems: NavItem[] = [
    { href: '/', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { href: '/accounts', label: 'Accounts', icon: <Building2 className="w-5 h-5" /> },
    { href: '/income', label: 'Income', icon: <TrendingUp className="w-5 h-5" /> },
    { href: '/expenses', label: 'Expenses', icon: <TrendingDown className="w-5 h-5" /> },
    { href: '/bills', label: 'Bills', icon: <Receipt className="w-5 h-5" /> },
    { href: '/credit-cards', label: 'Credit Cards', icon: <CreditCard className="w-5 h-5" /> },
    { href: '/savings', label: 'Savings', icon: <PiggyBank className="w-5 h-5" /> },
    { href: '/categories', label: 'Categories', icon: <Tags className="w-5 h-5" /> },
    { href: '/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
]

// Mobile bottom nav items (most used)
const mobileNavItems: NavItem[] = [
    { href: '/', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { href: '/expenses', label: 'Expenses', icon: <TrendingDown className="w-5 h-5" /> },
    { href: '/income', label: 'Income', icon: <TrendingUp className="w-5 h-5" /> },
    { href: '/bills', label: 'Bills', icon: <Receipt className="w-5 h-5" /> },
]

interface MonthSelectorProps {
    selectedMonth: number
    selectedYear: number
    onMonthChange: (month: number, year: number) => void
}

function MonthSelector({ selectedMonth, selectedYear, onMonthChange }: MonthSelectorProps) {
    const handlePrevMonth = () => {
        if (selectedMonth === 1) {
            onMonthChange(12, selectedYear - 1)
        } else {
            onMonthChange(selectedMonth - 1, selectedYear)
        }
    }

    const handleNextMonth = () => {
        if (selectedMonth === 12) {
            onMonthChange(1, selectedYear + 1)
        } else {
            onMonthChange(selectedMonth + 1, selectedYear)
        }
    }

    return (
        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-2 py-1">
            <button
                onClick={handlePrevMonth}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="font-medium text-gray-900 min-w-35 text-center">
                {getMonthName(selectedMonth)} {selectedYear}
            </span>
            <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
                <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
        </div>
    )
}

interface AppLayoutProps {
    children: React.ReactNode
    selectedMonth: number
    selectedYear: number
    onMonthChange: (month: number, year: number) => void
}

export function AppLayout({ children, selectedMonth, selectedYear, onMonthChange }: AppLayoutProps) {
    const pathname = usePathname()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { state } = useBudget()

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Image src="/icons/icon-192.png" alt="Budget Tracker" width={28} height={28} className="rounded-lg" />
                        <span className="font-bold text-gray-900">Budget Tracker</span>
                    </div>
                    <div className="w-10" /> {/* Spacer */}
                </div>
            </header>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-50 bg-black/50"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0',
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <Image src="/icons/icon-192.png" alt="Budget Tracker" width={32} height={32} className="rounded-lg" />
                            <span className="text-xl font-bold text-gray-900">Budget Tracker</span>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="lg:hidden p-2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-4 px-3">
                        <ul className="space-y-1">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href
                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            onClick={() => setIsSidebarOpen(false)}
                                            className={cn(
                                                'flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors',
                                                isActive
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                            )}
                                        >
                                            {item.icon}
                                            {item.label}
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    </nav>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                            Currency: {state.settings.currencySymbol} ({state.settings.currency})
                        </p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64 pt-16 lg:pt-0 pb-20 lg:pb-0">
                {/* Top Bar */}
                <div className="sticky top-16 lg:top-0 z-30 bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-semibold text-gray-900 hidden lg:block">
                            {navItems.find((item) => item.href === pathname)?.label || 'Dashboard'}
                        </h1>
                        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                            <MonthSelector
                                selectedMonth={selectedMonth}
                                selectedYear={selectedYear}
                                onMonthChange={onMonthChange}
                            />
                            <QuickActions />
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <div className="p-4 lg:p-8">{children}</div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-safe">
                <div className="flex items-center justify-around py-2">
                    {mobileNavItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex flex-col items-center gap-1 px-3 py-2 rounded-lg min-w-[60px] transition-colors',
                                    isActive
                                        ? 'text-blue-600'
                                        : 'text-gray-500 active:bg-gray-100'
                                )}
                            >
                                {item.icon}
                                <span className="text-xs font-medium">{item.label}</span>
                            </Link>
                        )
                    })}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg min-w-[60px] text-gray-500 active:bg-gray-100 transition-colors"
                    >
                        <MoreHorizontal className="w-5 h-5" />
                        <span className="text-xs font-medium">More</span>
                    </button>
                </div>
            </nav>
        </div>
    )
}
