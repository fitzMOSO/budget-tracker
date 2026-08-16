'use client'

import React, { useState } from 'react'
import { Plus, Tag } from 'lucide-react'
import { AppLayout } from '../components/AppLayout'
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Button,
    Modal,
    Input,
    Select,
    Badge,
    DataTable,
} from '../components/ui'
import { useBudget } from '../context/BudgetContext'
import { getMonthYear } from '../utils'
import { showSuccess, showDeleteConfirm, showError } from '../utils/swal'
import type { Category } from '../types'

const CATEGORY_COLORS = [
    { value: '#ef4444', label: 'Red' },
    { value: '#f97316', label: 'Orange' },
    { value: '#f59e0b', label: 'Amber' },
    { value: '#84cc16', label: 'Lime' },
    { value: '#22c55e', label: 'Green' },
    { value: '#14b8a6', label: 'Teal' },
    { value: '#06b6d4', label: 'Cyan' },
    { value: '#3b82f6', label: 'Blue' },
    { value: '#6366f1', label: 'Indigo' },
    { value: '#8b5cf6', label: 'Violet' },
    { value: '#a855f7', label: 'Purple' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#f43f5e', label: 'Rose' },
    { value: '#6b7280', label: 'Gray' },
]

export default function CategoriesPage() {
    const { state, addCategory, updateCategory, deleteCategory, canDeleteCategory, isLoading } = useBudget()
    const { month: currentMonth, year: currentYear } = getMonthYear()
    const [selectedMonth, setSelectedMonth] = useState(currentMonth)
    const [selectedYear, setSelectedYear] = useState(currentYear)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense')

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        type: 'expense' as 'income' | 'expense',
        color: '#3b82f6',
        isBill: false,
    })

    const handleMonthChange = (month: number, year: number) => {
        setSelectedMonth(month)
        setSelectedYear(year)
    }

    const incomeCategories = state.categories.filter((c) => c.type === 'income')
    const expenseCategories = state.categories.filter((c) => c.type === 'expense')

    const resetForm = () => {
        setFormData({
            name: '',
            type: activeTab,
            color: '#3b82f6',
            isBill: false,
        })
        setEditingCategory(null)
    }

    const handleOpenModal = (category?: Category) => {
        if (category) {
            setEditingCategory(category)
            setFormData({
                name: category.name,
                type: category.type,
                color: category.color,
                isBill: category.isBill || false,
            })
        } else {
            setFormData({
                name: '',
                type: activeTab,
                color: '#3b82f6',
                isBill: false,
            })
        }
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        resetForm()
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const categoryData = {
            name: formData.name,
            type: formData.type,
            color: formData.color,
            isBill: formData.type === 'expense' ? formData.isBill : undefined,
        }

        if (editingCategory) {
            updateCategory({ ...categoryData, id: editingCategory.id, isDefault: editingCategory.isDefault })
            showSuccess('Category updated!')
        } else {
            addCategory(categoryData)
            showSuccess('Category added!')
        }

        handleCloseModal()
    }

    const handleDelete = async (category: Category) => {
        if (category.isDefault) {
            showError('Cannot delete default categories.')
            return
        }
        // Blocked rather than reassigned: there is no real "Uncategorized"
        // record to move these to, and a silent no-op used to leave the records
        // pointing at a dead id that the edit form would happily re-save.
        const check = canDeleteCategory(category.id)
        if (!check.allowed) {
            showError(check.reason)
            return
        }

        const confirmed = await showDeleteConfirm(category.name)
        if (!confirmed) return

        const result = deleteCategory(category.id)
        if (!result.allowed) {
            showError(result.reason)
            return
        }
        showSuccess('Category deleted!')
    }

    const columns = [
        {
            key: 'name',
            header: 'Name',
            render: (category: Category) => (
                <div className="flex items-center gap-3">
                    <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.name}</span>
                    {category.isBill && (
                        <Badge variant="warning" className="text-xs">Bill</Badge>
                    )}
                </div>
            ),
        },
        {
            key: 'type',
            header: 'Type',
            render: (category: Category) => (
                <Badge variant={category.type === 'income' ? 'success' : 'danger'}>
                    {category.type === 'income' ? 'Income' : 'Expense'}
                </Badge>
            ),
        },
        {
            key: 'isDefault',
            header: 'Status',
            render: (category: Category) =>
                category.isDefault ? (
                    <Badge variant="info">Default</Badge>
                ) : (
                    <Badge variant="default">Custom</Badge>
                ),
        },
    ]

    const displayedCategories = activeTab === 'income' ? incomeCategories : expenseCategories

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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-gray-200">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-gray-600">Total Categories</p>
                            <p className="text-2xl font-bold text-gray-900">{state.categories.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-green-200 bg-green-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-green-800">Income Categories</p>
                            <p className="text-2xl font-bold text-green-700">{incomeCategories.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="pt-4">
                            <p className="text-sm font-medium text-red-800">Expense Categories</p>
                            <p className="text-2xl font-bold text-red-700">{expenseCategories.length}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Categories Table */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <CardTitle className="flex items-center gap-2">
                                <Tag className="w-5 h-5" />
                                Categories
                            </CardTitle>
                            <div className="flex items-center gap-3">
                                {/* Tabs */}
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button
                                        onClick={() => setActiveTab('expense')}
                                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'expense'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        Expenses
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('income')}
                                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'income'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        Income
                                    </button>
                                </div>
                                <Button onClick={() => handleOpenModal()}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Category
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            data={displayedCategories}
                            columns={columns}
                            onEdit={handleOpenModal}
                            onDelete={(category) => {
                                if (category.isDefault) {
                                    alert('Cannot delete default categories.')
                                } else {
                                    handleDelete(category)
                                }
                            }}
                            emptyMessage={`No ${activeTab} categories found`}
                        />
                    </CardContent>
                </Card>

                {/* Color Guide */}
                <Card>
                    <CardHeader>
                        <CardTitle>Available Colors</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {CATEGORY_COLORS.map((color) => (
                                <div key={color.value} className="flex items-center gap-2">
                                    <div
                                        className="w-6 h-6 rounded-full border border-gray-200"
                                        style={{ backgroundColor: color.value }}
                                    />
                                    <span className="text-sm text-gray-600">{color.label}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingCategory ? 'Edit Category' : 'Add Category'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Category Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Groceries, Rent, Salary"
                        required
                    />

                    <Select
                        label="Type"
                        value={formData.type}
                        onChange={(e) =>
                            setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })
                        }
                        options={[
                            { value: 'income', label: 'Income' },
                            { value: 'expense', label: 'Expense' },
                        ]}
                        required
                    />

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Color</label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORY_COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color: color.value })}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color.value
                                        ? 'border-gray-900 scale-110'
                                        : 'border-transparent hover:scale-105'
                                        }`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.label}
                                />
                            ))}
                        </div>
                    </div>

                    {formData.type === 'expense' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isBill"
                                checked={formData.isBill}
                                onChange={(e) => setFormData({ ...formData, isBill: e.target.checked })}
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="isBill" className="text-sm text-gray-700">
                                This is a bill category (expenses with this category will also be tracked as bills)
                            </label>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editingCategory ? 'Update' : 'Add'} Category
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    )
}
