import { CalendarDays } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { usePeriod } from '@/app/period'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCalendarItems, type CalendarItem } from '@/hooks/useCalendarView'
import { CALENDAR_EVENT_LABEL, CALENDAR_EVENT_TONE, TONE_FILL } from '@/lib/constants'
import { cn, formatDate, isSameMonth, sortBy, toISODate, today } from '@/lib/utils'
import { CalendarEventType } from '@/types'

const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

/**
 * Dias da grade: o mês inteiro mais o resto das semanas nas pontas, começando
 * na segunda-feira. Sempre 6 linhas, para a grade não pular de altura ao
 * trocar de mês.
 */
function buildGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  // getDay(): 0 = domingo. Convertido para segunda = 0.
  const offset = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - offset)

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}

export function CalendarPage() {
  const navigate = useNavigate()
  const { month, label, setMonth } = usePeriod()
  const items = useCalendarItems()

  const [types, setTypes] = useState<Set<CalendarEventType>>(new Set())
  const [selected, setSelected] = useState<string | null>(null)

  const visible = useMemo(
    () => (types.size === 0 ? items : items.filter((item) => types.has(item.type))),
    [items, types],
  )

  /** Itens por dia, para a grade não varrer a lista inteira 42 vezes. */
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>()
    for (const item of visible) {
      const list = map.get(item.date)
      if (list) list.push(item)
      else map.set(item.date, [item])
    }
    for (const list of map.values()) {
      list.sort((a, b) => Number(a.settled) - Number(b.settled))
    }
    return map
  }, [visible])

  const grid = useMemo(() => buildGrid(month), [month])
  const currentDay = today()
  const monthItems = sortBy(
    visible.filter((item) => isSameMonth(item.date, month)),
    (item) => item.date,
  )

  function toggleType(type: CalendarEventType) {
    setTypes((current) => {
      const next = new Set(current)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const selectedItems = selected ? (byDay.get(selected) ?? []) : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário"
        description={`Prazos, entregas, cobranças e follow-ups de ${label.toLowerCase()}.`}
        actions={
          <Button
            onClick={() => {
              const now = new Date()
              setMonth(now)
              setSelected(toISODate(now))
            }}
          >
            Hoje
          </Button>
        }
      />

      {/* Filtro por tipo: nenhum selecionado significa todos. */}
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(CALENDAR_EVENT_LABEL) as CalendarEventType[]).map((type) => {
          const active = types.size === 0 || types.has(type)
          const count = visible.filter(
            (item) => item.type === type && isSameMonth(item.date, month),
          ).length
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              aria-pressed={types.has(type)}
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors',
                active
                  ? 'border-line-active bg-card text-ink'
                  : 'border-line text-ink-faint hover:text-ink-dim',
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  TONE_FILL[CALENDAR_EVENT_TONE[type]],
                  !active && 'opacity-40',
                )}
              />
              {CALENDAR_EVENT_LABEL[type]}
              <span className="tabular text-ink-faint">{count}</span>
            </button>
          )
        })}
        {types.size > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => setTypes(new Set())}>
            Mostrar todos
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-line">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="px-2 py-2 text-center text-xs font-medium text-ink-faint capitalize"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {grid.map((day) => {
              const iso = toISODate(day)
              const dayItems = byDay.get(iso) ?? []
              const inMonth = day.getMonth() === month.getMonth()
              const isToday = iso === currentDay
              const isSelected = iso === selected

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelected(isSelected ? null : iso)}
                  className={cn(
                    'flex min-h-24 flex-col gap-1 border-r border-b border-line p-1.5 text-left transition-colors last:border-r-0',
                    'hover:bg-hover focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none',
                    !inMonth && 'bg-canvas/60',
                    isSelected && 'bg-accent/8 ring-1 ring-accent/40 ring-inset',
                  )}
                >
                  <span
                    className={cn(
                      'tabular flex size-5 shrink-0 items-center justify-center rounded-full text-xs',
                      isToday
                        ? 'bg-accent font-semibold text-white'
                        : inMonth
                          ? 'text-ink-dim'
                          : 'text-ink-faint',
                    )}
                  >
                    {day.getDate()}
                  </span>

                  <div className="flex min-w-0 flex-col gap-0.5">
                    {dayItems.slice(0, 3).map((item) => (
                      <span
                        key={item.id}
                        title={item.title}
                        className={cn(
                          'flex items-center gap-1 truncate rounded-sm px-1 py-0.5 text-[11px] leading-tight',
                          item.settled ? 'text-ink-faint line-through' : 'text-ink-dim',
                        )}
                      >
                        <span
                          className={cn(
                            'size-1 shrink-0 rounded-full',
                            TONE_FILL[CALENDAR_EVENT_TONE[item.type]],
                          )}
                        />
                        <span className="truncate">{item.title}</span>
                      </span>
                    ))}
                    {dayItems.length > 3 ? (
                      <span className="px-1 text-[11px] text-ink-faint">
                        +{dayItems.length - 3}
                      </span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{selected ? formatDate(selected) : 'Selecione um dia'}</CardTitle>
              {selected ? (
                <span className="tabular text-xs text-ink-faint">{selectedItems.length}</span>
              ) : null}
            </CardHeader>
            <CardContent className="pt-0">
              {!selected ? (
                <p className="py-2 text-sm text-ink-faint">
                  Clique em um dia da grade para ver o que acontece nele.
                </p>
              ) : selectedItems.length === 0 ? (
                <p className="py-2 text-sm text-ink-faint">Nada marcado neste dia.</p>
              ) : (
                <ul className="divide-y divide-line/60">
                  {selectedItems.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        disabled={!item.to}
                        onClick={() => item.to && navigate(item.to)}
                        className={cn(
                          '-mx-2 flex w-[calc(100%+1rem)] items-start gap-2 rounded-md px-2 py-2 text-left transition-colors',
                          item.to && 'hover:bg-hover',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-1.5 size-1.5 shrink-0 rounded-full',
                            TONE_FILL[CALENDAR_EVENT_TONE[item.type]],
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'block truncate text-sm font-medium',
                              item.settled ? 'text-ink-faint line-through' : 'text-ink',
                            )}
                          >
                            {item.title}
                          </span>
                          <span className="block truncate text-xs text-ink-faint">
                            {CALENDAR_EVENT_LABEL[item.type]}
                            {item.detail ? ` · ${item.detail}` : ''}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tudo no mês</CardTitle>
              <span className="tabular text-xs text-ink-faint">{monthItems.length}</span>
            </CardHeader>
            <CardContent className="pt-0">
              {monthItems.length === 0 ? (
                <EmptyState
                  size="inline"
                  icon={CalendarDays}
                  title="Mês vazio"
                  description="Nenhum prazo, cobrança ou follow-up neste mês."
                />
              ) : (
                <ul className="max-h-96 divide-y divide-line/60 overflow-y-auto">
                  {monthItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 py-2">
                      <span className="tabular w-10 shrink-0 text-xs text-ink-faint">
                        {formatDate(item.date).slice(0, 5)}
                      </span>
                      <Badge tone={CALENDAR_EVENT_TONE[item.type]}>
                        {CALENDAR_EVENT_LABEL[item.type]}
                      </Badge>
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate text-sm',
                          item.settled ? 'text-ink-faint line-through' : 'text-ink-dim',
                        )}
                      >
                        {item.title}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-xs text-ink-faint">
        Prazos, cobranças, tarefas e follow-ups são derivados dos próprios registros — mudar um
        prazo atualiza o calendário na hora. Itens riscados já foram concluídos.
      </p>
    </div>
  )
}
