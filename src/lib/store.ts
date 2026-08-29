import { enqueue } from '@/lib/persistence'
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
 * Estado da aplicação em memória, espelhando o banco do usuário.
 *
 * O Supabase é a fonte da verdade. Este módulo mantém uma cópia em memória para
 * que as telas leiam de forma síncrona — `useSyncExternalStore` precisa disso — e
 * empurra cada escrita para o banco através de `persistence`.
 *
 * Nada é gravado no localStorage. Numa aplicação vendida a vários usuários, um
 * cache local é passivo de vazar dados de uma conta para a seguinte que abrir o
 * mesmo navegador. O custo é uma busca no carregamento; o benefício é não ter
 * duas fontes de verdade nem lógica de conflito.
 *
 * A forma relacional — coleções planas ligadas por id — é a mesma de antes, o
 * que permitiu trocar a persistência sem tocar nas telas.
 */

export { STORAGE_KEY, SCHEMA_VERSION }
export type { CollectionKey, Database }

/** Registro genérico: tudo que o store gerencia tem id e data de criação. */
interface StoredRecord {
  id: string
  createdAt: string
}

/* -------------------------------------------------------------------------- */
/*                              Estado em memória                             */
/* -------------------------------------------------------------------------- */

/*
 * Remove o banco da versão anterior, que guardava tudo em uma chave do
 * localStorage. Nada mais o lê, mas deixá-lo é o próprio risco descrito acima:
 * dados de uma conta parados no navegador que a próxima pessoa vai usar.
 * Uma linha resolve, e some sozinha quando ninguém mais tiver o resquício.
 */
if (typeof window !== 'undefined') {
  window.localStorage.removeItem(STORAGE_KEY)
}

let cache: Database = structuredClone(EMPTY_DATABASE)

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

/**
 * Instala o banco vindo do servidor, sem devolvê-lo ao servidor.
 *
 * Chamado no login. Diferente de `setDatabase` justamente por não enfileirar
 * escrita: reenviar o que acabou de ser lido seria trabalho inútil e uma
 * chance a mais de corromper dados bons.
 */
export function installDatabase(db: Database): void {
  cache = db
  emit()
}

/** Esvazia a memória ao encerrar a sessão. Não toca no banco. */
export function clearSession(): void {
  cache = structuredClone(EMPTY_DATABASE)
  emit()
}

/** Substitui o banco inteiro — local e remoto. */
export function setDatabase(next: Database): void {
  cache = { ...next, meta: { ...next.meta, updatedAt: now() } }
  emit()
  enqueue({ kind: 'replaceAll', db: cache })
}

/** Aplica uma transformação imutável, sem sincronizar. Uso interno. */
function mutateLocal(recipe: (db: Database) => Database): void {
  cache = recipe(cache)
  emit()
}

/* -------------------------------------------------------------------------- */
/*                              CRUD por coleção                              */
/* -------------------------------------------------------------------------- */

/** Payload de criação: o store preenche id, createdAt e updatedAt. */
export type Draft<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }

/**
 * Fábrica de operações CRUD tipadas para uma coleção.
 *
 * Cada operação faz duas coisas: altera o cache e notifica (a tela responde na
 * hora) e enfileira a escrita correspondente (o banco alcança depois). É o que
 * mantém a interface instantânea sem abrir mão de persistir.
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
    mutateLocal((db) => ({ ...db, [key]: [...(db[key] as Item[]), item] }))
    enqueue({ kind: 'upsert', key, rows: [item as object] })
    return item
  }

  /** Cria vários de uma vez — uma única notificação e uma única ida ao banco. */
  function createMany(drafts: Draft<Item>[]): Item[] {
    const timestamp = now()
    const items = drafts.map((draft) => build(draft, timestamp))
    mutateLocal((db) => ({ ...db, [key]: [...(db[key] as Item[]), ...items] }))
    enqueue({ kind: 'upsert', key, rows: items as object[] })
    return items
  }

  function update(id: string, patch: Partial<Item>): Item | undefined {
    let updated: Item | undefined
    mutateLocal((db) => ({
      ...db,
      [key]: (db[key] as Item[]).map((item) => {
        if ((item as StoredRecord).id !== id) return item
        updated = { ...item, ...patch, id, updatedAt: now() } as Item
        return updated
      }),
    }))
    if (updated) {
      enqueue({ kind: 'upsert', key, rows: [updated as object] })
    }
    return updated
  }

  function remove(id: string): void {
    mutateLocal((db) => ({
      ...db,
      [key]: (db[key] as Item[]).filter((item) => (item as StoredRecord).id !== id),
    }))
    enqueue({ kind: 'delete', key, ids: [id] })
  }

  /** Remove todos os registros que satisfazem o predicado. */
  function removeWhere(predicate: (item: Item) => boolean): void {
    const doomed = all().filter(predicate).map((item) => (item as StoredRecord).id)
    if (doomed.length === 0) return

    mutateLocal((db) => ({
      ...db,
      [key]: (db[key] as Item[]).filter((item) => !predicate(item)),
    }))
    enqueue({ kind: 'delete', key, ids: doomed })
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

/**
 * Carrega os dados demonstrativos, descartando o que existir.
 *
 * Deixou de rodar sozinho: conta nova nasce vazia, como deve ser. Isto agora é
 * um botão, útil para conhecer o sistema ou demonstrá-lo a alguém.
 */
export function resetToSeed(): void {
  setDatabase(buildSeedDatabase())
}

/** Esvazia o banco do usuário, mantendo o schema. */
export function clearDatabase(): void {
  setDatabase(structuredClone(EMPTY_DATABASE))
}

/** JSON formatado do banco, para backup manual. */
export function exportDatabase(): string {
  return JSON.stringify(cache, null, 2)
}

/**
 * Garante que toda coleção exista mesmo se o JSON for de uma versão anterior
 * do schema — evita telas quebrarem por uma chave ausente.
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
