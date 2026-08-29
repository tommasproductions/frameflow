import { Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

/**
 * Barra de filtros controlada.
 *
 * Os valores vivem na página, não aqui — assim a página pode sincronizá-los com
 * a URL (o dashboard linka para `/leads?stage=meeting`) sem que este componente
 * precise saber de roteamento.
 */

export type FilterConfig =
  | { key: string; label: string; type: 'search'; placeholder?: string }
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[] }
  | { key: string; label: string; type: 'date-range' }

/**
 * Um filtro por chave. `date-range` grava em `<key>From` e `<key>To`.
 * String vazia significa "sem filtro".
 */
export type FilterValues = Record<string, string>

/** Radix não aceita item com valor vazio, então "todos" precisa de um sentinela. */
const ALL = '__all'

export function countActiveFilters(filters: FilterConfig[], values: FilterValues): number {
  return filters.reduce((total, filter) => {
    if (filter.type === 'date-range') {
      const used = Boolean(values[`${filter.key}From`]) || Boolean(values[`${filter.key}To`])
      return total + (used ? 1 : 0)
    }
    return total + (values[filter.key] ? 1 : 0)
  }, 0)
}

export function FilterBar({
  filters,
  values,
  onChange,
  className,
  children,
}: {
  filters: FilterConfig[]
  values: FilterValues
  onChange: (values: FilterValues) => void
  className?: string
  /** Controles extras à direita — alternador de visão, botão de criação. */
  children?: React.ReactNode
}) {
  const active = countActiveFilters(filters, values)

  const set = (key: string, value: string) => onChange({ ...values, [key]: value })

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {filters.map((filter) => {
        if (filter.type === 'search') {
          return (
            <div key={filter.key} className="relative min-w-52 flex-1 sm:max-w-72">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-faint" />
              <Input
                value={values[filter.key] ?? ''}
                onChange={(event) => set(filter.key, event.target.value)}
                placeholder={filter.placeholder ?? filter.label}
                aria-label={filter.label}
                className="pl-8"
              />
            </div>
          )
        }

        if (filter.type === 'date-range') {
          return (
            <div key={filter.key} className="flex items-center gap-1.5">
              <Input
                type="date"
                value={values[`${filter.key}From`] ?? ''}
                onChange={(event) => set(`${filter.key}From`, event.target.value)}
                aria-label={`${filter.label} — início`}
                className="w-36"
              />
              <span className="text-xs text-ink-faint">até</span>
              <Input
                type="date"
                value={values[`${filter.key}To`] ?? ''}
                onChange={(event) => set(`${filter.key}To`, event.target.value)}
                aria-label={`${filter.label} — fim`}
                className="w-36"
              />
            </div>
          )
        }

        return (
          <Select
            key={filter.key}
            value={values[filter.key] || ALL}
            onValueChange={(value) => set(filter.key, value === ALL ? '' : value)}
          >
            <SelectTrigger className="w-auto min-w-36" aria-label={filter.label}>
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{filter.label}: todos</SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      })}

      {active > 0 ? (
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          <X />
          Limpar {active === 1 ? 'filtro' : `${active} filtros`}
        </Button>
      ) : null}

      {children ? <div className="ml-auto flex items-center gap-2">{children}</div> : null}
    </div>
  )
}
