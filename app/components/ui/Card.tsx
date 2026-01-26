'use client'

import React from 'react'
import { cn } from '../../utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

export function Card({ children, className, ...props }: CardProps) {
    return (
        <div
            className={cn(
                'rounded-xl border border-gray-200 bg-white shadow-sm',
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

export function CardHeader({ children, className, ...props }: CardProps) {
    return (
        <div className={cn('px-6 py-4 border-b border-gray-100', className)} {...props}>
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
        <h3 className={cn('text-lg font-semibold text-gray-900', className)} {...props}>
            {children}
        </h3>
    )
}

export function CardContent({ children, className, ...props }: CardProps) {
    return (
        <div className={cn('px-6 py-4', className)} {...props}>
            {children}
        </div>
    )
}

export function CardFooter({ children, className, ...props }: CardProps) {
    return (
        <div className={cn('px-6 py-4 border-t border-gray-100', className)} {...props}>
            {children}
        </div>
    )
}
