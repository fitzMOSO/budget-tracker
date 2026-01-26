'use client'

import React from 'react'
import { cn } from '../../utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    helper?: string
}

export function Input({ label, error, helper, className, id, ...props }: InputProps) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
        <div className="space-y-1.5">
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-sm font-medium text-gray-700"
                >
                    {label}
                </label>
            )}
            <input
                id={inputId}
                className={cn(
                    'w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400',
                    'bg-white/50 backdrop-blur-sm',
                    'focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10',
                    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
                    'transition-all duration-200',
                    error && 'border-red-400 focus:border-red-500 focus:ring-red-500/10',
                    className
                )}
                {...props}
            />
            {helper && !error && (
                <p className="text-xs text-gray-500">{helper}</p>
            )}
            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        </div>
    )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string
    error?: string
    helper?: string
}

export function Textarea({ label, error, helper, className, id, ...props }: TextareaProps) {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
        <div className="space-y-1.5">
            {label && (
                <label
                    htmlFor={textareaId}
                    className="block text-sm font-medium text-gray-700"
                >
                    {label}
                </label>
            )}
            <textarea
                id={textareaId}
                className={cn(
                    'w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-gray-900 placeholder-gray-400',
                    'bg-white/50 backdrop-blur-sm',
                    'focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10',
                    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
                    'transition-all duration-200 resize-none',
                    error && 'border-red-400 focus:border-red-500 focus:ring-red-500/10',
                    className
                )}
                {...props}
            />
            {helper && !error && (
                <p className="text-xs text-gray-500">{helper}</p>
            )}
            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        </div>
    )
}
