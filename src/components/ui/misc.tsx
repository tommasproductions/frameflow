import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { Check } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

import { TONE_FILL, type Tone } from '@/lib/constants'
import { cn } from '@/lib/utils'

/* ------------------------------- Separator ------------------------------- */

export function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      orientation={orientation}
      className={cn(
        'shrink-0 bg-line',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  )
}

/* -------------------------------- Tooltip -------------------------------- */

export const TooltipProvider = TooltipPrimitive.Provider

export function Tooltip({
  content,
  children,
  side = 'top',
  ...props
}: {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
} & ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipPrimitive.Root {...props}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-50 max-w-64 rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink shadow-lg shadow-black/40',
            'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95',
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

/* -------------------------------- Progress ------------------------------- */

export function Progress({
  value,
  tone = 'accent',
  className,
  ...props
}: ComponentProps<typeof ProgressPrimitive.Root> & { tone?: Tone }) {
  const pct = Math.min(100, Math.max(0, value ?? 0))
  return (
    <ProgressPrimitive.Root
      value={pct}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-hover', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn('h-full rounded-full transition-[width] duration-300', TONE_FILL[tone])}
        style={{ width: `${pct}%` }}
      />
    </ProgressPrimitive.Root>
  )
}

/* -------------------------------- Checkbox ------------------------------- */

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer size-4 shrink-0 rounded-sm border border-line-active bg-canvas transition-colors outline-none',
        'hover:border-accent focus-visible:ring-2 focus-visible:ring-accent/50',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        <Check className="size-3" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

/* -------------------------------- Skeleton ------------------------------- */

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('animate-pulse rounded-md bg-hover', className)} {...props} />
}
