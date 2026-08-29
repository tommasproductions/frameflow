import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Junta classes condicionais e resolve conflitos do Tailwind. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/* -------------------------------------------------------------------------- */
/*                                    IDs                                     */
/* -------------------------------------------------------------------------- */

/**
 * Gera um id opaco e ordenavel por tempo (prefixo em base36 do timestamp).
 * Suficiente para o MVP em localStorage; ao migrar para banco, trocar por uuid.
 */
export function generateId(prefix = ''): string {
  const time = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  const id = `${time}${rand}`
  return prefix ? `${prefix}_${id}` : id
}

/* -------------------------------------------------------------------------- */
/*                                  Numeros                                   */
/* -------------------------------------------------------------------------- */

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const decimal = new Intl.NumberFormat('pt-BR')

/** R$ 3.200,00 — ou R$ 3,2 mil quando `compact`. */
export function formatCurrency(value: number | null | undefined, compact = false): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return compact ? brlCompact.format(value) : brl.format(value)
}

/** 1.234 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return decimal.format(value)
}

/** 82,2% */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`
}

/** 6h / 6,5h */
export function formatHours(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`
}

/** 12:34 a partir de segundos. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Aplica `value` a um formato de MetricCard. */
export type MetricFormat = 'currency' | 'number' | 'percentage' | 'hours'

export function formatMetric(value: number | null | undefined, format: MetricFormat): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value)
    case 'percentage':
      return formatPercent(value)
    case 'hours':
      return formatHours(value)
    default:
      return formatNumber(value)
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Datas                                    */
/* -------------------------------------------------------------------------- */

/**
 * Converte `YYYY-MM-DD` (ou ISO completo) em Date no fuso local, sem o
 * deslocamento de um dia que `new Date('2026-08-26')` causa (UTC).
 */
export function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const dayOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (dayOnly) {
    return new Date(Number(dayOnly[1]), Number(dayOnly[2]) - 1, Number(dayOnly[3]))
  }
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/** `YYYY-MM-DD` de um Date, no fuso local. */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Hoje como `YYYY-MM-DD`. */
export function today(): string {
  return toISODate(new Date())
}

/** Instante atual como ISO completo (para createdAt/updatedAt). */
export function now(): string {
  return new Date().toISOString()
}

/** 26/08/2026 */
export function formatDate(iso: string | null | undefined): string {
  const d = parseDate(iso)
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR')
}

/** 26/08 */
export function formatDateShort(iso: string | null | undefined): string {
  const d = parseDate(iso)
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/** 26 ago 2026 */
export function formatDateLong(iso: string | null | undefined): string {
  const d = parseDate(iso)
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** ago/2026 */
export function formatMonthLabel(iso: string | null | undefined): string {
  const d = parseDate(iso)
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('. de ', '/')
}

/** 26/08/2026 14:32 */
export function formatDateTime(iso: string | null | undefined): string {
  const d = parseDate(iso)
  if (!d) return '—'
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

/**
 * Dias entre hoje e a data: negativo = passado, 0 = hoje, positivo = futuro.
 * Compara apenas o dia, ignorando horas.
 */
export function daysUntil(iso: string | null | undefined, from = new Date()): number | null {
  const target = parseDate(iso)
  if (!target) return null
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/** "hoje", "amanha", "em 3 dias", "ha 2 dias". */
export function formatRelativeDay(iso: string | null | undefined): string {
  const diff = daysUntil(iso)
  if (diff === null) return '—'
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'amanha'
  if (diff === -1) return 'ontem'
  if (diff > 1) return `em ${diff} dias`
  return `ha ${Math.abs(diff)} dias`
}

/**
 * Rotulo de prazo, com a informacao de atraso separada para colorir o texto:
 * "hoje", "em 3 dias", "venceu ontem", "5 dias de atraso".
 *
 * `settled` marca o item como encerrado — video entregue, projeto concluido,
 * tarefa feita, pagamento recebido. Ai o prazo vira so uma data: cobrar atraso
 * de algo que ja acabou e ruido, e pinta a tela de vermelho sem motivo.
 */
export function deadlineLabel(
  iso: string | null | undefined,
  settled = false,
): {
  text: string
  overdue: boolean
} {
  const diff = daysUntil(iso)
  if (diff === null) return { text: 'sem prazo', overdue: false }
  if (settled) return { text: formatDate(iso), overdue: false }
  if (diff === 0) return { text: 'hoje', overdue: false }
  if (diff === 1) return { text: 'amanhã', overdue: false }
  if (diff > 1) return { text: `em ${diff} dias`, overdue: false }
  if (diff === -1) return { text: 'venceu ontem', overdue: true }
  return { text: `${Math.abs(diff)} dias de atraso`, overdue: true }
}

/** A data e anterior a hoje? */
export function isPast(iso: string | null | undefined): boolean {
  const diff = daysUntil(iso)
  return diff !== null && diff < 0
}

/** A data e hoje? */
export function isToday(iso: string | null | undefined): boolean {
  return daysUntil(iso) === 0
}

/** A data cai dentro do intervalo (inclusivo nas pontas)? */
export function isWithinRange(iso: string | null | undefined, from: string, to: string): boolean {
  const d = parseDate(iso)
  const a = parseDate(from)
  const b = parseDate(to)
  if (!d || !a || !b) return false
  return d.getTime() >= a.getTime() && d.getTime() <= b.getTime()
}

/** Primeiro e ultimo dia do mes de `reference`, como `YYYY-MM-DD`. */
export function monthRange(reference: Date | string = new Date()): { from: string; to: string } {
  const d = typeof reference === 'string' ? (parseDate(reference) ?? new Date()) : reference
  const from = new Date(d.getFullYear(), d.getMonth(), 1)
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return { from: toISODate(from), to: toISODate(to) }
}

/** Mesmo mes e ano? Aceita `YYYY-MM-DD` ou ISO completo. */
export function isSameMonth(iso: string | null | undefined, reference: Date): boolean {
  const d = parseDate(iso)
  if (!d) return false
  return d.getFullYear() === reference.getFullYear() && d.getMonth() === reference.getMonth()
}

/** Os N meses terminando em `reference` (inclusivo), do mais antigo ao mais recente. */
export function lastMonths(count: number, reference = new Date()): Date[] {
  const months: Date[] = []
  for (let i = count - 1; i >= 0; i--) {
    months.push(new Date(reference.getFullYear(), reference.getMonth() - i, 1))
  }
  return months
}

/* -------------------------------------------------------------------------- */
/*                                   Texto                                    */
/* -------------------------------------------------------------------------- */

/** Iniciais para avatares: "Joao Silva" -> "JS". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Corta preservando palavras inteiras quando possivel. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max).trimEnd()}...`
}

/** Marcas diacriticas combinantes, separadas pelo `normalize('NFD')` acima. */
const COMBINING_MARKS = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, 'g')

/** Normaliza para busca: minusculas, sem acentos. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
}

/** Busca tolerante a acentos e maiusculas. */
export function matchesQuery(haystack: string | null | undefined, query: string): boolean {
  if (!query) return true
  if (!haystack) return false
  return normalize(haystack).includes(normalize(query))
}

/* -------------------------------------------------------------------------- */
/*                                  Colecoes                                  */
/* -------------------------------------------------------------------------- */

/** Agrupa por uma chave derivada. */
export function groupBy<T, K extends string | number>(
  items: T[],
  key: (item: T) => K,
): Record<K, T[]> {
  const out = {} as Record<K, T[]>
  for (const item of items) {
    const k = key(item)
    ;(out[k] ??= []).push(item)
  }
  return out
}

/** Soma uma projecao numerica. */
export function sumBy<T>(items: T[], value: (item: T) => number | null | undefined): number {
  return items.reduce((acc, item) => acc + (value(item) ?? 0), 0)
}

/** Ordena por uma chave, sem mutar o array de origem. */
export function sortBy<T>(
  items: T[],
  key: (item: T) => string | number | null | undefined,
  direction: 'asc' | 'desc' = 'asc',
): T[] {
  const factor = direction === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    const av = key(a)
    const bv = key(b)
    if (av === bv) return 0
    if (av === null || av === undefined) return 1
    if (bv === null || bv === undefined) return -1
    return av < bv ? -factor : factor
  })
}

/** Indexa por id para lookups O(1). */
export function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]))
}
