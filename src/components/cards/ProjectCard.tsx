import { AlertTriangle, Clapperboard } from 'lucide-react'

import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/misc'
import type { ProjectMetrics } from '@/hooks/useProjectMetrics'
import { cn, deadlineLabel, formatCurrency } from '@/lib/utils'
import { ProjectStatus, type Project } from '@/types'

/**
 * Cartão de projeto.
 *
 * A barra de progresso conta vídeos concluídos, não tempo decorrido: é o que
 * responde "quanto falta entregar", que é a pergunta real de um projeto de
 * produção.
 */
export function ProjectCard({
  project,
  clientName,
  metrics,
  onClick,
}: {
  project: Project
  clientName: string
  metrics: ProjectMetrics
  onClick?: () => void
}) {
  // Projeto concluído ou cancelado não tem prazo a cobrar.
  const closed =
    project.status === ProjectStatus.COMPLETED || project.status === ProjectStatus.CANCELLED
  const due = deadlineLabel(project.deadline, closed)

  return (
    <Card
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter') onClick()
            }
          : undefined
      }
      className={cn(
        'flex flex-col p-4 transition-colors',
        onClick &&
          'cursor-pointer hover:border-line-active hover:bg-hover focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{project.name}</p>
          <p className="truncate text-xs text-ink-dim">
            {clientName}
            {project.type ? ` · ${project.type}` : ''}
          </p>
        </div>
        <StatusBadge type="project" status={project.status} />
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="text-ink-faint">
            {metrics.deliveredCount} de {metrics.videoCount}{' '}
            {metrics.videoCount === 1 ? 'vídeo' : 'vídeos'}
          </span>
          <span className="tabular text-ink-dim">{Math.round(metrics.progress)}%</span>
        </div>
        <Progress
          value={metrics.progress}
          tone={metrics.progress === 100 ? 'success' : 'accent'}
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
        <div>
          <dt className="text-xs text-ink-faint">Contratado</dt>
          <dd className="tabular text-sm font-semibold text-ink">
            {formatCurrency(project.contractedValue)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-faint">Lucro</dt>
          <dd
            className={cn(
              'tabular text-sm font-semibold',
              metrics.profit < 0 ? 'text-danger' : 'text-ink',
            )}
          >
            {formatCurrency(metrics.profit)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center gap-3 border-t border-line pt-3 text-xs">
        <span className="flex items-center gap-1.5 text-ink-faint">
          <Clapperboard className="size-3.5" />
          {metrics.inProductionCount} em produção
        </span>
        {metrics.overdueCount > 0 ? (
          <span className="flex items-center gap-1.5 font-medium text-danger">
            <AlertTriangle className="size-3.5" />
            {metrics.overdueCount} {metrics.overdueCount === 1 ? 'atrasado' : 'atrasados'}
          </span>
        ) : null}
        <span
          className={cn('ml-auto shrink-0', due.overdue ? 'font-medium text-danger' : 'text-ink-faint')}
        >
          {due.text}
        </span>
      </div>
    </Card>
  )
}
