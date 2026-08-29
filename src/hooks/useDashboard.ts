import { useMemo } from 'react'

import { usePeriod } from '@/app/period'
import { useClients } from '@/hooks/useClients'
import { useContracts } from '@/hooks/useContracts'
import { useExpenses } from '@/hooks/useExpenses'
import { useLeads } from '@/hooks/useLeads'
import { usePayments } from '@/hooks/usePayments'
import { useProjects } from '@/hooks/useProjects'
import { useTasks } from '@/hooks/useTasks'
import { useVideos } from '@/hooks/useVideos'
import {
  activeProjects,
  cashSummary,
  conversionRate,
  leadsByStage,
  monthlyRecurringRevenue,
  monthlySeries,
  overdueFollowUps,
  overduePayments,
  overdueTasks,
  overdueVideos,
  pipelineValue,
  receivableRevenue,
  videosInProduction,
  type MonthlyPoint,
} from '@/lib/calculations'
import { DASHBOARD_MONTHS, VIDEO_STATUS_ORDER } from '@/lib/constants'
import { isSameMonth, sortBy } from '@/lib/utils'
import type { Lead, LeadStage, Payment, Task, Video, VideoStatus } from '@/types'

export interface DashboardData {
  /** Caixa do mês selecionado e do mês anterior, para as variações. */
  cash: { received: number; expenses: number; profit: number; margin: number }
  previousCash: { received: number; expenses: number; profit: number; margin: number }
  /** Tudo que está em aberto, independentemente do mês. */
  receivable: number
  overdueAmount: number
  monthlyRecurring: number
  series: MonthlyPoint[]
  counts: {
    newLeads: number
    previousNewLeads: number
    newClients: number
    activeProjects: number
    videosInProduction: number
    overdueVideos: number
    overdueTasks: number
  }
  funnel: Record<LeadStage, number>
  production: Record<VideoStatus, number>
  pipeline: { value: number; conversion: number }
  /** Vídeos ordenados por prazo — vencidos primeiro. */
  upcomingVideos: Video[]
  followUps: Lead[]
  latePayments: Payment[]
  openTasks: Task[]
}

/** Reúne, para o mês selecionado na topbar, tudo o que o dashboard exibe. */
export function useDashboard(): DashboardData {
  const { month, range, previousRange, recentMonths } = usePeriod()
  const { payments } = usePayments()
  const { expenses } = useExpenses()
  const { leads } = useLeads()
  const { clients } = useClients()
  const { projects } = useProjects()
  const { videos } = useVideos()
  const { tasks } = useTasks()
  const { contracts } = useContracts()

  return useMemo(() => {
    const previousMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1)

    const production = Object.fromEntries(
      VIDEO_STATUS_ORDER.map((status) => [status, 0]),
    ) as Record<VideoStatus, number>
    for (const video of videos) production[video.status] += 1

    const late = overduePayments(payments)
    const overdueVideoList = overdueVideos(videos)
    const inProduction = videosInProduction(videos)

    // Vencidos primeiro, depois os próximos: é a ordem em que o editor precisa
    // olhar para a lista de prazos.
    const byDeadline = sortBy(inProduction, (video) => video.deadline ?? '9999-12-31')

    const closedLeads = leads.filter((lead) => lead.stage === 'closed').length

    return {
      cash: cashSummary(payments, expenses, range),
      previousCash: cashSummary(payments, expenses, previousRange),
      receivable: receivableRevenue(payments),
      overdueAmount: late.reduce((acc, payment) => acc + payment.amount, 0),
      monthlyRecurring: monthlyRecurringRevenue(contracts),
      series: monthlySeries(payments, expenses, recentMonths(DASHBOARD_MONTHS)),
      counts: {
        newLeads: leads.filter((lead) => isSameMonth(lead.createdAt, month)).length,
        previousNewLeads: leads.filter((lead) => isSameMonth(lead.createdAt, previousMonth)).length,
        newClients: clients.filter((client) => isSameMonth(client.entryDate, month)).length,
        activeProjects: activeProjects(projects).length,
        videosInProduction: inProduction.length,
        overdueVideos: overdueVideoList.length,
        overdueTasks: overdueTasks(tasks).length,
      },
      funnel: leadsByStage(leads),
      production,
      pipeline: {
        value: pipelineValue(leads),
        conversion: conversionRate(closedLeads, leads.length),
      },
      upcomingVideos: byDeadline.slice(0, 6),
      followUps: sortBy(overdueFollowUps(leads), (lead) => lead.nextFollowUpDate).slice(0, 6),
      latePayments: sortBy(late, (payment) => payment.dueDate),
      openTasks: sortBy(
        tasks.filter((task) => task.status !== 'done'),
        (task) => task.deadline ?? '9999-12-31',
      ).slice(0, 6),
    }
  }, [
    month,
    range,
    previousRange,
    recentMonths,
    payments,
    expenses,
    leads,
    clients,
    projects,
    videos,
    tasks,
    contracts,
  ])
}
