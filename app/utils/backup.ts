// app/utils/backup.ts
//
// The backup contract: what leaves the device on "Export Backup", and which
// collections a restore puts back.
//
// This file exists because the export used to be a hand-written field list
// inside the Settings component. It silently omitted `transfers` — nobody
// updated it when Transfer became a first-class entity — and in the derived
// balance model a dropped transfer does not just lose history, it MOVES MONEY
// BACK, permanently, on the one operation a user performs because they are
// afraid of losing data.
//
// The defence is that the key list is now a `Record<keyof AppState, true>`:
// adding a collection to AppState without adding it here is a COMPILE error,
// not a silent omission discovered by a user.
import type { AppState } from '../types'
import { CURRENT_SCHEMA_VERSION } from './migrations'

/**
 * Bumped when the backup ENVELOPE changes shape. The payload's own schema is
 * reported separately by `schemaVersion`, which is what an importer needs: an
 * envelope that does not say which schema its data is in has to be recognised
 * by sniffing account shapes (see migrations#inferSchemaVersion).
 */
export const BACKUP_VERSION = '2.0.0'

/**
 * Every key of AppState, as a value. Exhaustive BY TYPE — remove a line and the
 * compiler fails. Never widen this to Partial<...>.
 */
const BACKED_UP_KEYS: Record<keyof AppState, true> = {
    categories: true,
    accounts: true,
    incomes: true,
    expenses: true,
    bills: true,
    creditCards: true,
    creditCardStatements: true,
    savingsGoals: true,
    savingsContributions: true,
    monthlyBudgets: true,
    transfers: true,
    schemaVersion: true,
    settings: true,
}

export const BACKUP_KEYS = Object.keys(BACKED_UP_KEYS) as (keyof AppState)[]

/** The AppState keys that hold arrays of records — everything a restore merges. */
export type CollectionKey = {
    [K in keyof AppState]: AppState[K] extends unknown[] ? K : never
}[keyof AppState]

/** Same exhaustiveness trick, narrowed to the collections IMPORT_DATA appends. */
const IMPORTED_COLLECTIONS: Record<CollectionKey, true> = {
    categories: true,
    accounts: true,
    incomes: true,
    expenses: true,
    bills: true,
    creditCards: true,
    creditCardStatements: true,
    savingsGoals: true,
    savingsContributions: true,
    monthlyBudgets: true,
    transfers: true,
}

export const COLLECTION_KEYS = Object.keys(IMPORTED_COLLECTIONS) as CollectionKey[]

export type BackupEnvelope = {
    version: string
    /** The schema of `data`, so a future importer never has to sniff shapes. */
    schemaVersion: number
    exportDate: string
    data: AppState
}

export function buildBackup(state: AppState, exportDate: string = new Date().toISOString()): BackupEnvelope {
    const data = {} as Record<keyof AppState, unknown>
    for (const key of BACKUP_KEYS) data[key] = state[key]

    return {
        version: BACKUP_VERSION,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        exportDate,
        data: data as AppState,
    }
}
