import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { ChartTooltip } from '@/components/charts/ChartTooltip'
import {
  AXIS_PROPS,
  compactAxisValue,
  CURSOR_PROPS,
  GRID_PROPS,
} from '@/components/charts/chart-kit'
import type { MonthlyPoint } from '@/lib/calculations'
import { THEME_HEX } from '@/lib/constants'

/**
 * Receita recebida contra custos, mês a mês.
 * O mês selecionado na topbar fica destacado; os anteriores ficam esmaecidos.
 */
export function RevenueChart({ data, activeKey }: { data: MonthlyPoint[]; activeKey: string }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }} barGap={4}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="label" {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} tickFormatter={compactAxisValue} width={44} />
        <Tooltip cursor={CURSOR_PROPS} content={<ChartTooltip />} />
        <Bar dataKey="received" name="Recebido" radius={[3, 3, 0, 0]} maxBarSize={22}>
          {data.map((point) => (
            <Cell
              key={point.key}
              fill={point.key === activeKey ? THEME_HEX.accent : `${THEME_HEX.accent}66`}
            />
          ))}
        </Bar>
        <Bar dataKey="expenses" name="Custos" radius={[3, 3, 0, 0]} maxBarSize={22}>
          {data.map((point) => (
            <Cell
              key={point.key}
              fill={point.key === activeKey ? THEME_HEX.danger : `${THEME_HEX.danger}55`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
