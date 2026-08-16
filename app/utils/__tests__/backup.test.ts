// app/utils/__tests__/backup.test.ts
//
// The runtime half of the "you cannot forget a collection" guarantee. The
// compile-time half is `Record<keyof AppState, true>` in utils/backup.ts; this
// file fails the build the same way if AppState ever grows a collection that
// the backup does not carry — including the case the compiler cannot see,
// where the key list and AppState agree but the BUILDER skips a key.
import { describe, it, expect } from 'vitest'
import { seedState } from '../../context/BudgetContext'
import { buildBackup, BACKUP_VERSION, COLLECTION_KEYS } from '../backup'
import { CURRENT_SCHEMA_VERSION } from '../migrations'
import type { AppState } from '../../types'

describe('the exported backup', () => {
    it('carries every key AppState has', () => {
        const state = seedState()
        const { data } = buildBackup(state)

        // `transfers` was missing here for the life of this branch, and a
        // missing collection does not just lose history — balances are derived
        // from these records, so restoring without them moves money.
        expect(Object.keys(data).sort()).toEqual(Object.keys(state).sort())
    })

    it('copies each collection through rather than emptying it', () => {
        const state: AppState = {
            ...seedState(),
            transfers: [{ id: 't1', fromAccountId: 'a1', toAccountId: 'a2', amount: 400, date: '2026-08-02' }],
        }
        const { data } = buildBackup(state)

        for (const key of Object.keys(state) as (keyof AppState)[]) {
            expect(data[key], `"${key}" was not copied into the backup`).toEqual(state[key])
        }
    })

    it('stamps the schema of the data, so a future importer need not sniff shapes', () => {
        const envelope = buildBackup(seedState(), '2026-08-16T00:00:00.000Z')

        expect(envelope.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
        expect(envelope.data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
        expect(envelope.version).toBe(BACKUP_VERSION)
        expect(envelope.exportDate).toBe('2026-08-16T00:00:00.000Z')
    })

    it('lists every array collection for the restore to merge', () => {
        const state = seedState()
        const arrayKeys = (Object.keys(state) as (keyof AppState)[])
            .filter((key) => Array.isArray(state[key]))
            .sort()

        expect([...COLLECTION_KEYS].sort()).toEqual(arrayKeys)
    })
})
