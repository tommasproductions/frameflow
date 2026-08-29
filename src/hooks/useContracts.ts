import { useEntity } from '@/hooks/useCollection'
import { contractsStore } from '@/lib/store'

/** Contratos e recorrência. */
export function useContracts() {
  const { items, ...operations } = useEntity(contractsStore)
  return { contracts: items, ...operations }
}
