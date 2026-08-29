import { useMemo } from 'react'

import { useCalendarEvents } from '@/hooks/useCalendar'
import { useClients } from '@/hooks/useClients'
import { useLeads } from '@/hooks/useLeads'
import { usePayments } from '@/hooks/usePayments'
import { useTasks } from '@/hooks/useTasks'
import { useVideos } from '@/hooks/useVideos'
import { VIDEO_CLOSED_STATUSES } from '@/lib/constants'
import { CalendarEventType, LeadStage, PaymentStatus, TaskStatus } from '@/types'

/**
 * Um item do calendário, já achatado para renderização.
 *
 * Prazos, pagamentos, tarefas e follow-ups não são gravados como eventos: eles
 * são derivados das próprias entidades a cada render. Guardar cópias criaria
 * duas fontes de verdade — mudar o prazo de um vídeo teria que atualizar um
 * evento também, e o dia em que isso falhasse o calendário passaria a mentir.
 */
export interface CalendarItem {
  id: string
  /** `YYYY-MM-DD` */
  date: string
  title: string
  type: CalendarEventType
  /** Para onde o item leva ao ser clicado. */
  to: string | null
  /** Linha auxiliar: cliente, valor, etapa. */
  detail: string | null
  /** Já aconteceu e não exige mais nada. */
  settled: boolean
}

/** Todos os compromissos do sistema, derivados e avulsos, em uma lista só. */
export function useCalendarItems(): CalendarItem[] {
  const { videos } = useVideos()
  const { tasks } = useTasks()
  const { payments } = usePayments()
  const { leads } = useLeads()
  const { events } = useCalendarEvents()
  const { byId: clientById } = useClients()

  return useMemo(() => {
    const items: CalendarItem[] = []

    for (const video of videos) {
      if (!video.deadline) continue
      const settled = VIDEO_CLOSED_STATUSES.includes(video.status)
      items.push({
        id: `video-${video.id}`,
        date: video.deadline,
        title: video.title,
        type: settled ? CalendarEventType.DELIVERY : CalendarEventType.DEADLINE,
        to: `/videos/${video.id}`,
        detail: clientById(video.clientId)?.name ?? null,
        settled,
      })
    }

    for (const task of tasks) {
      if (!task.deadline) continue
      items.push({
        id: `task-${task.id}`,
        date: task.deadline,
        title: task.title,
        type: CalendarEventType.TASK,
        to: task.videoId ? `/videos/${task.videoId}` : '/tasks',
        detail: clientById(task.clientId)?.name ?? null,
        settled: task.status === TaskStatus.DONE,
      })
    }

    for (const payment of payments) {
      if (payment.status === PaymentStatus.CANCELLED) continue
      const paid = payment.status === PaymentStatus.PAID
      items.push({
        id: `payment-${payment.id}`,
        // Pago aparece no dia em que entrou; em aberto, no vencimento.
        date: (paid ? payment.paymentDate : payment.dueDate) ?? payment.dueDate,
        title: payment.description,
        type: CalendarEventType.PAYMENT,
        to: '/financial',
        detail: clientById(payment.clientId)?.name ?? null,
        settled: paid,
      })
    }

    for (const lead of leads) {
      if (!lead.nextFollowUpDate) continue
      if (lead.stage === LeadStage.CLOSED || lead.stage === LeadStage.LOST) continue
      items.push({
        id: `lead-${lead.id}`,
        date: lead.nextFollowUpDate,
        title: lead.name,
        type: CalendarEventType.FOLLOWUP,
        to: `/leads/${lead.id}`,
        detail: lead.nextFollowUpAction,
        settled: false,
      })
    }

    // Compromissos avulsos — reuniões e gravações, que não derivam de nada.
    for (const event of events) {
      items.push({
        id: `event-${event.id}`,
        date: event.date,
        title: event.title,
        type: event.type,
        to:
          event.entityType && event.entityId
            ? `/${event.entityType === 'client' ? 'clients' : `${event.entityType}s`}/${event.entityId}`
            : null,
        detail: event.notes,
        settled: false,
      })
    }

    return items
  }, [videos, tasks, payments, leads, events, clientById])
}
