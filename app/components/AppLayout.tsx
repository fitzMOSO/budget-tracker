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
import { InstallButton } from './InstallButton'

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
        <div className="flex items-center gap-1 bg-gray-50 rounded-xl border border-gray-200/80 px-1.5 py-1">
            <button
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="p-1.5 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-sm active:scale-95"
            >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="font-semibold text-gray-800 min-w-32 text-center text-sm">
                {getMonthName(selectedMonth)} {selectedYear}
            </span>
            <button
                onClick={handleNextMonth}
                aria-label="Next month"
                className="p-1.5 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-sm active:scale-95"
            >
                <ChevronRight className="w-4 h-4 text-gray-500" />
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50/30">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        aria-label="Open sidebar"
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors active:scale-95"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Image src="/icons/icon-192.png" alt="Budget Tracker" width={28} height={28} className="rounded-xl shadow-sm" />
                        <span className="font-bold text-gray-900 tracking-tight">Budget Tracker</span>
                    </div>
                    <div className="w-10" /> {/* Spacer */}
                </div>
            </header>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed top-0 left-0 z-50 h-full w-72 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 transform transition-transform duration-300 ease-out lg:translate-x-0 shadow-xl lg:shadow-none',
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Image src="/icons/icon-192.png" alt="Budget Tracker" width={40} height={40} className="rounded-xl shadow-md" />
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                            </div>
                            <div>
                                <span className="text-lg font-bold text-gray-900 tracking-tight">Budget Tracker</span>
                                <p className="text-xs text-gray-400">Manage your finances</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            aria-label="Close sidebar"
                            className="lg:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
                                                'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200',
                                                isActive
                                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
                                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:scale-[0.98]'
                                            )}
                                        >
                                            <span className={isActive ? 'text-white' : 'text-gray-400'}>{item.icon}</span>
                                            {item.label}
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    </nav>

                    {/* Footer */}
                    <div className="px-4 py-4 border-t border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-xl border border-gray-100">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                <span className="text-white text-sm font-bold">{state.settings.currencySymbol}</span>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-800">{state.settings.currency}</p>
                                <p className="text-xs text-gray-400">Currency</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-72 pt-16 lg:pt-0 pb-20 lg:pb-0">
                {/* Top Bar */}
                <div className="sticky top-16 lg:top-0 z-20 bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight hidden lg:block">
                            {navItems.find((item) => item.href === pathname)?.label || 'Dashboard'}
                        </h1>
                        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                            <MonthSelector
                                selectedMonth={selectedMonth}
                                selectedYear={selectedYear}
                                onMonthChange={onMonthChange}
                            />
                            <InstallButton />
                            <QuickActions />
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <div className="p-4 lg:p-8">{children}</div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 pb-safe">
                <div className="flex items-center justify-around py-2 px-2">
                    {mobileNavItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex flex-col items-center gap-1 px-4 py-2 rounded-xl min-w-[64px] transition-all duration-200',
                                    isActive
                                        ? 'text-blue-600 bg-blue-50'
                                        : 'text-gray-400 active:bg-gray-100 active:scale-95'
                                )}
                            >
                                <span className={isActive ? 'scale-110 transition-transform' : ''}>{item.icon}</span>
                                <span className={cn('text-xs font-medium', isActive && 'font-semibold')}>{item.label}</span>
                            </Link>
                        )
                    })}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        aria-label="More navigation options"
                        className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl min-w-[64px] text-gray-400 active:bg-gray-100 active:scale-95 transition-all duration-200"
                    >
                        <MoreHorizontal className="w-5 h-5" />
                        <span className="text-xs font-medium">More</span>
                    </button>
                </div>
            </nav>
        </div>
    )
}
