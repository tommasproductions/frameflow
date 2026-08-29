import { useEntity } from '@/hooks/useCollection'
import { notificationsStore } from '@/lib/store'

/** Notificações persistidas. */
export function useStoredNotifications() {
  const { items, ...operations } = useEntity(notificationsStore)
  return { notifications: items, ...operations }
}
