import type { ReactNode } from 'react'

import { THEME_HEX } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'

interface TooltipEntry {
  name?: string | number
  value?: number | string
  color?: string
  dataKey?: string | number
}

/** Tooltip escuro com valores em moeda e alinhamento tabular. */
export function ChartTooltip({
  active,
  payload,
  label,
  formatter = (value: number) => formatCurrency(value),
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: ReactNode
  formatter?: (value: number) => string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-line bg-surface px-2.5 py-2 shadow-xl shadow-black/40">
      {label ? <p className="mb-1.5 text-xs font-medium text-ink">{label}</p> : null}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={`${entry.dataKey}-${index}`} className="flex items-center gap-2 text-xs">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color ?? THEME_HEX.inkFaint }}
            />
            <span className="text-ink-dim">{entry.name}</span>
            <span className="tabular ml-auto font-medium text-ink">
              {formatter(Number(entry.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
