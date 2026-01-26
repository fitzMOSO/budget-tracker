'use client'

import React from 'react'
import { cn } from '../../utils'

interface ProgressBarProps {
    value: number
    max?: number
    color?: string
    showLabel?: boolean
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export function ProgressBar({
    value,
    max = 100,
    color = 'bg-blue-600',
    showLabel = false,
    size = 'md',
    className,
}: ProgressBarProps) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    const sizes = {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4',
    }

    return (
        <div className={cn('w-full', className)}>
            <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizes[size])}>
                <div
                    className={cn('h-full rounded-full transition-all duration-300', color)}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showLabel && (
                <div className="flex justify-between mt-1 text-xs text-gray-600">
                    <span>{value.toLocaleString()}</span>
                    <span>{percentage.toFixed(0)}%</span>
                </div>
            )}
        </div>
    )
}
