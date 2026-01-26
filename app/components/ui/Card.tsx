'use client'

import React from 'react'
import { cn } from '../../utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    variant?: 'default' | 'glass' | 'elevated' | 'gradient'
    hover?: boolean
}

export function Card({ children, className, variant = 'default', hover = true, ...props }: CardProps) {
    const variants = {
        default: 'bg-white border border-gray-100 shadow-sm',
        glass: 'bg-white/80 backdrop-blur-xl border border-white/20 shadow-lg',
        elevated: 'bg-white border-0 shadow-md',
        gradient: 'bg-gradient-to-br from-white to-gray-50 border border-gray-100 shadow-sm',
    }

    return (
        <div
            className={cn(
                'rounded-2xl transition-all duration-300',
                variants[variant],
                hover && 'hover:shadow-lg hover:-translate-y-0.5',
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

export function CardHeader({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
    return (
        <div className={cn('px-6 py-4 border-b border-gray-100/80', className)} {...props}>
            {children}
        </div>
    )
}

export function CardTitle({
    children,
    className,
    ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3 className={cn('text-lg font-semibold text-gray-900 tracking-tight', className)} {...props}>
            {children}
        </h3>
    )
}

export function CardContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
    return (
        <div className={cn('px-6 py-5', className)} {...props}>
            {children}
        </div>
    )
}

export function CardFooter({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
    return (
        <div className={cn('px-6 py-4 border-t border-gray-100/80 bg-gray-50/50 rounded-b-2xl', className)} {...props}>
            {children}
        </div>
    )
}
