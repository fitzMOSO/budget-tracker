'use client'

import React from 'react'
import { cn } from '../../utils'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string
    error?: string
    options: { value: string; label: string }[]
    placeholder?: string
}

export function Select({
    label,
    error,
    options,
    placeholder,
    className,
    id,
    ...props
}: SelectProps) {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
        <div className="space-y-1">
            {label && (
                <label
                    htmlFor={selectId}
                    className="block text-sm font-medium text-gray-700"
                >
                    {label}
                </label>
            )}
            <select
                id={selectId}
                className={cn(
                    'w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 bg-white',
                    'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                    'disabled:bg-gray-50 disabled:text-gray-500',
                    error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
                    className
                )}
                {...props}
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    )
}
