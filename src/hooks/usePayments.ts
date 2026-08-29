import { useEntity } from '@/hooks/useCollection'
import { paymentsStore } from '@/lib/store'

/** Receitas — recebidas e a receber. */
export function usePayments() {
  const { items, ...operations } = useEntity(paymentsStore)
  return { payments: items, ...operations }
}
