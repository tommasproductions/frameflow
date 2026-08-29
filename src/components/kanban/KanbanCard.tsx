import { useDraggable } from '@dnd-kit/core'
import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** Quanto o ponteiro precisa andar para o gesto contar como arraste, não clique. */
const DRAG_THRESHOLD = 6

/**
 * Card do quadro: arrastável com o ponteiro, operável pelo teclado.
 *
 * Dois problemas resolvidos aqui:
 *
 * 1. Depois de arrastar, o navegador ainda dispara `click` no elemento — o que
 *    abriria o detalhe toda vez que o card fosse movido. Medimos o
 *    deslocamento do ponteiro e engolimos o clique quando passa do limiar.
 *
 * 2. O arraste por teclado do dnd-kit não funciona num quadro que rola na
 *    horizontal: o auto-scroll acompanha o deslocamento e as colunas andam
 *    junto com o card. Em vez de brigar com isso, as setas movem o card uma
 *    coluna por vez, direto — mais previsível do que empurrar pixels.
 *
 * `touch-none` é obrigatório: sem ele o navegador rola a página em vez de
 * deixar o dnd-kit tratar o toque.
 */
export function KanbanCard({
  id,
  children,
  onOpen,
  onMoveRelative,
  label,
  autoFocus = false,
  disabled = false,
}: {
  id: string
  children: ReactNode
  /** Clique, Enter ou Espaço. */
  onOpen?: () => void
  /** Setas esquerda/direita: -1 e +1 coluna. */
  onMoveRelative?: (delta: -1 | 1) => void
  /** Descrição para leitores de tela. */
  label?: string
  /** Recebe o foco ao montar — usado para o foco seguir um card movido. */
  autoFocus?: boolean
  disabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled })
  const node = useRef<HTMLDivElement | null>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const dragged = useRef(false)

  useEffect(() => {
    if (autoFocus) node.current?.focus()
  }, [autoFocus])

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    origin.current = { x: event.clientX, y: event.clientY }
    dragged.current = false
    listeners?.onPointerDown?.(event)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!origin.current || dragged.current) return
    const dx = event.clientX - origin.current.x
    const dy = event.clientY - origin.current.y
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) dragged.current = true
  }

  return (
    <div
      ref={(element) => {
        node.current = element
        setNodeRef(element)
      }}
      {...attributes}
      {...listeners}
      aria-label={label}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onClickCapture={(event) => {
        if (dragged.current) {
          event.preventDefault()
          event.stopPropagation()
          return
        }
        onOpen?.()
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          if (!onMoveRelative) return
          event.preventDefault()
          onMoveRelative(event.key === 'ArrowRight' ? 1 : -1)
          return
        }
        if ((event.key === 'Enter' || event.key === ' ') && onOpen) {
          event.preventDefault()
          onOpen()
        }
      }}
      className={cn(
        'touch-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
        !disabled && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
    >
      {children}
    </div>
  )
}
