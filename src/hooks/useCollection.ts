import { useCallback, useSyncExternalStore } from 'react'

import type { CollectionKey, Database } from '@/lib/schema'
import { collection, getCollection, getDatabase, subscribe } from '@/lib/store'

/**
 * Ponte entre o store e o React.
 *
 * `getCollection` devolve sempre a mesma referência entre escritas, que é
 * exatamente o contrato de `useSyncExternalStore` — sem isso o React entraria
 * em laço de renderização.
 */

/** Assina uma coleção do banco. */
export function useCollection<K extends CollectionKey>(key: K): Database[K] {
  return useSyncExternalStore(
    subscribe,
    useCallback(() => getCollection(key), [key]),
    useCallback(() => getCollection(key), [key]),
  )
}

/** Assina o banco inteiro. Use apenas em telas que cruzam muitas coleções. */
export function useDatabase(): Database {
  return useSyncExternalStore(subscribe, getDatabase, getDatabase)
}

type Store<K extends CollectionKey> = ReturnType<typeof collection<K>>

/**
 * Combina a lista reativa com as operações de escrita da coleção.
 * É a base de todos os hooks de entidade (`useLeads`, `useVideos`, …).
 */
export function useEntity<K extends CollectionKey>(store: Store<K>) {
  type Item = Database[K][number]
  const items = useCollection(store.key)

  const byId = useCallback(
    (id: string | null | undefined): Item | undefined => {
      if (!id) return undefined
      return (items as { id: string }[]).find((item) => item.id === id) as Item | undefined
    },
    [items],
  )

  return {
    items,
    byId,
    create: store.create,
    createMany: store.createMany,
    update: store.update,
    remove: store.remove,
    removeWhere: store.removeWhere,
  }
}
