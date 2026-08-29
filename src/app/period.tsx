import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import { lastMonths, monthRange } from '@/lib/utils'
import type { DateRange } from '@/types'

/**
 * Período de referência do sistema, escolhido na topbar.
 *
 * Dashboard, financeiro e relatórios leem daqui, então trocar o mês na topbar
 * reposiciona todas as telas de uma vez.
 */

interface PeriodValue {
  /** Primeiro dia do mês selecionado. */
  month: Date
  /** Intervalo completo do mês, pronto para os filtros de cálculo. */
  range: DateRange
  /** Mesmo intervalo, um mês antes — base das variações dos MetricCards. */
  previousRange: DateRange
  label: string
  setMonth: (month: Date) => void
  /** Últimos meses até o selecionado, para as séries dos gráficos. */
  recentMonths: (count: number) => Date[]
}

const PeriodContext = createContext<PeriodValue | null>(null)

/** Data em que o cenário demonstrativo está ancorado. */
const DEFAULT_MONTH = new Date(2026, 7, 1)

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [month, setMonthState] = useState(() => startOfMonth(DEFAULT_MONTH))

  const setMonth = useCallback((next: Date) => setMonthState(startOfMonth(next)), [])

  const value = useMemo<PeriodValue>(() => {
    const previous = new Date(month.getFullYear(), month.getMonth() - 1, 1)
    return {
      month,
      range: monthRange(month),
      previousRange: monthRange(previous),
      label: month
        .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        .replace(/^./, (c) => c.toUpperCase()),
      setMonth,
      recentMonths: (count: number) => lastMonths(count, month),
    }
  }, [month, setMonth])

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
}

export function usePeriod(): PeriodValue {
  const value = useContext(PeriodContext)
  if (!value) throw new Error('usePeriod precisa estar dentro de <PeriodProvider>.')
  return value
}
