import { useSyncExternalStore } from 'react'

import { getSyncError, getSyncStatus, subscribeSyncStatus, type SyncStatus } from '@/lib/persistence'

/** Estado da fila de sincronização, reativo. */
export function useSyncStatus(): { status: SyncStatus; error: string | null } {
  const status = useSyncExternalStore(subscribeSyncStatus, getSyncStatus, getSyncStatus)
  const error = useSyncExternalStore(subscribeSyncStatus, getSyncError, getSyncError)
  return { status, error }
}
