import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface Crumb {
  label: string
  to?: string
}

export interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: Crumb[]
  /** Botões alinhados à direita do título. */
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-3', className)}>
      {breadcrumbs?.length ? (
        <nav aria-label="Trilha de navegação" className="flex items-center gap-1 text-xs">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? <ChevronRight className="size-3 text-ink-faint" /> : null}
              {crumb.to ? (
                <Link to={crumb.to} className="text-ink-dim transition-colors hover:text-ink">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-ink-faint">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {description ? <p className="text-sm text-ink-dim">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}

/** Título de seção dentro de uma página, com ação opcional à direita. */
export function SectionHeader({
  title,
  action,
  className,
}: {
  title: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {action}
    </div>
  )
}
