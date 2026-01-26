'use client'

import React from 'react'
import { cn } from '../../utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
    size?: 'sm' | 'md' | 'lg'
    children: React.ReactNode
    isLoading?: boolean
}

export function Button({
    variant = 'primary',
    size = 'md',
    className,
    children,
    isLoading = false,
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles = cn(
        'inline-flex items-center justify-center font-semibold rounded-xl',
        'transition-all duration-200 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
        'active:scale-[0.98]'
    )

    const variants = {
        primary: cn(
            'bg-gradient-to-r from-blue-600 to-blue-700 text-white',
            'hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-500/25',
            'focus-visible:ring-blue-500'
        ),
        secondary: cn(
            'bg-gray-100 text-gray-900',
            'hover:bg-gray-200 hover:shadow-md',
            'focus-visible:ring-gray-500'
        ),
        outline: cn(
            'border-2 border-gray-200 bg-white text-gray-700',
            'hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm',
            'focus-visible:ring-gray-500'
        ),
        ghost: cn(
            'text-gray-600 bg-transparent',
            'hover:bg-gray-100 hover:text-gray-900',
            'focus-visible:ring-gray-500'
        ),
        danger: cn(
            'bg-gradient-to-r from-red-500 to-red-600 text-white',
            'hover:from-red-600 hover:to-red-700 hover:shadow-lg hover:shadow-red-500/25',
            'focus-visible:ring-red-500'
        ),
        success: cn(
            'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white',
            'hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg hover:shadow-emerald-500/25',
            'focus-visible:ring-emerald-500'
        ),
    }

    const sizes = {
        sm: 'px-3.5 py-2 text-sm gap-1.5',
        md: 'px-5 py-2.5 text-sm gap-2',
        lg: 'px-7 py-3.5 text-base gap-2.5',
    }

    return (
        <button
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            )}
            {children}
        </button>
    )
}
