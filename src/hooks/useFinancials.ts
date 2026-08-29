import { useMemo } from 'react'

import { useExpenses } from '@/hooks/useExpenses'
import { usePayments } from '@/hooks/usePayments'
import {
  cashSummary,
  financialSummary,
  profitPerHour,
  type FinancialSummary,
} from '@/lib/calculations'
import type { DateRange, ScopeFilter } from '@/types'

/**
 * Resumo financeiro reativo de um escopo (cliente, projeto ou vídeo).
 * Sem escopo, devolve os números do negócio inteiro.
 */
export function useFinancials(filters?: ScopeFilter): FinancialSummary {
  const { payments } = usePayments()
  const { expenses } = useExpenses()

  // O filtro chega quase sempre como objeto literal, então uma referência nova
  // a cada render. Serializar dá uma dependência estável para o memo.
  const key = JSON.stringify(filters ?? {})
  return useMemo(() => {
    const scope = JSON.parse(key) as ScopeFilter
    return financialSummary(payments, expenses, scope)
  }, [payments, expenses, key])
}

/** Entradas e saídas com data dentro do período — a leitura de caixa. */
export function useCashFlow({ from, to }: DateRange) {
  const { payments } = usePayments()
  const { expenses } = useExpenses()

  return useMemo(
    () => cashSummary(payments, expenses, { from, to }),
    [payments, expenses, from, to],
  )
}

/** Lucro por hora trabalhada de um escopo, dado o total de horas. */
export function useProfitPerHour(filters: ScopeFilter | undefined, workedHours: number) {
  const summary = useFinancials(filters)
  return profitPerHour(summary.profit, workedHours)
}
