import { EMPTY_DATABASE, type CollectionKey, type Database } from '@/lib/schema'
import { fromRow, supabase, toRow } from '@/lib/supabase'

/**
 * Sincronização com o Supabase.
 *
 * A aplicação lê do cache em memória, de forma síncrona — é o que faz o
 * `useSyncExternalStore` funcionar e o que mantém as telas instantâneas. Este
 * módulo é a ponte: carrega tudo de uma vez no login e empurra cada escrita
 * para o banco em segundo plano.
 *
 * A alternativa seria tornar toda leitura assíncrona, com estado de carga em
 * cada tela. Para o volume de um freelancer — alguns milhares de linhas — o
 * ganho não paga o custo: seriam skeletons em catorze telas para resolver um
 * problema que não existe nessa escala.
 *
 * O preço desta escolha é que a escrita pode falhar depois de a interface já
 * ter mostrado sucesso. Daí existir um estado de sincronização visível: quando
 * algo não sobe, o usuário precisa saber.
 */

/** Chaves de coleção na ordem em que devem ser gravadas. */
const COLLECTIONS = Object.keys(EMPTY_DATABASE).filter(
  (key): key is CollectionKey => key !== 'meta',
) as CollectionKey[]

/**
 * Ordem de inserção que respeita as chaves estrangeiras: um vídeo não pode ser
 * gravado antes do projeto dele. Coleções fora desta lista não têm dependência
 * e vão depois, em qualquer ordem.
 */
const WRITE_ORDER: CollectionKey[] = [
  'clients',
  'leads',
  'leadActivities',
  'projects',
  'videos',
  'videoRevisions',
]

/** `leadActivities` -> `lead_activities`. Espelha os nomes do schema.sql. */
function tableOf(key: CollectionKey): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

function orderedCollections(): CollectionKey[] {
  const rest = COLLECTIONS.filter((key) => !WRITE_ORDER.includes(key))
  return [...WRITE_ORDER, ...rest]
}

/* -------------------------------------------------------------------------- */
/*                            Estado de sincronização                         */
/* -------------------------------------------------------------------------- */

export type SyncStatus = 'offline' | 'loading' | 'synced' | 'saving' | 'error'

let status: SyncStatus = 'offline'
let lastError: string | null = null
const statusListeners = new Set<() => void>()

export function getSyncStatus(): SyncStatus {
  return status
}

export function getSyncError(): string | null {
  return lastError
}

export function subscribeSyncStatus(listener: () => void): () => void {
  statusListeners.add(listener)
  return () => {
    statusListeners.delete(listener)
  }
}

function setStatus(next: SyncStatus, error: string | null = null): void {
  status = next
  lastError = error
  for (const listener of statusListeners) listener()
}

/* -------------------------------------------------------------------------- */
/*                                    Carga                                   */
/* -------------------------------------------------------------------------- */

/** Quantas linhas o PostgREST devolve por página. */
const PAGE_SIZE = 1000

/** Busca uma coleção inteira, paginando — o padrão do PostgREST trunca em 1000. */
async function fetchAll(key: CollectionKey): Promise<unknown[]> {
  const table = tableOf(key)
  const rows: unknown[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data || data.length === 0) break

    rows.push(...data.map((row) => fromRow(row as Record<string, unknown>)))
    if (data.length < PAGE_SIZE) break
  }

  return rows
}

/**
 * Carrega o banco inteiro do usuário autenticado.
 *
 * O RLS já restringe as linhas à conta da sessão, então não há filtro por
 * `user_id` aqui — o banco aplica sozinho, e é justamente por isso que ele é
 * o lugar certo para essa regra.
 */
export async function loadAll(): Promise<Database> {
  setStatus('loading')
  try {
    const entries = await Promise.all(
      COLLECTIONS.map(async (key) => [key, await fetchAll(key)] as const),
    )

    const db = { ...structuredClone(EMPTY_DATABASE) } as Database
    for (const [key, rows] of entries) {
      db[key] = rows as never
    }

    setStatus('synced')
    return db
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    setStatus('error', message)
    throw error
  }
}

/* -------------------------------------------------------------------------- */
/*                                    Fila                                    */
/* -------------------------------------------------------------------------- */

type Operation =
  | { kind: 'upsert'; key: CollectionKey; rows: object[] }
  | { kind: 'delete'; key: CollectionKey; ids: string[] }
  | { kind: 'replaceAll'; db: Database }

const queue: Operation[] = []
let flushing = false
let currentUserId: string | null = null

export function setCurrentUser(userId: string | null): void {
  currentUserId = userId
  if (!userId) {
    queue.length = 0
    setStatus('offline')
  }
}

/**
 * Enfileira uma operação e agenda o envio.
 *
 * A fila é serial de propósito: as operações têm dependência entre si (criar um
 * projeto antes do vídeo que aponta para ele), e paralelizar traria corrida
 * onde hoje há ordem garantida.
 */
export function enqueue(operation: Operation): void {
  if (!currentUserId) return
  queue.push(operation)
  void flush()
}

const MAX_ATTEMPTS = 3

async function runOperation(operation: Operation, userId: string): Promise<void> {
  if (operation.kind === 'upsert') {
    const rows = operation.rows.map((row) => toRow(row, userId))
    const { error } = await supabase.from(tableOf(operation.key)).upsert(rows)
    if (error) throw new Error(`${tableOf(operation.key)}: ${error.message}`)
    return
  }

  if (operation.kind === 'delete') {
    const { error } = await supabase
      .from(tableOf(operation.key))
      .delete()
      .in('id', operation.ids)
    if (error) throw new Error(`${tableOf(operation.key)}: ${error.message}`)
    return
  }

  // replaceAll: usado por recarregar demonstração, apagar tudo e importar
  // backup. Apaga na ordem inversa das dependências e insere na ordem direta.
  const order = orderedCollections()

  for (const key of [...order].reverse()) {
    const { error } = await supabase.from(tableOf(key)).delete().eq('user_id', userId)
    if (error) throw new Error(`limpar ${tableOf(key)}: ${error.message}`)
  }

  for (const key of order) {
    const items = operation.db[key] as unknown as object[]
    if (!items || items.length === 0) continue
    const rows = items.map((item) => toRow(item, userId))
    const { error } = await supabase.from(tableOf(key)).insert(rows)
    if (error) throw new Error(`inserir ${tableOf(key)}: ${error.message}`)
  }
}

async function flush(): Promise<void> {
  if (flushing) return
  flushing = true

  try {
    while (queue.length > 0) {
      const userId = currentUserId
      if (!userId) break

      setStatus('saving')
      const operation = queue[0]
      let attempt = 0

      for (;;) {
        try {
          await runOperation(operation, userId)
          queue.shift()
          break
        } catch (error) {
          attempt += 1
          const message = error instanceof Error ? error.message : String(error)

          if (attempt >= MAX_ATTEMPTS) {
            /*
             * Descartar a operação é a menos ruim das saídas. Mantê-la trava a
             * fila e todas as escritas seguintes; o estado de erro avisa o
             * usuário, e o cache em memória segue correto até o próximo
             * recarregamento da página.
             */
            queue.shift()
            setStatus('error', message)
            console.error('[FrameFlow] Falha ao sincronizar após 3 tentativas.', error)
            break
          }

          await new Promise((resolve) => setTimeout(resolve, 300 * attempt))
        }
      }
    }

    if (status !== 'error' && currentUserId) setStatus('synced')
  } finally {
    flushing = false
  }
}

/** Espera a fila esvaziar. Usada por testes e pelo encerramento de sessão. */
export async function waitForSync(): Promise<void> {
  while (queue.length > 0 || flushing) {
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}
