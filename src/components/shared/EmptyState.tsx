import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
  /** `inline` encolhe o bloco para caber dentro de um card do dashboard. */
  size?: 'inline' | 'page'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  size = 'page',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        size === 'page' ? 'gap-3 px-6 py-16' : 'gap-2 px-4 py-10',
        className,
      )}
    >
      {Icon ? (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-hover text-ink-faint',
            size === 'page' ? 'size-12' : 'size-9',
          )}
        >
          <Icon className={size === 'page' ? 'size-5' : 'size-4'} />
        </div>
      ) : null}

      <div className="space-y-1">
        <p className={cn('font-medium text-ink', size === 'page' ? 'text-base' : 'text-sm')}>
          {title}
        </p>
        {description ? (
          <p className="max-w-sm text-sm text-ink-dim">{description}</p>
        ) : null}
      </div>

      {actionLabel && onAction ? (
        <Button variant="primary" size={size === 'page' ? 'md' : 'sm'} onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
