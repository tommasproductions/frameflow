import { Clapperboard, FolderKanban } from 'lucide-react'

import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card } from '@/components/ui/card'
import type { ClientMetrics } from '@/hooks/useClientMetrics'
import { LEAD_SOURCE_LABEL } from '@/lib/constants'
import { cn, formatCurrency, formatPercent, initials } from '@/lib/utils'
import type { Client } from '@/types'

/**
 * Cartão da carteira.
 *
 * Mostra receita e margem lado a lado porque um cliente de receita alta e
 * margem baixa é um problema diferente de um cliente pequeno e lucrativo —
 * e a lista precisa deixar isso visível sem abrir o detalhe.
 */
export function ClientCard({
  client,
  metrics,
  onClick,
}: {
  client: Client
  metrics: ClientMetrics
  onClick?: () => void
}) {
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
        'p-4 transition-colors',
        onClick &&
          'cursor-pointer hover:border-line-active hover:bg-hover focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-xs font-semibold text-accent">
          {initials(client.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{client.name}</p>
          <p className="truncate text-xs text-ink-dim">
            {[client.company, client.niche].filter(Boolean).join(' · ') || 'Sem empresa'}
          </p>
        </div>
        <StatusBadge type="client" status={client.status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
        <div>
          <dt className="text-xs text-ink-faint">Receita</dt>
          <dd className="tabular text-sm font-semibold text-ink">
            {formatCurrency(metrics.contracted)}
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
        <div>
          <dt className="text-xs text-ink-faint">Margem</dt>
          <dd className="tabular text-sm text-ink-dim">{formatPercent(metrics.margin)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-faint">A receber</dt>
          <dd
            className={cn(
              'tabular text-sm',
              metrics.overdue > 0 ? 'font-medium text-danger' : 'text-ink-dim',
            )}
          >
            {formatCurrency(metrics.receivable)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center gap-4 border-t border-line pt-3 text-xs text-ink-faint">
        <span className="flex items-center gap-1.5">
          <FolderKanban className="size-3.5" />
          {metrics.projectCount} {metrics.projectCount === 1 ? 'projeto' : 'projetos'}
        </span>
        <span className="flex items-center gap-1.5">
          <Clapperboard className="size-3.5" />
          {metrics.videoCount} {metrics.videoCount === 1 ? 'vídeo' : 'vídeos'}
        </span>
        <span className="ml-auto truncate">{LEAD_SOURCE_LABEL[client.source]}</span>
      </div>
    </Card>
  )
}
