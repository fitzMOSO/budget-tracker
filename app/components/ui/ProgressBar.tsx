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
    animated?: boolean
    gradient?: boolean
}

export function ProgressBar({
    value,
    max = 100,
    color = 'bg-blue-500',
    showLabel = false,
    size = 'md',
    className,
    animated = true,
    gradient = false,
}: ProgressBarProps) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    const sizes = {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4',
    }

    const getGradientColor = () => {
        if (percentage >= 100) return 'bg-gradient-to-r from-red-500 to-red-600'
        if (percentage >= 80) return 'bg-gradient-to-r from-amber-400 to-amber-500'
        return 'bg-gradient-to-r from-emerald-400 to-emerald-500'
    }

    return (
        <div className={cn('w-full', className)}>
            <div className={cn(
                'w-full bg-gray-100 rounded-full overflow-hidden relative',
                sizes[size]
            )}>
                {/* Progress fill */}
                <div
                    className={cn(
                        'h-full rounded-full',
                        animated && 'transition-all duration-500 ease-out',
                        gradient ? getGradientColor() : color
                    )}
                    style={{ width: `${percentage}%` }}
                />
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent rounded-full" />
            </div>
            {showLabel && (
                <div className="flex justify-between mt-1.5 text-xs text-gray-500">
                    <span className="font-medium">{value.toLocaleString()}</span>
                    <span className="font-semibold text-gray-700">{percentage.toFixed(0)}%</span>
                </div>
            )}
        </div>
    )
}
