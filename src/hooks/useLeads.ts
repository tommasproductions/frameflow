import { useEntity } from '@/hooks/useCollection'
import { leadsStore } from '@/lib/store'

/** Leads do funil comercial. */
export function useLeads() {
  const { items, ...operations } = useEntity(leadsStore)
  return { leads: items, ...operations }
}
