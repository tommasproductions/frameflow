import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'

import { TONE_FILL, type Tone } from '@/lib/constants'
import { cn } from '@/lib/utils'

/** Coluna do Kanban: alvo de soltura, com cabeçalho de contagem e resumo. */
export function KanbanColumn({
  id,
  title,
  count,
  tone = 'neutral',
  subtitle,
  children,
}: {
  id: string
  title: string
  count: number
  tone?: Tone
  /** Linha auxiliar — normalmente o valor somado dos cards. */
  subtitle?: string
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <section
      ref={setNodeRef}
      aria-label={`${title}, ${count} ${count === 1 ? 'item' : 'itens'}`}
      className={cn(
        'flex w-64 shrink-0 flex-col rounded-lg border bg-surface/60 transition-colors',
        isOver ? 'border-accent/60 bg-accent/5' : 'border-line',
      )}
    >
      <header className="flex items-center gap-2 px-3 py-2.5">
        <span className={cn('size-1.5 shrink-0 rounded-full', TONE_FILL[tone])} />
        <h3 className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{title}</h3>
        <span className="tabular rounded-sm bg-hover px-1.5 py-0.5 text-xs font-medium text-ink-dim">
          {count}
        </span>
      </header>

      {subtitle ? (
        <p className="tabular -mt-1 px-3 pb-2 text-xs text-ink-faint">{subtitle}</p>
      ) : null}

      <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
        {count === 0 ? (
          <div
            className={cn(
              'flex min-h-20 items-center justify-center rounded-md border border-dashed text-xs transition-colors',
              isOver ? 'border-accent/60 text-accent' : 'border-line text-ink-faint',
            )}
          >
            {isOver ? 'Soltar aqui' : 'Vazio'}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  )
}
