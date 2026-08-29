import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { AXIS_PROPS, compactAxisValue, GRID_PROPS } from '@/components/charts/chart-kit'
import type { MonthlyPoint } from '@/lib/calculations'
import { THEME_HEX } from '@/lib/constants'

/**
 * Lucro mensal.
 * A linha do zero fica explícita porque meses negativos são comuns quando a
 * receita de um projeto longo cai fora do mês em que os custos aconteceram.
 */
export function ProfitChart({ data }: { data: MonthlyPoint[] }) {
  const hasNegative = data.some((point) => point.profit < 0)

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="profit-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={THEME_HEX.success} stopOpacity={0.35} />
            <stop offset="100%" stopColor={THEME_HEX.success} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="label" {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} tickFormatter={compactAxisValue} width={44} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: THEME_HEX.lineActive }} />
        {hasNegative ? <ReferenceLine y={0} stroke={THEME_HEX.lineActive} /> : null}
        <Area
          type="monotone"
          dataKey="profit"
          name="Lucro"
          stroke={THEME_HEX.success}
          strokeWidth={2}
          fill="url(#profit-fill)"
          dot={{ r: 2.5, fill: THEME_HEX.success, strokeWidth: 0 }}
          activeDot={{ r: 4, fill: THEME_HEX.success, stroke: THEME_HEX.canvas, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
