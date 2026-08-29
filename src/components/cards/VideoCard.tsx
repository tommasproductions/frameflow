import { CalendarClock, MessageSquare } from 'lucide-react'

import { PriorityDot } from '@/components/shared/PriorityBadge'
import { VIDEO_TYPE_LABEL } from '@/lib/constants'
import { cn, deadlineLabel, formatCurrency, formatHours } from '@/lib/utils'
import { VideoStatus, type Video } from '@/types'

/**
 * Card da esteira de produção.
 *
 * O prazo é a informação que decide a ordem do dia, então ganha destaque
 * vermelho quando vence. As horas aparecem como trabalhadas/estimadas porque
 * estourar a estimativa é o sinal precoce de um vídeo que vai dar prejuízo.
 */
export function VideoCard({
  video,
  clientName,
  revisionCount = 0,
}: {
  video: Video
  clientName: string
  /** Revisões em aberto — sinaliza retrabalho pendente. */
  revisionCount?: number
}) {
  // Um vídeo aprovado ou entregue saiu da esteira: o prazo já não cobra nada.
  const closed = video.status === VideoStatus.APPROVED || video.status === VideoStatus.DELIVERED
  const due = deadlineLabel(video.deadline, closed)
  const overHours =
    video.estimatedHours !== null &&
    video.workedHours !== null &&
    video.workedHours > video.estimatedHours

  return (
    <article className="rounded-lg border border-line bg-card p-2.5 transition-colors hover:border-line-active hover:bg-hover">
      <div className="flex items-start gap-2">
        <PriorityDot priority={video.priority} className="mt-1.5" />
        <h4 className="min-w-0 flex-1 text-sm leading-snug font-medium text-ink">{video.title}</h4>
      </div>

      <p className="mt-1 truncate text-xs text-ink-dim">
        {clientName} · {VIDEO_TYPE_LABEL[video.type]}
      </p>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="tabular text-sm font-semibold text-ink">
          {formatCurrency(video.value)}
        </span>
        <span className={cn('tabular text-xs', overHours ? 'text-warning' : 'text-ink-faint')}>
          {formatHours(video.workedHours)}/{formatHours(video.estimatedHours)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 border-t border-line pt-2 text-xs">
        <CalendarClock
          className={cn('size-3 shrink-0', due.overdue ? 'text-danger' : 'text-ink-faint')}
        />
        <span className={cn(due.overdue ? 'font-medium text-danger' : 'text-ink-dim')}>
          {due.text}
        </span>
        {revisionCount > 0 ? (
          <span
            className="ml-auto flex shrink-0 items-center gap-1 text-warning"
            title={`${revisionCount} revisão(ões) em aberto`}
          >
            <MessageSquare className="size-3" />
            {revisionCount}
          </span>
        ) : null}
      </div>
    </article>
  )
}
