import { useMemo } from 'react'

import { useContracts } from '@/hooks/useContracts'
import { useExpenses } from '@/hooks/useExpenses'
import { usePayments } from '@/hooks/usePayments'
import { useProjects } from '@/hooks/useProjects'
import { useVideos } from '@/hooks/useVideos'
import {
  averageTicket,
  financialSummary,
  monthlyRecurringRevenue,
  profitPerHour,
} from '@/lib/calculations'
import { VIDEO_CLOSED_STATUSES } from '@/lib/constants'
import { sumBy } from '@/lib/utils'
import { ProjectStatus, type Contract, type Expense, type Payment, type Project, type Video } from '@/types'

/**
 * Números consolidados de um cliente.
 *
 * Rentabilidade usa a receita **contratada** (tudo que não foi cancelado), não
 * a recebida: a pergunta que a carteira responde é "quanto este cliente vale e
 * quanto sobra", não "quanto entrou no caixa este mês".
 */
export interface ClientMetrics {
  contracted: number
  received: number
  receivable: number
  overdue: number
  expenses: number
  profit: number
  margin: number
  projectCount: number
  activeProjectCount: number
  videoCount: number
  deliveredVideoCount: number
  hoursEstimated: number
  hoursWorked: number
  profitPerHour: number | null
  averageTicket: number
  /** Recorrência mensal dos contratos ativos deste cliente. */
  mrr: number
}

export const EMPTY_CLIENT_METRICS: ClientMetrics = {
  contracted: 0,
  received: 0,
  receivable: 0,
  overdue: 0,
  expenses: 0,
  profit: 0,
  margin: 0,
  projectCount: 0,
  activeProjectCount: 0,
  videoCount: 0,
  deliveredVideoCount: 0,
  hoursEstimated: 0,
  hoursWorked: 0,
  profitPerHour: null,
  averageTicket: 0,
  mrr: 0,
}

function computeFor(
  clientId: string,
  payments: Payment[],
  expenses: Expense[],
  projects: Project[],
  videos: Video[],
  contracts: Contract[],
): ClientMetrics {
  const summary = financialSummary(payments, expenses, { clientId })
  const clientProjects = projects.filter((project) => project.clientId === clientId)
  const clientVideos = videos.filter((video) => video.clientId === clientId)
  const hoursWorked = sumBy(clientVideos, (video) => video.workedHours)

  return {
    ...summary,
    projectCount: clientProjects.length,
    activeProjectCount: clientProjects.filter((p) => p.status === ProjectStatus.ACTIVE).length,
    videoCount: clientVideos.length,
    deliveredVideoCount: clientVideos.filter((v) => VIDEO_CLOSED_STATUSES.includes(v.status)).length,
    hoursEstimated: sumBy(clientVideos, (video) => video.estimatedHours),
    hoursWorked,
    profitPerHour: profitPerHour(summary.profit, hoursWorked),
    averageTicket: averageTicket(summary.contracted, clientProjects.length),
    mrr: monthlyRecurringRevenue(contracts.filter((c) => c.clientId === clientId)),
  }
}

/**
 * Métricas de todos os clientes de uma vez.
 *
 * Calcular em bloco evita percorrer pagamentos e custos uma vez por linha da
 * tabela, e permite ordenar a carteira por lucro ou margem.
 */
export function useAllClientMetrics(): Map<string, ClientMetrics> {
  const { payments } = usePayments()
  const { expenses } = useExpenses()
  const { projects } = useProjects()
  const { videos } = useVideos()
  const { contracts } = useContracts()

  return useMemo(() => {
    const ids = new Set<string>([
      ...projects.map((p) => p.clientId),
      ...videos.map((v) => v.clientId),
      ...payments.map((p) => p.clientId).filter((id): id is string => Boolean(id)),
      ...expenses.map((e) => e.clientId).filter((id): id is string => Boolean(id)),
      ...contracts.map((c) => c.clientId),
    ])

    const map = new Map<string, ClientMetrics>()
    for (const id of ids) {
      map.set(id, computeFor(id, payments, expenses, projects, videos, contracts))
    }
    return map
  }, [payments, expenses, projects, videos, contracts])
}

/** Métricas de um cliente. Devolve zeros para quem ainda não tem movimento. */
export function useClientMetrics(clientId: string | undefined): ClientMetrics {
  const all = useAllClientMetrics()
  if (!clientId) return EMPTY_CLIENT_METRICS
  return all.get(clientId) ?? EMPTY_CLIENT_METRICS
}
