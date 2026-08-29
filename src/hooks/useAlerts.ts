import { useMemo } from 'react'

import { useClients } from '@/hooks/useClients'
import { useContracts } from '@/hooks/useContracts'
import { useLeads } from '@/hooks/useLeads'
import { usePayments } from '@/hooks/usePayments'
import { useTasks } from '@/hooks/useTasks'
import { useVideos } from '@/hooks/useVideos'
import {
  contractsNearRenewal,
  overdueFollowUps,
  overduePayments,
  overdueTasks,
  overdueVideos,
  upcomingVideos,
} from '@/lib/calculations'
import { CONTRACT_RENEWAL_WARNING_DAYS, UPCOMING_DEADLINE_DAYS } from '@/lib/constants'
import { daysUntil, formatCurrency, sortBy } from '@/lib/utils'
import type { NotificationType } from '@/types'

/**
 * Alerta derivado do estado atual dos dados.
 *
 * Nada disso é gravado: a coleção `notifications` do banco existe para avisos
 * que precisem sobreviver a um reload, e alertas de atraso não precisam — eles
 * são recalculados a cada render e somem sozinhos quando a causa é resolvida.
 * Gravar cópias exigiria limpá-las, e um alerta órfão é pior que nenhum.
 */
export interface Alert {
  id: string
  type: NotificationType
  title: string
  message: string
  to: string
  /** Quanto mais negativo o prazo, mais acima o alerta aparece. */
  urgency: number
}

export function useAlerts(): Alert[] {
  const { videos } = useVideos()
  const { payments } = usePayments()
  const { leads } = useLeads()
  const { tasks } = useTasks()
  const { contracts } = useContracts()
  const { byId: clientById } = useClients()

  return useMemo(() => {
    const alerts: Alert[] = []

    for (const video of overdueVideos(videos)) {
      const days = Math.abs(daysUntil(video.deadline) ?? 0)
      alerts.push({
        id: `overdue-video-${video.id}`,
        type: 'overdue_video',
        title: video.title,
        message: `Vídeo com ${days} ${days === 1 ? 'dia' : 'dias'} de atraso`,
        to: `/videos/${video.id}`,
        urgency: -days,
      })
    }

    for (const video of upcomingVideos(videos, UPCOMING_DEADLINE_DAYS)) {
      const days = daysUntil(video.deadline) ?? 0
      alerts.push({
        id: `upcoming-video-${video.id}`,
        type: 'upcoming_deadline',
        title: video.title,
        message: days === 0 ? 'Entrega hoje' : `Entrega em ${days} ${days === 1 ? 'dia' : 'dias'}`,
        to: `/videos/${video.id}`,
        urgency: days,
      })
    }

    for (const payment of overduePayments(payments)) {
      const days = Math.abs(daysUntil(payment.dueDate) ?? 0)
      alerts.push({
        id: `overdue-payment-${payment.id}`,
        type: 'overdue_payment',
        title: payment.description,
        message: `${formatCurrency(payment.amount)} vencidos há ${days} ${days === 1 ? 'dia' : 'dias'}${
          payment.clientId ? ` — ${clientById(payment.clientId)?.name ?? ''}` : ''
        }`,
        to: '/financial',
        urgency: -days,
      })
    }

    for (const lead of overdueFollowUps(leads)) {
      const days = Math.abs(daysUntil(lead.nextFollowUpDate) ?? 0)
      alerts.push({
        id: `followup-${lead.id}`,
        type: 'overdue_followup',
        title: lead.name,
        message: days === 0 ? 'Follow-up hoje' : `Follow-up atrasado há ${days} dias`,
        to: `/leads/${lead.id}`,
        urgency: -days,
      })
    }

    for (const task of overdueTasks(tasks)) {
      const days = Math.abs(daysUntil(task.deadline) ?? 0)
      alerts.push({
        id: `overdue-task-${task.id}`,
        type: 'overdue_task',
        title: task.title,
        message: `Tarefa com ${days} ${days === 1 ? 'dia' : 'dias'} de atraso`,
        to: task.videoId ? `/videos/${task.videoId}` : '/tasks',
        urgency: -days,
      })
    }

    for (const contract of contractsNearRenewal(contracts, CONTRACT_RENEWAL_WARNING_DAYS)) {
      const days = daysUntil(contract.renewalDate) ?? 0
      const name = clientById(contract.clientId)?.name ?? 'Cliente'
      alerts.push({
        id: `renewal-${contract.id}`,
        type: 'contract_renewal',
        title: `Contrato — ${name}`,
        message:
          days < 0
            ? `Renovação vencida há ${Math.abs(days)} dias`
            : `Renovação em ${days} ${days === 1 ? 'dia' : 'dias'}`,
        to: `/clients/${contract.clientId}`,
        urgency: days,
      })
    }

    return sortBy(alerts, (alert) => alert.urgency)
  }, [videos, payments, leads, tasks, contracts, clientById])
}
