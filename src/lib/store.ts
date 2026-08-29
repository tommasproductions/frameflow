import {
  EMPTY_DATABASE,
  SCHEMA_VERSION,
  STORAGE_KEY,
  type CollectionKey,
  type Database,
} from '@/lib/schema'
import { buildSeedDatabase } from '@/lib/seedData'
import { generateId, now } from '@/lib/utils'

/**
 * Camada de persistência do MVP.
 *
 * Tudo vive em uma única chave do localStorage, lida uma vez e mantida em
 * memória. As telas consomem via `useSyncExternalStore`, então cada escrita
 * substitui a referência do banco e notifica os assinantes.
 *
 * A forma do banco é deliberadamente relacional — coleções planas ligadas por
 * id — para que a migração a um banco real seja uma troca deste arquivo, não
 * uma reescrita das telas.
 */

export { STORAGE_KEY, SCHEMA_VERSION }
export type { CollectionKey, Database }

/** Registro genérico: tudo que o store gerencia tem id e data de criação. */
interface StoredRecord {
  id: string
  createdAt: string
}

/* -------------------------------------------------------------------------- */
/*                            Leitura e normalização                          */
/* -------------------------------------------------------------------------- */

/**
 * Garante que toda coleção exista mesmo se o JSON gravado for de uma versão
 * anterior do schema — evita telas quebrarem por uma chave ausente.
 */
function normalize(raw: unknown): Database {
  const input = (raw ?? {}) as Partial<Database>
  const out = { ...EMPTY_DATABASE } as Database
  for (const key of Object.keys(EMPTY_DATABASE) as (keyof Database)[]) {
    if (key === 'meta') continue
    const value = input[key]
    out[key] = (Array.isArray(value) ? value : []) as never
  }
  out.meta = {
    version: input.meta?.version ?? SCHEMA_VERSION,
    seededAt: input.meta?.seededAt ?? null,
    updatedAt: input.meta?.updatedAt ?? '',
  }
  return out
}

function readFromStorage(): Database | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return normalize(JSON.parse(raw))
  } catch (error) {
    console.error('[FrameFlow] Banco local corrompido; recriando a partir do seed.', error)
    return null
  }
}

function writeToStorage(db: Database): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch (error) {
    console.error('[FrameFlow] Não foi possível gravar no localStorage.', error)
  }
}

/* -------------------------------------------------------------------------- */
/*                              Estado em memória                             */
/* -------------------------------------------------------------------------- */

let cache: Database = (() => {
  const stored = readFromStorage()
  if (stored) return stored
  const seeded = buildSeedDatabase()
  writeToStorage(seeded)
  return seeded
})()

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

/** Assina mudanças do banco. Retorna a função de cancelamento. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Snapshot atual. A referência só muda quando há escrita. */
export function getDatabase(): Database {
  return cache
}

/** Snapshot de uma coleção. Referência estável entre escritas. */
export function getCollection<K extends CollectionKey>(key: K): Database[K] {
  return cache[key]
}

/** Substitui o banco inteiro, persiste e notifica. */
export function setDatabase(next: Database): void {
  cache = { ...next, meta: { ...next.meta, updatedAt: now() } }
  writeToStorage(cache)
  emit()
}

/** Aplica uma transformação imutável ao banco. */
export function mutate(recipe: (db: Database) => Database): void {
  setDatabase(recipe(cache))
}

/** Substitui uma coleção inteira. */
export function setCollection<K extends CollectionKey>(key: K, items: Database[K]): void {
  mutate((db) => ({ ...db, [key]: items }))
}

// Mantém abas abertas em sincronia: o evento `storage` só dispara nas outras.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    const incoming = readFromStorage()
    if (!incoming) return
    cache = incoming
    emit()
  })
}

/* -------------------------------------------------------------------------- */
/*                              CRUD por coleção                              */
/* -------------------------------------------------------------------------- */

/** Payload de criação: o store preenche id, createdAt e updatedAt. */
export type Draft<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }

/**
 * Fábrica de operações CRUD tipadas para uma coleção.
 *
 * `idPrefix` deixa os ids legíveis durante o desenvolvimento (`lead_m8x2…`) sem
 * que nenhuma lógica dependa desse formato.
 */
export function collection<K extends CollectionKey>(key: K, idPrefix: string) {
  type Item = Database[K][number]

  function all(): Item[] {
    return cache[key] as Item[]
  }

  function byId(id: string | null | undefined): Item | undefined {
    if (!id) return undefined
    return all().find((item) => (item as StoredRecord).id === id)
  }

  function build(draft: Draft<Item>, timestamp: string): Item {
    return {
      ...(draft as object),
      id: draft.id ?? generateId(idPrefix),
      createdAt: timestamp,
      updatedAt: timestamp,
    } as Item
  }

  function create(draft: Draft<Item>): Item {
    const item = build(draft, now())
    mutate((db) => ({ ...db, [key]: [...(db[key] as Item[]), item] }))
    return item
  }

  /** Cria vários de uma vez — uma única escrita e uma única notificação. */
  function createMany(drafts: Draft<Item>[]): Item[] {
    const timestamp = now()
    const items = drafts.map((draft) => build(draft, timestamp))
    mutate((db) => ({ ...db, [key]: [...(db[key] as Item[]), ...items] }))
    return items
  }

  function update(id: string, patch: Partial<Item>): Item | undefined {
    let updated: Item | undefined
    mutate((db) => ({
      ...db,
      [key]: (db[key] as Item[]).map((item) => {
        if ((item as StoredRecord).id !== id) return item
        updated = { ...item, ...patch, id, updatedAt: now() } as Item
        return updated
      }),
    }))
    return updated
  }

  function remove(id: string): void {
    mutate((db) => ({
      ...db,
      [key]: (db[key] as Item[]).filter((item) => (item as StoredRecord).id !== id),
    }))
  }

  /** Remove todos os registros que satisfazem o predicado. */
  function removeWhere(predicate: (item: Item) => boolean): void {
    mutate((db) => ({
      ...db,
      [key]: (db[key] as Item[]).filter((item) => !predicate(item)),
    }))
  }

  return { key, all, byId, create, createMany, update, remove, removeWhere }
}

export const leadsStore = collection('leads', 'lead')
export const leadActivitiesStore = collection('leadActivities', 'lact')
export const clientsStore = collection('clients', 'cli')
export const projectsStore = collection('projects', 'proj')
export const videosStore = collection('videos', 'vid')
export const videoRevisionsStore = collection('videoRevisions', 'rev')
export const tasksStore = collection('tasks', 'task')
export const paymentsStore = collection('payments', 'pay')
export const expensesStore = collection('expenses', 'exp')
export const contractsStore = collection('contracts', 'ctr')
export const calendarEventsStore = collection('calendarEvents', 'evt')
export const activityLogStore = collection('activityLog', 'log')
export const notificationsStore = collection('notifications', 'ntf')

/* -------------------------------------------------------------------------- */
/*                            Manutenção dos dados                            */
/* -------------------------------------------------------------------------- */

/** Recarrega os dados demonstrativos, descartando o que existir. */
export function resetToSeed(): void {
  setDatabase(buildSeedDatabase())
}

/** Esvazia o banco, mantendo o schema. */
export function clearDatabase(): void {
  setDatabase(structuredClone({ ...EMPTY_DATABASE }))
}

/** JSON formatado do banco, para backup manual. */
export function exportDatabase(): string {
  return JSON.stringify(cache, null, 2)
}

/** Restaura um backup. Lança se o JSON for inválido. */
export function importDatabase(json: string): void {
  setDatabase(normalize(JSON.parse(json)))
}

/** Contagem por coleção — usada pela tela de configurações. */
export function databaseStats(): { key: CollectionKey; count: number }[] {
  return (Object.keys(EMPTY_DATABASE) as (keyof Database)[])
    .filter((key): key is CollectionKey => key !== 'meta')
    .map((key) => ({ key, count: cache[key].length }))
}
