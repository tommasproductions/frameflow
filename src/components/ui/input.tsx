import * as LabelPrimitive from '@radix-ui/react-label'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const fieldBase =
  'w-full rounded-md border border-line bg-canvas px-2.5 text-base text-ink transition-colors outline-none placeholder:text-ink-faint focus-visible:border-line-active focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(fieldBase, 'h-8', className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldBase, 'min-h-20 py-2 leading-5', className)} {...props} />
}

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'text-xs font-medium text-ink-dim select-none peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

/** Label + campo + mensagem de erro, com o espaçamento padrão dos formulários. */
export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label?: string
  hint?: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? <Label>{label}</Label> : null}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  )
}
