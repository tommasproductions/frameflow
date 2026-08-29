import { useEntity } from '@/hooks/useCollection'
import { leadActivitiesStore } from '@/lib/store'

/** Histórico de interações de cada lead. */
export function useLeadActivities() {
  const { items, ...operations } = useEntity(leadActivitiesStore)
  return { activities: items, ...operations }
}
