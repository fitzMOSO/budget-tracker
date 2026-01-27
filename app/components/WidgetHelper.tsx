'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import Swal from 'sweetalert2'

export function WidgetHelper() {
    const [showHelp, setShowHelp] = useState(false)

    const addQuickAddToHomeScreen = async (type: 'expense' | 'income' | 'transfer') => {
        const titles = {
            expense: 'Add Expense',
            income: 'Add Income',
            transfer: 'Transfer Funds',
        }

        const urls = {
            expense: '/quick-add?type=expense',
            income: '/quick-add?type=income',
            transfer: '/quick-add?type=transfer',
        }

        const url = new URL(urls[type], window.location.origin).href

        // Try different methods for adding shortcuts
        if ('shortcuts' in navigator) {
            try {
                // @ts-expect-error - Chrome/Edge API
                await navigator.shortcuts?.add?.({
                    name: titles[type],
                    short_name: type.charAt(0).toUpperCase() + type.slice(1),
                    description: `Quickly add a new ${type}`,
                    url: url,
                    icons: [
                        {
                            src: '/icons/android-launchericon-96-96.png',
                            sizes: '96x96',
                        },
                    ],
                })
                Swal.fire({
                    icon: 'success',
                    title: 'Shortcut Added!',
                    text: `${titles[type]} shortcut has been added to your home screen.`,
                })
            } catch (error) {
                console.log('Shortcuts API not available, showing manual instructions')
                showManualInstructions(type, url, titles[type])
            }
        } else {
            showManualInstructions(type, url, titles[type])
        }
    }

    const showManualInstructions = (type: string, url: string, title: string) => {
        const isSamsung = /samsung/i.test(navigator.userAgent)

        Swal.fire({
            title: `Add ${title} Shortcut`,
            html: isSamsung
                ? `
                    <div class="text-left space-y-3">
                        <p><strong>Samsung One UI Instructions:</strong></p>
                        <ol class="list-decimal list-inside space-y-2 text-sm">
                            <li>Long-press your home screen</li>
                            <li>Tap <strong>"Widgets"</strong> or <strong>"Apps"</strong></li>
                            <li>Find <strong>"Budget Tracker"</strong> and long-press it</li>
                            <li>Select <strong>"Add to Home Screen"</strong></li>
                        </ol>
                        <hr class="my-3" />
                        <p class="text-xs text-gray-600">
                            <strong>Alternative:</strong> You can also open the app, go to 
                            <strong> Settings > Install App</strong> and tap 
                            <strong> "Add to Home Screen"</strong>
                        </p>
                    </div>
                `
                : `
                    <div class="text-left space-y-3">
                        <p><strong>Add Shortcut to Home Screen:</strong></p>
                        <ol class="list-decimal list-inside space-y-2 text-sm">
                            <li>Long-press your home screen</li>
                            <li>Tap <strong>"Shortcuts"</strong> or <strong>"Widgets"</strong></li>
                            <li>Find <strong>"Budget Tracker"</strong></li>
                            <li>Drag the shortcut to your home screen</li>
                        </ol>
                        <div class="mt-4 p-3 bg-blue-50 rounded">
                            <p class="text-xs text-blue-700">
                                <strong>Quick Access:</strong> Bookmark this link for fast access:
                                <br /><code class="text-xs bg-white p-1 rounded mt-1 block">${url}</code>
                            </p>
                        </div>
                    </div>
                `,
            confirmButtonText: 'Got it!',
            allowOutsideClick: true,
        })
    }

    return (
        <>
            {/* Floating Help Button */}
            <button
                onClick={() => setShowHelp(!showHelp)}
                className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 flex items-center justify-center z-40"
                aria-label="Widget help"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* Help Menu */}
            {showHelp && (
                <>
                    <div
                        className="fixed inset-0 z-39"
                        onClick={() => setShowHelp(false)}
                    />
                    <div className="fixed bottom-24 right-6 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-xs z-50">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-gray-900">Quick Shortcuts</h3>
                            <button
                                onClick={() => setShowHelp(false)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-gray-600 mb-3">
                            Add quick access shortcuts to your home screen:
                        </p>

                        <div className="space-y-2">
                            <button
                                onClick={() => {
                                    addQuickAddToHomeScreen('expense')
                                    setShowHelp(false)
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-red-50 rounded text-sm font-medium text-red-600 transition-colors"
                            >
                                + Add Expense
                            </button>
                            <button
                                onClick={() => {
                                    addQuickAddToHomeScreen('income')
                                    setShowHelp(false)
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-green-50 rounded text-sm font-medium text-green-600 transition-colors"
                            >
                                + Add Income
                            </button>
                            <button
                                onClick={() => {
                                    addQuickAddToHomeScreen('transfer')
                                    setShowHelp(false)
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded text-sm font-medium text-blue-600 transition-colors"
                            >
                                + Transfer Funds
                            </button>
                        </div>

                        <hr className="my-3" />

                        <button
                            onClick={() => {
                                setShowHelp(false)
                                Swal.fire({
                                    title: 'Add Widget to Home Screen',
                                    html: `
                                        <div class="text-left space-y-2 text-sm">
                                            <p><strong>Method 1: App Shortcuts (Recommended)</strong></p>
                                            <ol class="list-decimal list-inside space-y-1 text-xs mb-3">
                                                <li>Long-press the Budget Tracker app icon</li>
                                                <li>Tap any shortcut to add it (or use the buttons above)</li>
                                            </ol>
                                            <p><strong>Method 2: Manual Shortcut</strong></p>
                                            <ol class="list-decimal list-inside space-y-1 text-xs">
                                                <li>Long-press home screen</li>
                                                <li>Select "Shortcuts" or "Widgets"</li>
                                                <li>Find "Budget Tracker" and select a shortcut</li>
                                                <li>Drag to your home screen</li>
                                            </ol>
                                        </div>
                                    `,
                                    confirmButtonText: 'OK',
                                })
                            }}
                            className="w-full text-center text-xs text-gray-600 hover:text-gray-900 py-2 hover:bg-gray-50 rounded transition-colors"
                        >
                            Show Instructions
                        </button>
                    </div>
                </>
            )}
        </>
    )
}
