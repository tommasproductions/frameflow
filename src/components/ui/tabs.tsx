import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export const Tabs = TabsPrimitive.Root

/** Abas sublinhadas — o indicador é a borda inferior, não uma pílula. */
export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('flex items-center gap-1 overflow-x-auto border-b border-line', className)}
      {...props}
    />
  )
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'relative -mb-px shrink-0 border-b-2 border-transparent px-3 py-2 text-base font-medium whitespace-nowrap text-ink-dim transition-colors outline-none',
        'hover:text-ink data-[state=active]:border-accent data-[state=active]:text-ink',
        'focus-visible:ring-2 focus-visible:ring-accent/50',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('mt-4 outline-none focus-visible:ring-0', className)}
      {...props}
    />
  )
}
