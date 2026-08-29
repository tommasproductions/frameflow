import { ChevronLeft, ChevronRight, PanelLeft, Search } from 'lucide-react'

import { usePeriod } from '@/app/period'
import { NotificationsMenu } from '@/components/shared/NotificationsMenu'
import { QuickActions } from '@/components/shared/QuickActions'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { lastMonths } from '@/lib/utils'

/** Quantos meses o seletor de período oferece para trás. */
const SELECTABLE_MONTHS = 18

/** `YYYY-MM` — chave estável de um mês, usada como valor do select. */
function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(date: Date): string {
  return date
    .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    .replace('.', '')
    .replace(/^./, (c) => c.toUpperCase())
}

export function Topbar({
  onToggleSidebar,
  onOpenSearch,
}: {
  onToggleSidebar: () => void
  onOpenSearch: () => void
}) {
  const { month, setMonth, label } = usePeriod()

  // A lista termina alguns meses à frente do mês atual do cenário, para dar
  // para navegar ao futuro sem escolher uma data solta.
  const anchor = new Date(month.getFullYear(), month.getMonth() + 3, 1)
  const options = lastMonths(SELECTABLE_MONTHS, anchor).reverse()

  const step = (delta: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1))

  return (
    <header className="flex h-12 shrink-0 items-center gap-1.5 border-b border-line bg-surface px-2.5 sm:px-4">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggleSidebar}
        aria-label="Alternar barra lateral"
      >
        <PanelLeft />
      </Button>

      {/* Gatilho de busca: campo em telas largas, só o ícone no celular. */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="hidden h-8 max-w-72 flex-1 items-center gap-2 rounded-md border border-line bg-canvas px-2.5 text-left text-sm text-ink-faint transition-colors hover:border-line-active hover:text-ink-dim focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none md:flex"
      >
        <Search className="size-3.5 shrink-0" />
        <span className="flex-1 truncate">Buscar…</span>
        <kbd className="shrink-0 rounded-sm border border-line px-1 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onOpenSearch}
        aria-label="Buscar"
        className="md:hidden"
      >
        <Search />
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => step(-1)}
          aria-label="Mês anterior"
          className="hidden sm:inline-flex"
        >
          <ChevronLeft />
        </Button>

        <Select
          value={monthKey(month)}
          onValueChange={(value) => {
            const [year, m] = value.split('-').map(Number)
            setMonth(new Date(year, m - 1, 1))
          }}
        >
          <SelectTrigger className="w-32 sm:w-36" aria-label={`Período: ${label}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {options.map((option) => (
              <SelectItem key={monthKey(option)} value={monthKey(option)}>
                {monthLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => step(1)}
          aria-label="Próximo mês"
          className="hidden sm:inline-flex"
        >
          <ChevronRight />
        </Button>
      </div>

      <NotificationsMenu />
      <QuickActions />
    </header>
  )
}
