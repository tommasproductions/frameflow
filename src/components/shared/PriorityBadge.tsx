import { Badge } from '@/components/ui/badge'
import { PRIORITY_LABEL, PRIORITY_TONE, TONE_FILL } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Priority } from '@/types'

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority
  className?: string
}) {
  return (
    <Badge tone={PRIORITY_TONE[priority]} dot className={className}>
      {PRIORITY_LABEL[priority]}
    </Badge>
  )
}

/**
 * Versão compacta para cards de Kanban, onde não sobra largura para uma pill.
 * O rótulo vai no `title` para não perder a informação.
 */
export function PriorityDot({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      title={`Prioridade ${PRIORITY_LABEL[priority].toLowerCase()}`}
      className={cn('inline-block size-2 shrink-0 rounded-full', TONE_FILL[PRIORITY_TONE[priority]], className)}
    />
  )
}
