import { useEntity } from '@/hooks/useCollection'
import { activityLogStore } from '@/lib/store'

/** Histórico de alterações do sistema. */
export function useActivityLog() {
  const { items, ...operations } = useEntity(activityLogStore)
  return { entries: items, ...operations }
}
