"use client"

import Swal from 'sweetalert2'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Modal } from '../components/ui/Modal'

// Base toast configuration
const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    showClass: {
        popup: 'swal2-show'
    },
    hideClass: {
        popup: 'swal2-hide'
    },
    customClass: {
        popup: 'pointer-events-none',
        container: 'pointer-events-none'
    },
    didOpen: (toast) => {
        toast.style.pointerEvents = 'auto'
        toast.onmouseenter = Swal.stopTimer
        toast.onmouseleave = Swal.resumeTimer
    }
})

// Success toast
export const showSuccess = (message: string) => {
    Toast.fire({
        icon: 'success',
        title: message
    })
}

// Error toast
export const showError = (message: string) => {
    Toast.fire({
        icon: 'error',
        title: message
    })
}

// Warning toast
export const showWarning = (message: string) => {
    Toast.fire({
        icon: 'warning',
        title: message
    })
}

// Info toast
export const showInfo = (message: string) => {
    Toast.fire({
        icon: 'info',
        title: message
    })
}

// Confirm dialog
export const showConfirm = async (
    title: string,
    text: string,
    confirmButtonText: string = 'Yes',
    cancelButtonText: string = 'Cancel'
): Promise<boolean> => {
    const result = await Swal.fire({
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText,
        cancelButtonText,
    })
    return result.isConfirmed
}

// Delete confirmation
export const showDeleteConfirm = async (itemName: string = 'this item', additionalText?: string): Promise<boolean> => {
    let text = `You are about to delete ${itemName}. This action cannot be undone!`
    if (additionalText) {
        text = `You are about to delete ${itemName}. ${additionalText} This action cannot be undone!`
    }
    
    const result = await Swal.fire({
        title: 'Are you sure?',
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel',
    })
    return result.isConfirmed
}

// Input dialog for selecting account
export const showAccountSelect = async (
    title: string,
    accounts: { id: string; name: string }[],
    defaultAccountId?: string
): Promise<string | null> => {
    // Build HTML select with Tailwind classes so it matches project inputs
    const optionsHtml = accounts
        .map(a => `<option value="${a.id}" ${a.id === (defaultAccountId || accounts[0]?.id) ? 'selected' : ''}>${a.name}</option>`)
        .join('')

    const result = await Swal.fire({
        title,
        html: `
            <div class="mt-2 text-sm text-gray-700">Select an account to continue</div>
            <div class="mt-4">
                <select id="swal-account-select" class="border border-gray-200 rounded-lg p-3 w-full h-12 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200">${optionsHtml}</select>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        customClass: {
            popup: 'rounded-lg shadow-lg',
            title: 'text-lg font-semibold',
            htmlContainer: 'mt-2',
            confirmButton: 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md',
            cancelButton: 'bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md',
            actions: 'mt-4 flex justify-center gap-3'
        },
        preConfirm: () => {
            const el = document.getElementById('swal-account-select') as HTMLSelectElement | null
            const val = el?.value
            if (!val) {
                Swal.showValidationMessage('Please select an account')
                return null
            }
            return val
        }
    })

    if (result.isConfirmed) {
        return result.value as string
    }
    return null
}

// Payment dialog with account selection
export const showPaymentDialog = async (
    title: string,
    accounts: { id: string; name: string; balance?: number }[],
    amount: number,
    currencySymbol: string = '₱'
): Promise<{ accountId: string } | null> => {
    return await new Promise((resolve) => {
        if (typeof document === 'undefined') return resolve(null)

        const container = document.createElement('div')
        document.body.appendChild(container)
        const root = createRoot(container)

        function cleanup() {
            try { root.unmount() } catch (e) { /* ignore */ }
            if (container.parentNode) container.parentNode.removeChild(container)
        }

        function PaymentModal() {
            const [isOpen, setIsOpen] = React.useState(true)
            const [selected, setSelected] = React.useState(accounts[0]?.id || '')
            const [error, setError] = React.useState<string | null>(null)

            const handleClose = () => {
                setIsOpen(false)
                cleanup()
                resolve(null)
            }

            const handleConfirm = () => {
                if (!selected) {
                    setError('Please select an account')
                    return
                }
                setIsOpen(false)
                cleanup()
                resolve({ accountId: selected })
            }

            return (
                <Modal isOpen={isOpen} onClose={handleClose} title={title} size="md">
                    <div className="text-center">
                        <p className="text-xl">Amount: <strong>{currencySymbol}{amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></p>
                    </div>

                    <div className="mt-6">
                        <label className="block text-sm text-gray-600 mb-2">Select account</label>
                        <select
                            value={selected}
                            onChange={(e) => { setSelected(e.target.value); setError(null) }}
                            className="w-full border border-gray-200 rounded-lg p-3 h-12 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                            {accounts.map(a => {
                                    const label = a.balance != null
                                        ? `${a.name} (${currencySymbol}${a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })})`
                                        : a.name
                                    return <option key={a.id} value={a.id}>{label}</option>
                                })}
                        </select>
                        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
                    </div>

                    <div className="mt-6 flex justify-center gap-4">
                        <button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-md">Pay Now</button>
                        <button onClick={handleClose} className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 rounded-md">Cancel</button>
                    </div>
                </Modal>
            )
        }

        root.render(React.createElement(PaymentModal))
    })
}

// Loading indicator
export const showLoading = (title: string = 'Loading...') => {
    Swal.fire({
        title,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
            Swal.showLoading()
        }
    })
}

// Close loading
export const closeLoading = () => {
    Swal.close()
}

// Success with action
export const showSuccessWithAction = async (
    title: string,
    text: string,
    confirmButtonText: string = 'OK'
): Promise<void> => {
    await Swal.fire({
        title,
        text,
        icon: 'success',
        confirmButtonText,
        confirmButtonColor: '#22c55e',
    })
}

export default Swal
