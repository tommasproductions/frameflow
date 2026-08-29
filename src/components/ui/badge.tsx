import type { ComponentProps } from 'react'

import { TONE_BADGE, type Tone } from '@/lib/constants'
import { cn } from '@/lib/utils'

export interface BadgeProps extends ComponentProps<'span'> {
  tone?: Tone
  /** `dot` acrescenta um ponto colorido antes do texto. */
  dot?: boolean
}

/** Pill de status: fundo a 10% do tom + texto no tom cheio. */
export function Badge({ className, tone = 'neutral', dot = false, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_BADGE[tone],
        className,
      )}
      {...props}
    >
      {dot ? <span className="size-1.5 shrink-0 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}
