import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { TONE_TEXT, type Tone } from '@/lib/constants'
import { cn, formatMetric, formatPercent, type MetricFormat } from '@/lib/utils'

export interface MetricCardProps {
  label: string
  value: number | null | undefined
  /** Mesma métrica no período anterior. Presente, habilita o indicador de variação. */
  previousValue?: number | null
  format?: MetricFormat
  icon?: LucideIcon
  /** Qual direção é boa. Para custos, `down`. */
  trend?: 'up' | 'down'
  /** Linha auxiliar sob o valor. */
  hint?: string
  /** Colore o valor — para destacar lucro negativo ou atrasos. */
  tone?: Tone
  className?: string
}

/** Variação percentual entre dois períodos, ou null quando não é calculável. */
function variation(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / Math.abs(previous)) * 100
}

export function MetricCard({
  label,
  value,
  previousValue,
  format = 'number',
  icon: Icon,
  trend = 'up',
  hint,
  tone,
  className,
}: MetricCardProps) {
  const delta =
    previousValue === undefined || previousValue === null || value === null || value === undefined
      ? null
      : variation(value, previousValue)

  const isFlat = delta !== null && Math.abs(delta) < 0.05
  const isGood = delta === null || isFlat ? null : trend === 'up' ? delta > 0 : delta < 0
  const DeltaIcon = isFlat ? Minus : delta !== null && delta > 0 ? ArrowUpRight : ArrowDownRight

  return (
    <Card className={cn('p-3', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-ink-dim">{label}</p>
        {Icon ? <Icon className="size-4 shrink-0 text-ink-faint" /> : null}
      </div>

      <p
        className={cn(
          'tabular mt-1.5 text-2xl font-semibold tracking-tight',
          tone ? TONE_TEXT[tone] : 'text-ink',
        )}
      >
        {formatMetric(value, format)}
      </p>

      {delta !== null ? (
        <div className="mt-1 flex items-center gap-1 text-xs">
          <DeltaIcon
            className={cn(
              'size-3.5',
              isGood === null ? 'text-ink-faint' : isGood ? 'text-success' : 'text-danger',
            )}
          />
          <span
            className={cn(
              'tabular font-medium',
              isGood === null ? 'text-ink-faint' : isGood ? 'text-success' : 'text-danger',
            )}
          >
            {formatPercent(Math.abs(delta), 1)}
          </span>
          <span className="text-ink-faint">vs. período anterior</span>
        </div>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-faint">{hint}</p>
      ) : null}
    </Card>
  )
}
