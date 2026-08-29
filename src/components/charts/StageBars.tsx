import { Link } from 'react-router-dom'

import { TONE_FILL, type Tone } from '@/lib/constants'
import { cn } from '@/lib/utils'

export interface StageBar {
  key: string
  label: string
  count: number
  tone: Tone
  /** Destino ao clicar na linha. */
  to?: string
}

/**
 * Lista de etapas com barra proporcional.
 *
 * Um funil de verdade esconde a comparação entre etapas quando os números são
 * pequenos; a barra horizontal mantém rótulo, proporção e contagem legíveis
 * lado a lado, que é o que estes painéis precisam mostrar.
 */
export function StageBars({ items, className }: { items: StageBar[]; className?: string }) {
  const max = Math.max(1, ...items.map((item) => item.count))

  return (
    <div className={cn('space-y-1', className)}>
      {items.map((item) => {
        const row = (
          <>
            <span className="w-28 shrink-0 truncate text-xs text-ink-dim">{item.label}</span>
            <span className="relative h-4 flex-1 overflow-hidden rounded-sm bg-hover">
              <span
                className={cn('absolute inset-y-0 left-0 rounded-sm transition-[width]', TONE_FILL[item.tone])}
                style={{ width: `${(item.count / max) * 100}%`, opacity: item.count ? 0.85 : 0 }}
              />
            </span>
            <span className="tabular w-6 shrink-0 text-right text-xs font-medium text-ink">
              {item.count}
            </span>
          </>
        )

        return item.to ? (
          <Link
            key={item.key}
            to={item.to}
            className="flex items-center gap-3 rounded-md px-1 py-0.5 transition-colors hover:bg-hover"
          >
            {row}
          </Link>
        ) : (
          <div key={item.key} className="flex items-center gap-3 px-1 py-0.5">
            {row}
          </div>
        )
      })}
    </div>
  )
}
