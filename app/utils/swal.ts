'use client'

import Swal from 'sweetalert2'

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
    const inputOptions: Record<string, string> = {}
    accounts.forEach(acc => {
        inputOptions[acc.id] = acc.name
    })

    const result = await Swal.fire({
        title,
        input: 'select',
        inputOptions,
        inputValue: defaultAccountId || accounts[0]?.id || '',
        inputPlaceholder: 'Select an account',
        showCancelButton: true,
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        inputValidator: (value) => {
            if (!value) {
                return 'Please select an account'
            }
            return null
        }
    })

    if (result.isConfirmed) {
        return result.value
    }
    return null
}

// Payment dialog with account selection
export const showPaymentDialog = async (
    title: string,
    accounts: { id: string; name: string }[],
    amount: number,
    currencySymbol: string = '₱'
): Promise<{ accountId: string } | null> => {
    const inputOptions: Record<string, string> = {}
    accounts.forEach(acc => {
        inputOptions[acc.id] = acc.name
    })

    const result = await Swal.fire({
        title,
        html: `<p class="text-lg mb-4">Amount: <strong>${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></p>`,
        input: 'select',
        inputOptions,
        inputValue: accounts[0]?.id || '',
        inputPlaceholder: 'Select account to pay from',
        showCancelButton: true,
        confirmButtonText: 'Pay Now',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#22c55e',
        inputValidator: (value) => {
            if (!value) {
                return 'Please select an account'
            }
            return null
        }
    })

    if (result.isConfirmed) {
        return { accountId: result.value }
    }
    return null
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
