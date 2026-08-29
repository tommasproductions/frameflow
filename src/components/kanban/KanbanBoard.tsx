import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useMemo, useState, type ReactNode } from 'react'

import { KanbanCard } from '@/components/kanban/KanbanCard'
import { KanbanColumn } from '@/components/kanban/KanbanColumn'
import type { Tone } from '@/lib/constants'

/**
 * Com o ponteiro, a coluna sob o cursor é a resposta certa e mais precisa.
 * `closestCorners` cobre o caso em que o cursor cai num vão entre colunas.
 */
const collisionDetection: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args)
  return underPointer.length > 0 ? underPointer : closestCorners(args)
}

export interface KanbanColumnData<T> {
  id: string
  title: string
  items: T[]
  tone?: Tone
  /** Linha auxiliar no cabeçalho — normalmente o valor somado da coluna. */
  subtitle?: string
}

export interface KanbanBoardProps<T> {
  columns: KanbanColumnData<T>[]
  getId: (item: T) => string
  renderCard: (item: T) => ReactNode
  /** Chamado só quando o item muda de coluna. */
  onMove: (itemId: string, toColumnId: string) => void
  /** Nome legível do item, para os avisos de leitor de tela. */
  getLabel?: (item: T) => string
  /** Clique, Enter ou Espaço num card. */
  onOpen?: (item: T) => void
}

/**
 * Board genérico de arrastar entre colunas.
 *
 * Não há reordenação dentro da coluna: o que importa nos quadros do produto
 * (funil, esteira de produção e tarefas) é em qual etapa o item está, e a ordem
 * dentro da etapa é derivada dos dados, não escolhida à mão.
 *
 * O mouse arrasta; o teclado move com as setas, sem simular um arraste. O
 * arraste por teclado do dnd-kit não funciona aqui porque o quadro rola na
 * horizontal e o auto-scroll anula o deslocamento — mover uma coluna por tecla
 * é mais direto e mais previsível de qualquer forma.
 */
export function KanbanBoard<T>({
  columns,
  getId,
  renderCard,
  onMove,
  getLabel,
  onOpen,
}: KanbanBoardProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null)
  /** Card movido pelo teclado: o foco o segue até a nova coluna. */
  const [focusId, setFocusId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  // Uma distância mínima antes de iniciar o arraste, para que um clique no card
  // continue abrindo o detalhe em vez de virar um gesto.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const index = useMemo(() => {
    const map = new Map<string, { item: T; columnId: string }>()
    for (const column of columns) {
      for (const item of column.items) map.set(getId(item), { item, columnId: column.id })
    }
    return map
  }, [columns, getId])

  const active = activeId ? index.get(activeId) : undefined

  const describe = (id: string) => {
    const entry = index.get(id)
    if (!entry) return 'item'
    return getLabel && entry.item ? getLabel(entry.item) : 'item'
  }

  const columnTitle = (id: string) => columns.find((column) => column.id === id)?.title ?? id

  const announcements: Announcements = {
    onDragStart: ({ active: dragged }) => `Segurando ${describe(String(dragged.id))}.`,
    onDragOver: ({ active: dragged, over }) =>
      over
        ? `${describe(String(dragged.id))} sobre a coluna ${columnTitle(String(over.id))}.`
        : `${describe(String(dragged.id))} fora de qualquer coluna.`,
    onDragEnd: ({ active: dragged, over }) =>
      over
        ? `${describe(String(dragged.id))} movido para ${columnTitle(String(over.id))}.`
        : `${describe(String(dragged.id))} devolvido à posição original.`,
    onDragCancel: ({ active: dragged }) =>
      `Movimentação de ${describe(String(dragged.id))} cancelada.`,
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active: dragged, over } = event
    if (!over) return

    const target = String(over.id)
    const source = index.get(String(dragged.id))?.columnId
    if (!source || source === target) return

    onMove(String(dragged.id), target)
  }

  /** Move o item para a coluna vizinha, pelo teclado. */
  function moveRelative(itemId: string, fromColumnId: string, delta: -1 | 1) {
    const position = columns.findIndex((column) => column.id === fromColumnId)
    const target = columns[position + delta]
    if (!target) return

    onMove(itemId, target.id)
    setFocusId(itemId)
    setAnnouncement(`${describe(itemId)} movido para ${target.title}.`)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{ announcements }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-2">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            count={column.items.length}
            tone={column.tone}
            subtitle={column.subtitle}
          >
            {column.items.map((item) => {
              const itemId = getId(item)
              return (
                <KanbanCard
                  key={itemId}
                  id={itemId}
                  label={getLabel?.(item)}
                  autoFocus={focusId === itemId}
                  onOpen={onOpen ? () => onOpen(item) : undefined}
                  onMoveRelative={(delta) => moveRelative(itemId, column.id, delta)}
                >
                  {renderCard(item)}
                </KanbanCard>
              )
            })}
          </KanbanColumn>
        ))}
      </div>

      {/* Avisa o movimento por teclado; o arraste com mouse usa os
          announcements do próprio dnd-kit. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <DragOverlay dropAnimation={null}>
        {active ? (
          <div className="w-60 rotate-2 cursor-grabbing opacity-95 shadow-2xl shadow-black/50">
            {renderCard(active.item)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
