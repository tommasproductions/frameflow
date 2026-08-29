import { useEntity } from '@/hooks/useCollection'
import { clientsStore } from '@/lib/store'

/** Carteira de clientes. */
export function useClients() {
  const { items, ...operations } = useEntity(clientsStore)
  return { clients: items, ...operations }
}
