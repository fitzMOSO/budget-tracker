'use client'

import React from 'react'
import { cn } from '../../utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
    size?: 'sm' | 'md'
    dot?: boolean
    children: React.ReactNode
}

export function Badge({
    variant = 'default',
    size = 'sm',
    dot = false,
    className,
    children,
    ...props
}: BadgeProps) {
    const variants = {
        default: 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200',
        success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
        warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
        danger: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
        info: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
        purple: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20',
    }

    const dotColors = {
        default: 'bg-gray-400',
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        danger: 'bg-red-500',
        info: 'bg-blue-500',
        purple: 'bg-purple-500',
    }

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
    }

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 font-medium rounded-full transition-colors',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {dot && (
                <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
            )}
            {children}
        </span>
    )
}
