import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn, sortBy } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  /**
   * Valor usado para ordenar. Sem ele, a coluna não é ordenável — o que é o
   * certo para colunas de ação ou de conteúdo puramente visual.
   */
  sortValue?: (row: T) => string | number | null | undefined
  align?: 'left' | 'right'
  /** Classe de largura aplicada ao `<th>` e ao `<td>`. */
  width?: string
  /** Oculta a coluna abaixo de `lg` — para tabelas densas. */
  hideOnMobile?: boolean
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  getRowId: (row: T) => string
  onRowClick?: (row: T) => void
  /** Coluna e direção iniciais. */
  initialSort?: { key: string; direction: 'asc' | 'desc' }
  /** Acima disso, a tabela pagina. */
  pageSize?: number
  empty?: ReactNode
  className?: string
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  onRowClick,
  initialSort,
  pageSize = 25,
  empty,
  className,
}: DataTableProps<T>) {
  const [sort, setSort] = useState(initialSort ?? null)
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    if (!sort) return data
    const column = columns.find((c) => c.key === sort.key)
    if (!column?.sortValue) return data
    return sortBy(data, column.sortValue, sort.direction)
  }, [data, sort, columns])

  const pageCount = Math.ceil(sorted.length / pageSize)
  // Se um filtro encolheu a lista, a página atual pode não existir mais.
  const safePage = Math.min(page, Math.max(0, pageCount - 1))
  const rows = pageCount > 1 ? sorted.slice(safePage * pageSize, (safePage + 1) * pageSize) : sorted

  function toggleSort(key: string) {
    setPage(0)
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  if (data.length === 0 && empty) {
    return <div className={className}>{empty}</div>
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              {columns.map((column) => {
                const sortable = Boolean(column.sortValue)
                const isSorted = sort?.key === column.key
                const Icon = !isSorted ? ChevronsUpDown : sort.direction === 'asc' ? ChevronUp : ChevronDown

                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      'pb-2 text-xs font-medium whitespace-nowrap text-ink-dim',
                      column.align === 'right' ? 'text-right' : 'text-left',
                      column.width,
                      column.hideOnMobile && 'hidden lg:table-cell',
                    )}
                    aria-sort={
                      isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-sm transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none',
                          column.align === 'right' && 'flex-row-reverse',
                          isSorted && 'text-ink',
                        )}
                      >
                        {column.header}
                        <Icon className={cn('size-3', isSorted ? 'text-accent' : 'text-ink-faint')} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowId(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter') onRowClick(row)
                      }
                    : undefined
                }
                className={cn(
                  'border-b border-line/60 transition-colors last:border-0',
                  onRowClick &&
                    'cursor-pointer hover:bg-hover focus-visible:bg-hover focus-visible:outline-none',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'py-2.5 text-sm text-ink-dim',
                      column.align === 'right' ? 'text-right' : 'text-left',
                      column.width,
                      column.hideOnMobile && 'hidden lg:table-cell',
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-ink-faint">
            {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, sorted.length)} de{' '}
            {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft />
            </Button>
            <span className="tabular px-1 text-xs text-ink-dim">
              {safePage + 1} / {pageCount}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
              aria-label="Próxima página"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
