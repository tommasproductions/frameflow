import { useEntity } from '@/hooks/useCollection'
import { expensesStore } from '@/lib/store'

/** Custos lançados. */
export function useExpenses() {
  const { items, ...operations } = useEntity(expensesStore)
  return { expenses: items, ...operations }
}
