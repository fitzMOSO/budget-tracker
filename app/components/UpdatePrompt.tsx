'use client'

import { RefreshCw } from 'lucide-react'

/**
 * Presentational only — the registration component owns the worker lifecycle.
 * Keeping this dumb makes the update UI trivial to render in isolation.
 */
export function UpdatePrompt({ onUpdate, onDismiss }: { onUpdate: () => void; onDismiss: () => void }) {
    return (
        <div
            role="status"
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between gap-3 z-50"
        >
            <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 shrink-0" />
                <span className="font-medium text-sm">A new version is available.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <button
                    onClick={onDismiss}
                    className="px-2 py-1.5 text-sm rounded hover:bg-blue-700 transition-colors"
                >
                    Later
                </button>
                <button
                    onClick={onUpdate}
                    className="bg-white text-blue-600 px-3 py-1.5 rounded font-semibold text-sm hover:bg-blue-50 transition-colors"
                >
                    Update
                </button>
            </div>
        </div>
    )
}
