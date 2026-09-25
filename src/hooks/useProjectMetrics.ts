import { useMemo } from 'react'

import { useExpenses } from '@/hooks/useExpenses'
import { usePayments } from '@/hooks/usePayments'
import { useTasks } from '@/hooks/useTasks'
import { useVideos } from '@/hooks/useVideos'
import { financialSummary, overdueVideos, profitPerHour } from '@/lib/calculations'
import { VIDEO_CLOSED_STATUSES } from '@/lib/constants'
import { sumBy } from '@/lib/utils'
import {
  TaskStatus,
  VideoStatus,
  type Expense,
  type Payment,
  type Task,
  type Video,
} from '@/types'

/**
 * Números consolidados de um projeto.
 *
 * `produced` é o que o projeto vale: a soma do preço dos seus vídeos. É dele
 * que saem lucro e margem. `billed` é quanto disso já virou recebimento
 * lançado, e a diferença entre os dois (`notBilled`) é o que falta cobrar —
 * a pergunta que todo projeto entregue faz.
 */
export interface ProjectMetrics {
  /** Soma do preço dos vídeos do projeto. */
  produced: number
  /** Soma do preço dos vídeos já entregues. */
  deliveredValue: number
  billed: number
  notBilled: number
  received: number
  receivable: number
  overdue: number
  /** Custo direto gravado nos vídeos. */
  videoCost: number
  /** Custo total: o dos vídeos mais os lançamentos do projeto. */
  expenses: number
  profit: number
  margin: number
  videoCount: number
  deliveredCount: number
  inProductionCount: number
  overdueCount: number
  /** Percentual de vídeos aprovados ou entregues — 0 a 100. */
  progress: number
  hoursEstimated: number
  hoursWorked: number
  profitPerHour: number | null
  taskCount: number
  openTaskCount: number
}

export const EMPTY_PROJECT_METRICS: ProjectMetrics = {
  produced: 0,
  deliveredValue: 0,
  billed: 0,
  notBilled: 0,
  received: 0,
  receivable: 0,
  overdue: 0,
  videoCost: 0,
  expenses: 0,
  profit: 0,
  margin: 0,
  videoCount: 0,
  deliveredCount: 0,
  inProductionCount: 0,
  overdueCount: 0,
  progress: 0,
  hoursEstimated: 0,
  hoursWorked: 0,
  profitPerHour: null,
  taskCount: 0,
  openTaskCount: 0,
}

function computeFor(
  projectId: string,
  payments: Payment[],
  expenses: Expense[],
  videos: Video[],
  tasks: Task[],
): ProjectMetrics {
  const summary = financialSummary(payments, expenses, videos, { projectId })
  const projectVideos = videos.filter((video) => video.projectId === projectId)
  const projectTasks = tasks.filter((task) => task.projectId === projectId)
  const delivered = projectVideos.filter((v) => VIDEO_CLOSED_STATUSES.includes(v.status)).length
  const hoursWorked = sumBy(projectVideos, (video) => video.workedHours)

  return {
    produced: summary.produced,
    // Estritamente `delivered`, não "aprovado ou entregue": é a mesma régua da
    // receita do mês, e duas definições de "entregue" dariam dois números
    // diferentes para a mesma palavra na mesma tela.
    deliveredValue: sumBy(
      projectVideos.filter((v) => v.status === VideoStatus.DELIVERED),
      (video) => video.value,
    ),
    billed: summary.billed,
    notBilled: summary.notBilled,
    received: summary.received,
    receivable: summary.receivable,
    overdue: summary.overdue,
    videoCost: summary.videoCost,
    expenses: summary.expenses,
    profit: summary.profit,
    margin: summary.margin,
    videoCount: projectVideos.length,
    deliveredCount: delivered,
    inProductionCount: projectVideos.length - delivered,
    overdueCount: overdueVideos(projectVideos).length,
    progress: projectVideos.length ? (delivered / projectVideos.length) * 100 : 0,
    hoursEstimated: sumBy(projectVideos, (video) => video.estimatedHours),
    hoursWorked,
    profitPerHour: profitPerHour(summary.profit, hoursWorked),
    taskCount: projectTasks.length,
    openTaskCount: projectTasks.filter((task) => task.status !== TaskStatus.DONE).length,
  }
}

/** Métricas de todos os projetos de uma vez, para listas e ordenação. */
export function useAllProjectMetrics(): Map<string, ProjectMetrics> {
  const { payments } = usePayments()
  const { expenses } = useExpenses()
  const { videos } = useVideos()
  const { tasks } = useTasks()

  return useMemo(() => {
    const ids = new Set<string>([
      ...videos.map((v) => v.projectId),
      ...payments.map((p) => p.projectId).filter((id): id is string => Boolean(id)),
      ...expenses.map((e) => e.projectId).filter((id): id is string => Boolean(id)),
      ...tasks.map((t) => t.projectId).filter((id): id is string => Boolean(id)),
    ])

    const map = new Map<string, ProjectMetrics>()
    for (const id of ids) map.set(id, computeFor(id, payments, expenses, videos, tasks))
    return map
  }, [payments, expenses, videos, tasks])
}

/** Métricas de um projeto. Devolve zeros para um projeto ainda sem movimento. */
export function useProjectMetrics(projectId: string | undefined): ProjectMetrics {
  const all = useAllProjectMetrics()
  if (!projectId) return EMPTY_PROJECT_METRICS
  return all.get(projectId) ?? EMPTY_PROJECT_METRICS
}
