import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase.
 *
 * A chave `anon` é pública por natureza — ela vai no bundle e qualquer um pode
 * lê-la. O que protege os dados não é o segredo da chave, é o Row Level
 * Security: sem sessão autenticada, ela não lê linha nenhuma. A chave que
 * ignora RLS é a `service_role`, e essa nunca pode chegar ao navegador.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. ' +
      'Copie .env.example para .env.local e preencha com os dados do projeto.',
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/* -------------------------------------------------------------------------- */
/*                        Conversão de nomes de coluna                        */
/* -------------------------------------------------------------------------- */

/*
 * O banco usa snake_case, que é a convenção do Postgres; a aplicação usa
 * camelCase, que é a do TypeScript. Converter na fronteira custa duas funções
 * e evita ou colunas entre aspas no SQL, ou nomes estranhos no código.
 *
 * A conversão é rasa de propósito. `checklist` e `file_links` são JSONB cujas
 * chaves internas (`briefingReceived`, `createdAt`) já estão em camelCase e
 * pertencem à aplicação, não ao esquema — descer neles corromperia os dados.
 */

const toSnake = (key: string): string => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
const toCamel = (key: string): string => key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())

/**
 * Instante ISO com fuso — o formato em que o Postgres devolve `timestamptz`.
 * Casa `2026-08-26T09:00:00+00:00` mas não `2026-08-26`, que é uma data pura
 * e precisa continuar exatamente como está.
 */
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:?\d{2}|Z)$/

/**
 * Linha do banco -> objeto da aplicação. Descarta `user_id`, que é interno.
 *
 * Os timestamps são normalizados para o formato do `toISOString()`. O Postgres
 * devolve `+00:00` onde o JavaScript escreve `.000Z`, e várias telas ordenam
 * comparando essas strings direto. Misturar os dois formatos ordena errado:
 * `+` vem antes de `.` na tabela ASCII, então um registro recém-criado cairia
 * depois de outro do mesmo instante vindo do banco.
 */
export function fromRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (key === 'user_id') continue
    out[toCamel(key)] =
      typeof value === 'string' && TIMESTAMP.test(value)
        ? new Date(value).toISOString()
        : value
  }
  return out as T
}

/** Objeto da aplicação -> linha do banco, carimbando o dono. */
export function toRow(entity: object, userId: string): Record<string, unknown> {
  const out: Record<string, unknown> = { user_id: userId }
  for (const [key, value] of Object.entries(entity)) {
    out[toSnake(key)] = value
  }
  return out
}
