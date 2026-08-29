import { AlertTriangle, CircleCheck, KanbanSquare, List, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { TaskForm } from '@/components/forms/TaskForm'
import { KanbanBoard, type KanbanColumnData } from '@/components/kanban/KanbanBoard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { FilterBar, type FilterConfig, type FilterValues } from '@/components/shared/FilterBar'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { PriorityBadge, PriorityDot } from '@/components/shared/PriorityBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/misc'
import { useClients } from '@/hooks/useClients'
import { useProjects } from '@/hooks/useProjects'
import { useTasks } from '@/hooks/useTasks'
import { useVideos } from '@/hooks/useVideos'
import { logStatusChange } from '@/lib/activity'
import { overdueTasks } from '@/lib/calculations'
import {
  PRIORITY_LABEL,
  PRIORITY_WEIGHT,
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
  TASK_STATUS_TONE,
  toOptions,
} from '@/lib/constants'
import { cn, deadlineLabel, isToday, matchesQuery, sortBy } from '@/lib/utils'
import { Priority, TaskStatus, type Task } from '@/types'

type View = 'kanban' | 'list'

export function TasksPage() {
  const navigate = useNavigate()
  const { tasks, update } = useTasks()
  const { clients, byId: clientById } = useClients()
  const { byId: projectById } = useProjects()
  const { byId: videoById } = useVideos()

  const [filters, setFilters] = useState<FilterValues>({})
  const [view, setView] = useState<View>('kanban')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | undefined>(undefined)

  const filterConfig: FilterConfig[] = [
    { key: 'search', label: 'Buscar', type: 'search', placeholder: 'Título ou descrição' },
    { key: 'status', label: 'Status', type: 'select', options: toOptions(TASK_STATUS_LABEL) },
    { key: 'priority', label: 'Prioridade', type: 'select', options: toOptions(PRIORITY_LABEL) },
    {
      key: 'clientId',
      label: 'Cliente',
      type: 'select',
      options: clients.map((client) => ({ value: client.id, label: client.name })),
    },
  ]

  const filtered = useMemo(
    () =>
      tasks.filter((task) => {
        const query = filters.search ?? ''
        if (query && !matchesQuery(task.title, query) && !matchesQuery(task.description, query)) {
          return false
        }
        if (filters.status && task.status !== filters.status) return false
        if (filters.priority && task.priority !== filters.priority) return false
        if (filters.clientId && task.clientId !== filters.clientId) return false
        return true
      }),
    [tasks, filters.search, filters.status, filters.priority, filters.clientId],
  )

  const columns: KanbanColumnData<Task>[] = useMemo(() => {
    const statuses = filters.status ? [filters.status as TaskStatus] : TASK_STATUS_ORDER
    return statuses.map((status) => {
      // Prazo primeiro, prioridade como desempate — a mesma ordem da esteira.
      const items = sortBy(
        sortBy(
          filtered.filter((task) => task.status === status),
          (task) => PRIORITY_WEIGHT[task.priority],
          'desc',
        ),
        (task) => task.deadline ?? '9999-12-31',
      )
      return {
        id: status,
        title: TASK_STATUS_LABEL[status],
        tone: TASK_STATUS_TONE[status],
        items,
      }
    })
  }, [filtered, filters.status])

  function handleMove(taskId: string, toStatus: string) {
    const task = tasks.find((item) => item.id === taskId)
    if (!task) return
    const status = toStatus as TaskStatus

    update(taskId, { status })
    logStatusChange(
      'task',
      task.id,
      task.title,
      task.status,
      status,
      `${TASK_STATUS_LABEL[task.status]} → ${TASK_STATUS_LABEL[status]}`,
    )
  }

  function toggleDone(task: Task, done: boolean) {
    const status = done ? TaskStatus.DONE : TaskStatus.TODO
    update(task.id, { status })
    logStatusChange('task', task.id, task.title, task.status, status)
  }

  /** Onde a tarefa está pendurada, do mais específico ao mais geral. */
  function context(task: Task): string {
    const video = videoById(task.videoId)
    if (video) return video.title
    const project = projectById(task.projectId)
    if (project) return project.name
    return clientById(task.clientId)?.name ?? 'Sem vínculo'
  }

  function openTask(task: Task) {
    // A tarefa não tem página própria; abrir significa editar. Quando ela
    // aponta para um vídeo, ir para o vídeo é mais útil.
    if (task.videoId) {
      navigate(`/videos/${task.videoId}`)
      return
    }
    setEditing(task)
    setFormOpen(true)
  }

  const open = filtered.filter((task) => task.status !== TaskStatus.DONE)
  const late = overdueTasks(filtered)
  const dueToday = open.filter((task) => isToday(task.deadline))
  const urgent = open.filter((task) => task.priority === Priority.URGENT)

  const tableColumns: Column<Task>[] = [
    {
      key: 'done',
      header: '',
      width: 'w-8',
      render: (task) => (
        <Checkbox
          checked={task.status === TaskStatus.DONE}
          onCheckedChange={(checked) => toggleDone(task, checked === true)}
          aria-label={`Concluir ${task.title}`}
        />
      ),
    },
    {
      key: 'title',
      header: 'Tarefa',
      sortValue: (task) => task.title,
      render: (task) => (
        <div className="min-w-0">
          <p
            className={cn(
              'truncate font-medium',
              task.status === TaskStatus.DONE ? 'text-ink-faint line-through' : 'text-ink',
            )}
          >
            {task.title}
          </p>
          <p className="truncate text-xs text-ink-faint">{context(task)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (task) => TASK_STATUS_ORDER.indexOf(task.status),
      render: (task) => <StatusBadge type="task" status={task.status} />,
    },
    {
      key: 'priority',
      header: 'Prioridade',
      hideOnMobile: true,
      sortValue: (task) => PRIORITY_WEIGHT[task.priority],
      render: (task) => <PriorityBadge priority={task.priority} />,
    },
    {
      key: 'responsible',
      header: 'Responsável',
      hideOnMobile: true,
      sortValue: (task) => task.responsible ?? '',
      render: (task) => task.responsible ?? '—',
    },
    {
      key: 'deadline',
      header: 'Prazo',
      align: 'right',
      sortValue: (task) => task.deadline ?? '9999-12-31',
      render: (task) => {
        const due = deadlineLabel(task.deadline, task.status === TaskStatus.DONE)
        return (
          <span
            className={cn(
              'tabular',
              due.overdue && task.status !== TaskStatus.DONE ? 'font-medium text-danger' : '',
            )}
          >
            {due.text}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tarefas"
        description="Tudo que precisa ser feito, por prazo e prioridade."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            <Plus />
            Nova tarefa
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Em aberto"
          value={open.length}
          icon={CircleCheck}
          hint={`${filtered.length} tarefas no recorte atual`}
        />
        <MetricCard
          label="Atrasadas"
          value={late.length}
          icon={AlertTriangle}
          trend="down"
          tone={late.length > 0 ? 'danger' : undefined}
          hint={late.length > 0 ? 'prazo já vencido' : 'nada vencido'}
        />
        <MetricCard
          label="Para hoje"
          value={dueToday.length}
          tone={dueToday.length > 0 ? 'warning' : undefined}
        />
        <MetricCard
          label="Urgentes"
          value={urgent.length}
          tone={urgent.length > 0 ? 'danger' : undefined}
          hint="ainda em aberto"
        />
      </section>

      <FilterBar filters={filterConfig} values={filters} onChange={setFilters}>
        <div className="flex items-center rounded-md border border-line p-0.5">
          <Button
            variant={view === 'kanban' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setView('kanban')}
            aria-pressed={view === 'kanban'}
          >
            <KanbanSquare />
            Kanban
          </Button>
          <Button
            variant={view === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setView('list')}
            aria-pressed={view === 'list'}
          >
            <List />
            Lista
          </Button>
        </div>
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CircleCheck}
          title="Nenhuma tarefa encontrada"
          description={
            tasks.length === 0
              ? 'Registre o que precisa ser feito para não depender da memória.'
              : 'Nenhuma tarefa corresponde aos filtros aplicados.'
          }
          actionLabel={tasks.length === 0 ? 'Nova tarefa' : undefined}
          onAction={tasks.length === 0 ? () => setFormOpen(true) : undefined}
        />
      ) : view === 'kanban' ? (
        <>
          <KanbanBoard
            columns={columns}
            getId={(task) => task.id}
            getLabel={(task) => task.title}
            renderCard={(task) => {
              const due = deadlineLabel(task.deadline, task.status === TaskStatus.DONE)
              return (
                <article className="rounded-lg border border-line bg-card p-2.5 transition-colors hover:border-line-active hover:bg-hover">
                  <div className="flex items-start gap-2">
                    <PriorityDot priority={task.priority} className="mt-1.5" />
                    <h4
                      className={cn(
                        'min-w-0 flex-1 text-sm leading-snug font-medium',
                        task.status === TaskStatus.DONE
                          ? 'text-ink-faint line-through'
                          : 'text-ink',
                      )}
                    >
                      {task.title}
                    </h4>
                  </div>
                  <p className="mt-1 truncate text-xs text-ink-dim">{context(task)}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2 text-xs">
                    <span
                      className={cn(
                        due.overdue && task.status !== TaskStatus.DONE
                          ? 'font-medium text-danger'
                          : 'text-ink-faint',
                      )}
                    >
                      {due.text}
                    </span>
                    {task.responsible ? (
                      <span className="truncate text-ink-faint">{task.responsible}</span>
                    ) : null}
                  </div>
                </article>
              )
            }}
            onMove={handleMove}
            onOpen={openTask}
          />
          <p className="text-xs text-ink-faint">
            Arraste para mudar o status, ou use as setas no teclado. Tarefas ligadas a um vídeo
            abrem a página do vídeo; as demais abrem para edição.
          </p>
        </>
      ) : (
        <DataTable
          columns={tableColumns}
          data={filtered}
          getRowId={(task) => task.id}
          onRowClick={openTask}
          initialSort={{ key: 'deadline', direction: 'asc' }}
        />
      )}

      <TaskForm open={formOpen} onOpenChange={setFormOpen} task={editing} />
    </div>
  )
}
