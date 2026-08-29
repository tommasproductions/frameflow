import {
  AlertTriangle,
  Clapperboard,
  Clock,
  FolderKanban,
  History,
  MoreVertical,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ProjectForm } from '@/components/forms/ProjectForm'
import { TaskForm } from '@/components/forms/TaskForm'
import { VideoForm } from '@/components/forms/VideoForm'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox, Progress } from '@/components/ui/misc'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useActivityLog } from '@/hooks/useActivityLog'
import { useClients } from '@/hooks/useClients'
import { useExpenses } from '@/hooks/useExpenses'
import { usePayments } from '@/hooks/usePayments'
import { useProjectMetrics } from '@/hooks/useProjectMetrics'
import { useProjects } from '@/hooks/useProjects'
import { useTasks } from '@/hooks/useTasks'
import { useVideos } from '@/hooks/useVideos'
import { logDeleted } from '@/lib/activity'
import {
  ACTIVITY_ACTION_LABEL,
  EXPENSE_CATEGORY_LABEL,
  PAYMENT_METHOD_LABEL,
  PRIORITY_WEIGHT,
  PROJECT_STATUS_LABEL,
  TASK_STATUS_LABEL,
  VIDEO_STATUS_LABEL,
  VIDEO_STATUS_ORDER,
  VIDEO_TYPE_LABEL,
} from '@/lib/constants'
import {
  cn,
  deadlineLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatHours,
  sortBy,
} from '@/lib/utils'
import {
  ProjectStatus,
  TaskStatus,
  VideoStatus,
  type Expense,
  type Payment,
  type Task,
  type Video,
} from '@/types'

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { byId, remove } = useProjects()
  const { byId: clientById } = useClients()
  const { videos, removeWhere: removeVideos } = useVideos()
  const { tasks, update: updateTask, removeWhere: removeTasks } = useTasks()
  const { payments } = usePayments()
  const { expenses } = useExpenses()
  const { entries } = useActivityLog()
  const metrics = useProjectMetrics(id)

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [videoOpen, setVideoOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)

  const project = byId(id)

  if (!project) {
    return (
      <div className="space-y-6">
        <PageHeader title="Projeto" breadcrumbs={[{ label: 'Projetos', to: '/projects' }]} />
        <EmptyState
          icon={FolderKanban}
          title="Projeto não encontrado"
          description="Ele pode ter sido removido ou o endereço está incorreto."
          actionLabel="Voltar para projetos"
          onAction={() => navigate('/projects')}
        />
      </div>
    )
  }

  const client = clientById(project.clientId)
  const projectVideos = sortBy(
    videos.filter((video) => video.projectId === project.id),
    (video) => video.deadline ?? '9999-12-31',
  )
  const projectTasks = sortBy(
    tasks.filter((task) => task.projectId === project.id),
    (task) => task.deadline ?? '9999-12-31',
  )
  const projectPayments = sortBy(
    payments.filter((payment) => payment.projectId === project.id),
    (payment) => payment.dueDate,
  )
  const projectExpenses = sortBy(
    expenses.filter((expense) => expense.projectId === project.id),
    (expense) => expense.date,
    'desc',
  )

  const scopeIds = new Set<string>([
    project.id,
    ...projectVideos.map((v) => v.id),
    ...projectTasks.map((t) => t.id),
    ...projectPayments.map((p) => p.id),
    ...projectExpenses.map((e) => e.id),
  ])
  const history = sortBy(
    entries.filter((entry) => scopeIds.has(entry.entityId)),
    (entry) => entry.createdAt,
    'desc',
  )

  const closed =
    project.status === ProjectStatus.COMPLETED || project.status === ProjectStatus.CANCELLED
  const due = deadlineLabel(project.deadline, closed)
  // A diferença entre o valor combinado e o que já virou cobrança é o que
  // ainda falta faturar — o tipo de coisa que passa despercebida sem um número.
  const notBilled = project.contractedValue - metrics.billed

  function handleDelete() {
    if (!project) return
    removeVideos((video) => video.projectId === project.id)
    removeTasks((task) => task.projectId === project.id)
    remove(project.id)
    logDeleted(
      'project',
      project.id,
      project.name,
      `${projectVideos.length} vídeos e ${projectTasks.length} tarefas removidos junto.`,
    )
    navigate('/projects')
  }

  /* ----------------------------- Colunas ----------------------------- */

  const videoColumns: Column<Video>[] = [
    {
      key: 'title',
      header: 'Vídeo',
      sortValue: (video) => video.title,
      render: (video) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{video.title}</p>
          <p className="truncate text-xs text-ink-faint">{VIDEO_TYPE_LABEL[video.type]}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Etapa',
      sortValue: (video) => VIDEO_STATUS_ORDER.indexOf(video.status),
      render: (video) => <StatusBadge type="video" status={video.status} />,
    },
    {
      key: 'priority',
      header: 'Prioridade',
      hideOnMobile: true,
      sortValue: (video) => PRIORITY_WEIGHT[video.priority],
      render: (video) => <PriorityBadge priority={video.priority} />,
    },
    {
      key: 'hours',
      header: 'Horas',
      align: 'right',
      hideOnMobile: true,
      sortValue: (video) => video.workedHours ?? 0,
      render: (video) => (
        <span className="tabular">
          {formatHours(video.workedHours)}
          <span className="text-ink-faint"> / {formatHours(video.estimatedHours)}</span>
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Valor',
      align: 'right',
      sortValue: (video) => video.value,
      render: (video) => <span className="tabular text-ink">{formatCurrency(video.value)}</span>,
    },
    {
      key: 'deadline',
      header: 'Prazo',
      align: 'right',
      sortValue: (video) => video.deadline ?? '9999-12-31',
      render: (video) => {
        const videoClosed =
          video.status === VideoStatus.APPROVED || video.status === VideoStatus.DELIVERED
        const videoDue = deadlineLabel(video.deadline, videoClosed)
        return (
          <span className={cn('tabular', videoDue.overdue ? 'font-medium text-danger' : '')}>
            {formatDate(video.deadline)}
          </span>
        )
      },
    },
  ]

  const taskColumns: Column<Task>[] = [
    {
      key: 'done',
      header: '',
      width: 'w-8',
      render: (task) => (
        <Checkbox
          checked={task.status === TaskStatus.DONE}
          onCheckedChange={(checked) =>
            updateTask(task.id, {
              status: checked === true ? TaskStatus.DONE : TaskStatus.TODO,
            })
          }
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
          {task.videoId ? (
            <p className="truncate text-xs text-ink-faint">
              {videos.find((v) => v.id === task.videoId)?.title ?? '—'}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (task) => TASK_STATUS_LABEL[task.status],
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
      key: 'deadline',
      header: 'Prazo',
      align: 'right',
      sortValue: (task) => task.deadline ?? '9999-12-31',
      render: (task) => {
        const taskDue = deadlineLabel(task.deadline, task.status === TaskStatus.DONE)
        return (
          <span
            className={cn(
              'tabular',
              taskDue.overdue && task.status !== TaskStatus.DONE ? 'font-medium text-danger' : '',
            )}
          >
            {taskDue.text}
          </span>
        )
      },
    },
  ]

  const paymentColumns: Column<Payment>[] = [
    {
      key: 'description',
      header: 'Recebimento',
      render: (payment) => <span className="font-medium text-ink">{payment.description}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (payment) => <StatusBadge type="payment" status={payment.status} />,
    },
    {
      key: 'method',
      header: 'Forma',
      hideOnMobile: true,
      render: (payment) => (payment.method ? PAYMENT_METHOD_LABEL[payment.method] : '—'),
    },
    {
      key: 'dueDate',
      header: 'Vencimento',
      align: 'right',
      render: (payment) => {
        const open = payment.status === 'pending' || payment.status === 'overdue'
        const paymentDue = deadlineLabel(payment.dueDate, !open)
        return (
          <span className={cn('tabular', open && paymentDue.overdue ? 'font-medium text-danger' : '')}>
            {formatDate(payment.dueDate)}
          </span>
        )
      },
    },
    {
      key: 'amount',
      header: 'Valor',
      align: 'right',
      render: (payment) => (
        <span className="tabular font-medium text-ink">{formatCurrency(payment.amount)}</span>
      ),
    },
  ]

  const expenseColumns: Column<Expense>[] = [
    {
      key: 'description',
      header: 'Custo',
      render: (expense) => <span className="font-medium text-ink">{expense.description}</span>,
    },
    {
      key: 'category',
      header: 'Categoria',
      render: (expense) => <Badge tone="neutral">{EXPENSE_CATEGORY_LABEL[expense.category]}</Badge>,
    },
    {
      key: 'date',
      header: 'Data',
      align: 'right',
      render: (expense) => <span className="tabular">{formatDate(expense.date)}</span>,
    },
    {
      key: 'amount',
      header: 'Valor',
      align: 'right',
      render: (expense) => (
        <span className="tabular font-medium text-danger">-{formatCurrency(expense.amount)}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={project.description ?? undefined}
        breadcrumbs={[
          { label: 'Projetos', to: '/projects' },
          ...(client ? [{ label: client.name, to: `/clients/${client.id}` }] : []),
          { label: project.name },
        ]}
        actions={
          <>
            <Button onClick={() => setVideoOpen(true)}>
              <Plus />
              Novo vídeo
            </Button>
            <Button onClick={() => setEditOpen(true)}>
              <Pencil />
              Editar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Mais ações">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setTaskOpen(true)}>
                  <Plus />
                  Nova tarefa
                </DropdownMenuItem>
                <DropdownMenuItem variant="danger" onSelect={() => setDeleteOpen(true)}>
                  <Trash2 />
                  Excluir projeto
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge type="project" status={project.status} dot />
        {project.type ? <Badge tone="neutral">{project.type}</Badge> : null}
        {client ? (
          <Link to={`/clients/${client.id}`} className="text-xs text-accent hover:underline">
            {client.name}
          </Link>
        ) : null}
        <span className="text-xs text-ink-faint">
          {formatDate(project.startDate)} → {formatDate(project.deadline)}
        </span>
        <span
          className={cn(
            'text-xs',
            due.overdue && !closed ? 'font-medium text-danger' : 'text-ink-faint',
          )}
        >
          {project.deadline ? due.text : 'sem prazo'}
        </span>
        {project.responsible ? (
          <span className="text-xs text-ink-faint">Responsável: {project.responsible}</span>
        ) : null}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="videos">Vídeos ({projectVideos.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas ({projectTasks.length})</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* ------------------------------ Visão geral ----------------------------- */}
        <TabsContent value="overview" className="space-y-4">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Valor contratado"
              value={project.contractedValue}
              format="currency"
              icon={Wallet}
              hint={
                notBilled > 0
                  ? `${formatCurrency(notBilled)} ainda não faturados`
                  : 'totalmente faturado'
              }
              tone={notBilled > 0 ? 'warning' : undefined}
            />
            <MetricCard
              label="Custos"
              value={metrics.expenses}
              format="currency"
              icon={Receipt}
              trend="down"
              hint={`${formatCurrency(project.estimatedCost)} estimados`}
            />
            <MetricCard
              label="Lucro"
              value={metrics.profit}
              format="currency"
              tone={metrics.profit < 0 ? 'danger' : undefined}
            />
            <MetricCard
              label="Margem"
              value={metrics.margin}
              format="percentage"
              tone={metrics.profit < 0 ? 'danger' : undefined}
            />
            <MetricCard
              label="Lucro por hora"
              value={metrics.profitPerHour}
              format="currency"
              icon={Clock}
              hint={`${formatHours(metrics.hoursWorked)} de ${formatHours(metrics.hoursEstimated)}`}
            />
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Vídeos entregues"
              value={metrics.deliveredCount}
              icon={Clapperboard}
              hint={`${metrics.videoCount} no total`}
            />
            <MetricCard
              label="Em produção"
              value={metrics.inProductionCount}
              icon={metrics.overdueCount > 0 ? AlertTriangle : Clapperboard}
              tone={metrics.overdueCount > 0 ? 'danger' : undefined}
              hint={
                metrics.overdueCount > 0
                  ? `${metrics.overdueCount} com prazo vencido`
                  : 'todos dentro do prazo'
              }
            />
            <MetricCard
              label="A receber"
              value={metrics.receivable}
              format="currency"
              tone={metrics.overdue > 0 ? 'danger' : undefined}
              hint={
                metrics.overdue > 0 ? `${formatCurrency(metrics.overdue)} vencidos` : 'nada vencido'
              }
            />
            <MetricCard
              label="Tarefas em aberto"
              value={metrics.openTaskCount}
              hint={`${metrics.taskCount} no total`}
            />
          </section>

          <Card>
            <CardHeader>
              <div className="min-w-0 flex-1">
                <CardTitle>Progresso da produção</CardTitle>
                <p className="text-xs text-ink-dim">
                  {metrics.deliveredCount} de {metrics.videoCount} vídeos aprovados ou entregues.
                </p>
              </div>
              <span className="tabular shrink-0 text-xs text-ink-faint">
                {Math.round(metrics.progress)}%
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress
                value={metrics.progress}
                tone={metrics.progress === 100 ? 'success' : 'accent'}
              />
              {projectVideos.length === 0 ? (
                <EmptyState
                  size="inline"
                  icon={Clapperboard}
                  title="Nenhum vídeo"
                  description="Adicione vídeos ao projeto para acompanhar a esteira."
                  actionLabel="Novo vídeo"
                  onAction={() => setVideoOpen(true)}
                />
              ) : (
                <DataTable
                  columns={videoColumns}
                  data={projectVideos.slice(0, 5)}
                  getRowId={(video) => video.id}
                  onRowClick={(video) => navigate(`/videos/${video.id}`)}
                />
              )}
            </CardContent>
          </Card>

          {project.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm whitespace-pre-line text-ink-dim">{project.notes}</p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* --------------------------------- Vídeos ------------------------------- */}
        <TabsContent value="videos">
          {projectVideos.length === 0 ? (
            <EmptyState
              icon={Clapperboard}
              title="Nenhum vídeo"
              description="Adicione vídeos ao projeto para acompanhar a produção."
              actionLabel="Novo vídeo"
              onAction={() => setVideoOpen(true)}
            />
          ) : (
            <DataTable
              columns={videoColumns}
              data={projectVideos}
              getRowId={(video) => video.id}
              onRowClick={(video) => navigate(`/videos/${video.id}`)}
              initialSort={{ key: 'deadline', direction: 'asc' }}
            />
          )}
        </TabsContent>

        {/* -------------------------------- Tarefas ------------------------------- */}
        <TabsContent value="tasks">
          {projectTasks.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="Nenhuma tarefa"
              description="Registre o que precisa acontecer neste projeto."
              actionLabel="Nova tarefa"
              onAction={() => setTaskOpen(true)}
            />
          ) : (
            <DataTable
              columns={taskColumns}
              data={projectTasks}
              getRowId={(task) => task.id}
              initialSort={{ key: 'deadline', direction: 'asc' }}
            />
          )}
        </TabsContent>

        {/* ------------------------------- Financeiro ----------------------------- */}
        <TabsContent value="financial" className="space-y-4">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Faturado" value={metrics.billed} format="currency" />
            <MetricCard label="Recebido" value={metrics.received} format="currency" />
            <MetricCard
              label="A receber"
              value={metrics.receivable}
              format="currency"
              tone={metrics.overdue > 0 ? 'warning' : undefined}
            />
            <MetricCard label="Custos" value={metrics.expenses} format="currency" trend="down" />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Recebimentos</CardTitle>
              <span className="tabular text-xs text-ink-faint">{formatCurrency(metrics.billed)}</span>
            </CardHeader>
            <CardContent className="pt-0">
              {projectPayments.length === 0 ? (
                <EmptyState
                  size="inline"
                  icon={Wallet}
                  title="Nenhuma cobrança"
                  description={`O valor combinado é ${formatCurrency(project.contractedValue)}, mas ainda não há recebimentos lançados.`}
                />
              ) : (
                <DataTable
                  columns={paymentColumns}
                  data={projectPayments}
                  getRowId={(payment) => payment.id}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custos</CardTitle>
              <span className="tabular text-xs text-ink-faint">
                {formatCurrency(metrics.expenses)}
              </span>
            </CardHeader>
            <CardContent className="pt-0">
              {projectExpenses.length === 0 ? (
                <EmptyState
                  size="inline"
                  icon={Receipt}
                  title="Nenhum custo"
                  description="Custos gerais, sem projeto vinculado, não entram nesta conta."
                />
              ) : (
                <DataTable
                  columns={expenseColumns}
                  data={projectExpenses}
                  getRowId={(expense) => expense.id}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------------------- Histórico ----------------------------- */}
        <TabsContent value="history">
          {history.length === 0 ? (
            <EmptyState
              icon={History}
              title="Sem histórico"
              description="As alterações no projeto e nos seus vídeos aparecerão aqui."
            />
          ) : (
            <ol className="relative space-y-4 pl-5">
              <span aria-hidden className="absolute top-1 bottom-1 left-[3px] w-px bg-line" />
              {history.map((entry) => (
                <li key={entry.id} className="relative">
                  <span
                    aria-hidden
                    className="absolute top-1.5 -left-5 size-[7px] rounded-full bg-line-active ring-4 ring-canvas"
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{entry.entityName}</p>
                    <span className="tabular shrink-0 text-xs text-ink-faint">
                      {formatDateTime(entry.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{ACTIVITY_ACTION_LABEL[entry.action]}</Badge>
                    {entry.previousValue && entry.newValue ? (
                      <span className="text-xs text-ink-faint">
                        {statusLabel(entry.entityType, entry.previousValue)} →{' '}
                        <span className="text-ink-dim">
                          {statusLabel(entry.entityType, entry.newValue)}
                        </span>
                      </span>
                    ) : null}
                  </div>
                  {entry.details ? (
                    <p className="mt-1 text-sm text-ink-dim">{entry.details}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </TabsContent>
      </Tabs>

      <ProjectForm open={editOpen} onOpenChange={setEditOpen} project={project} />

      <VideoForm
        open={videoOpen}
        onOpenChange={setVideoOpen}
        defaultProjectId={project.id}
        onSaved={(video) => navigate(`/videos/${video.id}`)}
      />

      <TaskForm
        open={taskOpen}
        onOpenChange={setTaskOpen}
        defaults={{ clientId: project.clientId, projectId: project.id }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir projeto?"
        confirmLabel="Excluir projeto e conteúdo"
        message={
          <>
            <strong className="text-ink">{project.name}</strong>, seus {projectVideos.length} vídeos
            e {projectTasks.length} tarefas serão removidos. Os lançamentos financeiros{' '}
            <strong className="text-ink">não</strong> são apagados — eles continuam no financeiro do
            cliente, sem vínculo com o projeto.
          </>
        }
        onConfirm={handleDelete}
      />
    </div>
  )
}

/** Traduz o valor cru de status guardado no histórico. */
function statusLabel(entityType: string, value: string): string {
  if (entityType === 'video' && value in VIDEO_STATUS_LABEL) {
    return VIDEO_STATUS_LABEL[value as keyof typeof VIDEO_STATUS_LABEL]
  }
  if (entityType === 'project' && value in PROJECT_STATUS_LABEL) {
    return PROJECT_STATUS_LABEL[value as keyof typeof PROJECT_STATUS_LABEL]
  }
  if (entityType === 'task' && value in TASK_STATUS_LABEL) {
    return TASK_STATUS_LABEL[value as keyof typeof TASK_STATUS_LABEL]
  }
  return value
}
