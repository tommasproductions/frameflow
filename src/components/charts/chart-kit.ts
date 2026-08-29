import { THEME_HEX } from '@/lib/constants'

/**
 * Ajustes compartilhados dos gráficos.
 *
 * Recharts recebe cores como valores, não como classes, então tudo aqui lê de
 * `THEME_HEX` — a mesma paleta das classes do Tailwind, em hex.
 */

export const AXIS_PROPS = {
  stroke: THEME_HEX.inkFaint,
  tickLine: false,
  axisLine: false,
  tick: { fill: THEME_HEX.inkFaint, fontSize: 11 },
} as const

export const GRID_PROPS = {
  stroke: THEME_HEX.line,
  strokeDasharray: '3 3',
  vertical: false,
} as const

/** Cursor discreto sob a barra ativa, no lugar do retângulo claro padrão. */
export const CURSOR_PROPS = { fill: THEME_HEX.hover, radius: 4 } as const

/** Abrevia valores no eixo Y: 3200 -> "3,2k". */
export function compactAxisValue(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
  }
  return value.toLocaleString('pt-BR')
}
