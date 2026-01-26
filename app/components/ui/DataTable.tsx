'use client'

import React from 'react'
import { Trash2, Edit2 } from 'lucide-react'
import { cn } from '../../utils'

interface DataTableColumn<T> {
    key: keyof T | string
    header: string
    render?: (item: T) => React.ReactNode
    className?: string
}

interface DataTableProps<T> {
    data: T[]
    columns: DataTableColumn<T>[]
    onEdit?: (item: T) => void
    onDelete?: (item: T) => void
    customActions?: (item: T) => React.ReactNode
    emptyMessage?: string
    className?: string
}

export function DataTable<T extends { id: string }>({
    data,
    columns,
    onEdit,
    onDelete,
    customActions,
    emptyMessage = 'No data available',
    className,
}: DataTableProps<T>) {
    if (data.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                {emptyMessage}
            </div>
        )
    }

    return (
        <div className={cn('overflow-x-auto', className)}>
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-200">
                        {columns.map((column) => (
                            <th
                                key={String(column.key)}
                                className={cn(
                                    'text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4',
                                    column.className
                                )}
                            >
                                {column.header}
                            </th>
                        ))}
                        {(onEdit || onDelete || customActions) && (
                            <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                                Actions
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            {columns.map((column) => (
                                <td
                                    key={`${item.id}-${String(column.key)}`}
                                    className={cn('py-3 px-4 text-sm text-gray-900', column.className)}
                                >
                                    {column.render
                                        ? column.render(item)
                                        : String(item[column.key as keyof T] ?? '')}
                                </td>
                            ))}
                            {(onEdit || onDelete || customActions) && (
                                <td className="py-3 px-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {customActions && customActions(item)}
                                        {onEdit && (
                                            <button
                                                onClick={() => onEdit(item)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        {onDelete && (
                                            <button
                                                onClick={() => onDelete(item)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
