import { Command } from 'cmdk'
import {
  Clapperboard,
  CircleCheck,
  FolderKanban,
  Search,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useSearchIndex, type SearchGroup, type SearchResult } from '@/hooks/useSearch'
import { cn, normalize } from '@/lib/utils'

const GROUP_ICON: Record<SearchGroup, LucideIcon> = {
  Leads: Target,
  Clientes: Users,
  Projetos: FolderKanban,
  Vídeos: Clapperboard,
  Tarefas: CircleCheck,
}

/** Ordem dos grupos no resultado — do comercial para o operacional. */
const GROUP_ORDER: SearchGroup[] = ['Leads', 'Clientes', 'Projetos', 'Vídeos', 'Tarefas']

/** Quantos itens por grupo, para a lista caber sem rolagem infinita. */
const PER_GROUP = 5

/**
 * Busca global, aberta por Cmd/Ctrl+K.
 *
 * A filtragem é nossa, não do cmdk: precisamos casar contra campos que não
 * aparecem na linha (empresa, nicho, descrição) e agrupar por tipo com limite
 * por grupo.
 */
export function SearchCommand({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0" showClose={false}>
        <DialogTitle className="sr-only">Busca global</DialogTitle>
        <DialogDescription className="sr-only">
          Busque leads, clientes, projetos, vídeos e tarefas.
        </DialogDescription>
        {/* O corpo desmonta com o diálogo, então cada abertura começa com a
            busca vazia — sem efeito de limpeza. */}
        <SearchCommandBody onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function SearchCommandBody({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const index = useSearchIndex()
  const [query, setQuery] = useState('')

  const grouped = useMemo(() => {
    const needle = normalize(query.trim())
    const matches = needle
      ? index.filter((item) => item.haystack.includes(needle))
      : // Sem busca, mostra uma amostra de cada grupo como ponto de partida.
        index

    const out: { group: SearchGroup; items: SearchResult[] }[] = []
    for (const group of GROUP_ORDER) {
      const items = matches.filter((item) => item.group === group).slice(0, PER_GROUP)
      if (items.length > 0) out.push({ group, items })
    }
    return out
  }, [index, query])

  const total = grouped.reduce((sum, entry) => sum + entry.items.length, 0)

  function go(result: SearchResult) {
    onClose()
    navigate(result.to)
  }

  return (
    <Command shouldFilter={false} loop className="flex min-h-0 flex-col">
      <div className="flex items-center gap-2.5 border-b border-line px-4">
        <Search className="size-4 shrink-0 text-ink-faint" />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Buscar leads, clientes, projetos, vídeos…"
          className="h-12 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-faint"
        />
        <kbd className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 font-mono text-xs text-ink-faint">
          esc
        </kbd>
      </div>

      <Command.List className="max-h-96 overflow-y-auto p-2">
        {total === 0 ? (
          <Command.Empty className="px-2 py-8 text-center text-sm text-ink-faint">
            Nada encontrado para “{query}”.
          </Command.Empty>
        ) : null}

        {grouped.map(({ group, items }) => {
          const Icon = GROUP_ICON[group]
          return (
            <Command.Group
              key={group}
              heading={group}
              className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-faint"
            >
              {items.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.id}
                  onSelect={() => go(item)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm outline-none',
                    'text-ink-dim data-[selected=true]:bg-hover data-[selected=true]:text-ink',
                  )}
                >
                  <Icon className="size-4 shrink-0 text-ink-faint" />
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  {item.subtitle ? (
                    <span className="shrink-0 truncate text-xs text-ink-faint">
                      {item.subtitle}
                    </span>
                  ) : null}
                </Command.Item>
              ))}
            </Command.Group>
          )
        })}
      </Command.List>

      <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-xs text-ink-faint">
        <span>↑↓ navegar</span>
        <span>↵ abrir</span>
        <span className="ml-auto">{total} resultados</span>
      </div>
    </Command>
  )
}
