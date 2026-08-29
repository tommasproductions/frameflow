import {
  Clapperboard,
  FolderKanban,
  History,
  MoreVertical,
  Pencil,
  Receipt,
  Target,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ClientForm } from '@/components/forms/ClientForm'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ContactList } from '@/components/shared/ContactList'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useActivityLog } from '@/hooks/useActivityLog'
import { useClientMetrics } from '@/hooks/useClientMetrics'
import { useClients } from '@/hooks/useClients'
import { useContracts } from '@/hooks/useContracts'
import { useExpenses } from '@/hooks/useExpenses'
import { useLeads } from '@/hooks/useLeads'
import { usePayments } from '@/hooks/usePayments'
import { useProjects } from '@/hooks/useProjects'
import { useVideos } from '@/hooks/useVideos'
import { logDeleted } from '@/lib/activity'
import {
  ACTIVITY_ACTION_LABEL,
  CONTRACT_FREQUENCY_LABEL,
  EXPENSE_CATEGORY_LABEL,
  LEAD_SOURCE_LABEL,
  PAYMENT_METHOD_LABEL,
  PROJECT_STATUS_LABEL,
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
  initials,
  sortBy,
} from '@/lib/utils'
import {
  VideoStatus,
  type Contract,
  type Expense,
  type Payment,
  type Project,
  type Video,
} from '@/types'

export function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { byId, remove } = useClients()
  const { projects } = useProjects()
  const { videos } = useVideos()
  const { payments } = usePayments()
  const { expenses } = useExpenses()
  const { contracts } = useContracts()
  const { leads } = useLeads()
  const { entries } = useActivityLog()
  const metrics = useClientMetrics(id)

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const client = byId(id)

  if (!client) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cliente" breadcrumbs={[{ label: 'Clientes', to: '/clients' }]} />
        <EmptyState
          icon={Users}
          title="Cliente não encontrado"
          description="Ele pode ter sido removido ou o endereço está incorreto."
          actionLabel="Voltar para a carteira"
          onAction={() => navigate('/clients')}
        />
      </div>
    )
  }

  const clientProjects = sortBy(
    projects.filter((project) => project.clientId === client.id),
    (project) => project.startDate ?? project.createdAt,
    'desc',
  )
  const clientVideos = sortBy(
    videos.filter((video) => video.clientId === client.id),
    (video) => video.deadline ?? '9999-12-31',
  )
  const clientPayments = sortBy(
    payments.filter((payment) => payment.clientId === client.id),
    (payment) => payment.dueDate,
    'desc',
  )
  const clientExpenses = sortBy(
    expenses.filter((expense) => expense.clientId === client.id),
    (expense) => expense.date,
    'desc',
  )
  const clientContracts = contracts.filter((contract) => contract.clientId === client.id)
  const originLead = leads.find((lead) => lead.convertedToClientId === client.id)

  // O histórico da conta inclui o que aconteceu nos projetos e vídeos dela —
  // senão a aba mostraria só as edições do cadastro.
  const scopeIds = new Set<string>([
    client.id,
    ...clientProjects.map((project) => project.id),
    ...clientVideos.map((video) => video.id),
    ...clientPayments.map((payment) => payment.id),
    ...clientExpenses.map((expense) => expense.id),
    ...(originLead ? [originLead.id] : []),
  ])
  const history = sortBy(
    entries.filter((entry) => scopeIds.has(entry.entityId)),
    (entry) => entry.createdAt,
    'desc',
  )

  function handleDelete() {
    if (!client) return
    remove(client.id)
    logDeleted(
      'client',
      client.id,
      client.name,
      clientProjects.length > 0
        ? `${clientProjects.length} projetos permaneceram sem cliente.`
        : undefined,
    )
    navigate('/clients')
  }

  /* ----------------------------- Colunas ----------------------------- */

  const projectColumns: Column<Project>[] = [
    {
      key: 'name',
      header: 'Projeto',
      sortValue: (project) => project.name,
      render: (project) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{project.name}</p>
          <p className="truncate text-xs text-ink-faint">{project.type ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (project) => PROJECT_STATUS_LABEL[project.status],
      render: (project) => <StatusBadge type="project" status={project.status} />,
    },
    {
      key: 'videos',
      header: 'Vídeos',
      align: 'right',
      hideOnMobile: true,
      sortValue: (project) => videos.filter((v) => v.projectId === project.id).length,
      render: (project) => (
        <span className="tabular">{videos.filter((v) => v.projectId === project.id).length}</span>
      ),
    },
    {
      key: 'value',
      header: 'Valor',
      align: 'right',
      sortValue: (project) => project.contractedValue,
      render: (project) => (
        <span className="tabular text-ink">{formatCurrency(project.contractedValue)}</span>
      ),
    },
    {
      key: 'deadline',
      header: 'Prazo',
      align: 'right',
      sortValue: (project) => project.deadline ?? '9999-12-31',
      render: (project) => <span className="tabular">{formatDate(project.deadline)}</span>,
    },
  ]

  const videoColumns: Column<Video>[] = [
    {
      key: 'title',
      header: 'Vídeo',
      sortValue: (video) => video.title,
      render: (video) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{video.title}</p>
          <p className="truncate text-xs text-ink-faint">
            {projects.find((p) => p.id === video.projectId)?.name ?? '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      hideOnMobile: true,
      sortValue: (video) => VIDEO_TYPE_LABEL[video.type],
      render: (video) => VIDEO_TYPE_LABEL[video.type],
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (video) => VIDEO_STATUS_ORDER.indexOf(video.status),
      render: (video) => <StatusBadge type="video" status={video.status} />,
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
        const closed =
          video.status === VideoStatus.APPROVED || video.status === VideoStatus.DELIVERED
        const due = deadlineLabel(video.deadline, closed)
        return (
          <span className={cn('tabular', due.overdue && !closed ? 'font-medium text-danger' : '')}>
            {formatDate(video.deadline)}
          </span>
        )
      },
    },
  ]

  const paymentColumns: Column<Payment>[] = [
    {
      key: 'description',
      header: 'Recebimento',
      sortValue: (payment) => payment.description,
      render: (payment) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{payment.description}</p>
          <p className="truncate text-xs text-ink-faint">
            {projects.find((p) => p.id === payment.projectId)?.name ?? 'Sem projeto'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (payment) => payment.status,
      render: (payment) => <StatusBadge type="payment" status={payment.status} />,
    },
    {
      key: 'method',
      header: 'Forma',
      hideOnMobile: true,
      sortValue: (payment) => (payment.method ? PAYMENT_METHOD_LABEL[payment.method] : ''),
      render: (payment) => (payment.method ? PAYMENT_METHOD_LABEL[payment.method] : '—'),
    },
    {
      key: 'dueDate',
      header: 'Vencimento',
      align: 'right',
      sortValue: (payment) => payment.dueDate,
      render: (payment) => {
        const open = payment.status === 'pending' || payment.status === 'overdue'
        const due = deadlineLabel(payment.dueDate, !open)
        return (
          <span className={cn('tabular', open && due.overdue ? 'font-medium text-danger' : '')}>
            {formatDate(payment.dueDate)}
          </span>
        )
      },
    },
    {
      key: 'amount',
      header: 'Valor',
      align: 'right',
      sortValue: (payment) => payment.amount,
      render: (payment) => (
        <span className="tabular font-medium text-ink">{formatCurrency(payment.amount)}</span>
      ),
    },
  ]

  const expenseColumns: Column<Expense>[] = [
    {
      key: 'description',
      header: 'Custo',
      sortValue: (expense) => expense.description,
      render: (expense) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{expense.description}</p>
          <p className="truncate text-xs text-ink-faint">
            {projects.find((p) => p.id === expense.projectId)?.name ?? 'Sem projeto'}
          </p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoria',
      sortValue: (expense) => EXPENSE_CATEGORY_LABEL[expense.category],
      render: (expense) => <Badge tone="neutral">{EXPENSE_CATEGORY_LABEL[expense.category]}</Badge>,
    },
    {
      key: 'date',
      header: 'Data',
      align: 'right',
      sortValue: (expense) => expense.date,
      render: (expense) => <span className="tabular">{formatDate(expense.date)}</span>,
    },
    {
      key: 'amount',
      header: 'Valor',
      align: 'right',
      sortValue: (expense) => expense.amount,
      render: (expense) => (
        <span className="tabular font-medium text-danger">-{formatCurrency(expense.amount)}</span>
      ),
    },
  ]

  const contractColumns: Column<Contract>[] = [
    {
      key: 'frequency',
      header: 'Contrato',
      render: (contract) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">
            {CONTRACT_FREQUENCY_LABEL[contract.frequency]}
          </p>
          <p className="truncate text-xs text-ink-faint">
            {contract.videoQuantity ? `${contract.videoQuantity} vídeos` : 'Sem meta de volume'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (contract) => <StatusBadge type="contract" status={contract.status} />,
    },
    {
      key: 'start',
      header: 'Início',
      align: 'right',
      hideOnMobile: true,
      render: (contract) => <span className="tabular">{formatDate(contract.startDate)}</span>,
    },
    {
      key: 'renewal',
      header: 'Renovação',
      align: 'right',
      render: (contract) => {
        if (!contract.renewalDate) return <span className="text-ink-faint">—</span>
        const due = deadlineLabel(contract.renewalDate)
        return (
          <span className={cn('tabular', due.overdue ? 'font-medium text-warning' : '')}>
            {formatDate(contract.renewalDate)}
          </span>
        )
      },
    },
    {
      key: 'value',
      header: 'Valor',
      align: 'right',
      render: (contract) => (
        <span className="tabular font-medium text-ink">{formatCurrency(contract.value)}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        description={[client.company, client.niche].filter(Boolean).join(' · ') || undefined}
        breadcrumbs={[{ label: 'Clientes', to: '/clients' }, { label: client.name }]}
        actions={
          <>
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
                <DropdownMenuItem variant="danger" onSelect={() => setDeleteOpen(true)}>
                  <Trash2 />
                  Excluir cliente
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-sm font-semibold text-accent">
          {initials(client.name)}
        </span>
        <StatusBadge type="client" status={client.status} dot />
        <Badge tone="neutral">{LEAD_SOURCE_LABEL[client.source]}</Badge>
        <span className="text-xs text-ink-faint">Cliente desde {formatDate(client.entryDate)}</span>
        {originLead ? (
          <Link to={`/leads/${originLead.id}`} className="flex items-center gap-1.5 text-xs text-accent hover:underline">
            <Target className="size-3" />
            Veio do lead {originLead.name}
          </Link>
        ) : null}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="projects">Projetos ({clientProjects.length})</TabsTrigger>
          <TabsTrigger value="videos">Vídeos ({clientVideos.length})</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* ------------------------------ Visão geral ----------------------------- */}
        <TabsContent value="overview" className="space-y-4">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Receita total"
              value={metrics.contracted}
              format="currency"
              icon={Wallet}
              hint={`${formatCurrency(metrics.received)} recebidos`}
            />
            <MetricCard
              label="Custos"
              value={metrics.expenses}
              format="currency"
              icon={Receipt}
              trend="down"
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
              label="Ticket médio"
              value={metrics.averageTicket}
              format="currency"
              hint={`${metrics.projectCount} projetos`}
            />
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Projetos ativos"
              value={metrics.activeProjectCount}
              icon={FolderKanban}
              hint={`${metrics.projectCount} no total`}
            />
            <MetricCard
              label="Vídeos entregues"
              value={metrics.deliveredVideoCount}
              icon={Clapperboard}
              hint={`${metrics.videoCount} no total`}
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
              label="Lucro por hora"
              value={metrics.profitPerHour}
              format="currency"
              hint={`${formatHours(metrics.hoursWorked)} trabalhadas de ${formatHours(metrics.hoursEstimated)} previstas`}
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <Card>
              <CardHeader>
                <CardTitle>Projetos recentes</CardTitle>
                {clientProjects.length > 0 ? (
                  <span className="tabular text-xs text-ink-faint">{clientProjects.length}</span>
                ) : null}
              </CardHeader>
              <CardContent className="pt-0">
                {clientProjects.length === 0 ? (
                  <EmptyState
                    size="inline"
                    icon={FolderKanban}
                    title="Nenhum projeto"
                    description="Este cliente ainda não tem trabalho contratado."
                  />
                ) : (
                  <DataTable
                    columns={projectColumns}
                    data={clientProjects.slice(0, 5)}
                    getRowId={(project) => project.id}
                    onRowClick={(project) => navigate(`/projects/${project.id}`)}
                  />
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contato</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ContactList contact={client} />
                </CardContent>
              </Card>

              {client.notes ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Observações</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm whitespace-pre-line text-ink-dim">{client.notes}</p>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>

          {clientContracts.length > 0 ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Contratos</CardTitle>
                  <p className="text-xs text-ink-dim">
                    {formatCurrency(metrics.mrr)} por mês em recorrência ativa.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <DataTable
                  columns={contractColumns}
                  data={clientContracts}
                  getRowId={(contract) => contract.id}
                />
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* -------------------------------- Projetos ------------------------------ */}
        <TabsContent value="projects">
          {clientProjects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="Nenhum projeto"
              description="Os projetos deste cliente aparecerão aqui."
            />
          ) : (
            <DataTable
              columns={projectColumns}
              data={clientProjects}
              getRowId={(project) => project.id}
              onRowClick={(project) => navigate(`/projects/${project.id}`)}
              initialSort={{ key: 'deadline', direction: 'desc' }}
            />
          )}
        </TabsContent>

        {/* --------------------------------- Vídeos ------------------------------- */}
        <TabsContent value="videos">
          {clientVideos.length === 0 ? (
            <EmptyState
              icon={Clapperboard}
              title="Nenhum vídeo"
              description="Os vídeos produzidos para este cliente aparecerão aqui."
            />
          ) : (
            <DataTable
              columns={videoColumns}
              data={clientVideos}
              getRowId={(video) => video.id}
              onRowClick={(video) => navigate(`/videos/${video.id}`)}
              initialSort={{ key: 'deadline', direction: 'asc' }}
            />
          )}
        </TabsContent>

        {/* ------------------------------- Financeiro ----------------------------- */}
        <TabsContent value="financial" className="space-y-4">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Recebido" value={metrics.received} format="currency" />
            <MetricCard
              label="A receber"
              value={metrics.receivable}
              format="currency"
              tone={metrics.overdue > 0 ? 'warning' : undefined}
            />
            <MetricCard
              label="Vencido"
              value={metrics.overdue}
              format="currency"
              tone={metrics.overdue > 0 ? 'danger' : undefined}
            />
            <MetricCard label="Custos" value={metrics.expenses} format="currency" trend="down" />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Recebimentos</CardTitle>
              <span className="tabular text-xs text-ink-faint">
                {formatCurrency(metrics.contracted)}
              </span>
            </CardHeader>
            <CardContent className="pt-0">
              {clientPayments.length === 0 ? (
                <EmptyState
                  size="inline"
                  icon={Wallet}
                  title="Nenhum recebimento"
                  description="Ainda não há cobranças lançadas para este cliente."
                />
              ) : (
                <DataTable
                  columns={paymentColumns}
                  data={clientPayments}
                  getRowId={(payment) => payment.id}
                  initialSort={{ key: 'dueDate', direction: 'desc' }}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custos diretos</CardTitle>
              <span className="tabular text-xs text-ink-faint">
                {formatCurrency(metrics.expenses)}
              </span>
            </CardHeader>
            <CardContent className="pt-0">
              {clientExpenses.length === 0 ? (
                <EmptyState
                  size="inline"
                  icon={Receipt}
                  title="Nenhum custo"
                  description="Custos gerais, sem cliente vinculado, não entram nesta conta."
                />
              ) : (
                <DataTable
                  columns={expenseColumns}
                  data={clientExpenses}
                  getRowId={(expense) => expense.id}
                  initialSort={{ key: 'date', direction: 'desc' }}
                />
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-ink-faint">
            Lucro e margem usam a receita contratada ({formatCurrency(metrics.contracted)}), não
            apenas o que já entrou em caixa — é a leitura de rentabilidade da conta.
          </p>
        </TabsContent>

        {/* -------------------------------- Histórico ----------------------------- */}
        <TabsContent value="history">
          {history.length === 0 ? (
            <EmptyState
              icon={History}
              title="Sem histórico"
              description="As alterações feitas nesta conta e nos seus projetos aparecerão aqui."
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

      <ClientForm open={editOpen} onOpenChange={setEditOpen} client={client} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir cliente?"
        confirmLabel="Excluir"
        message={
          <>
            <strong className="text-ink">{client.name}</strong> sai da carteira. Os{' '}
            {clientProjects.length} projetos e {clientVideos.length} vídeos vinculados{' '}
            <strong className="text-ink">não</strong> são apagados — eles ficam órfãos e precisam ser
            reatribuídos ou removidos à mão.
          </>
        }
        onConfirm={handleDelete}
      />
    </div>
  )
}

/**
 * O histórico guarda o valor cru do status. Traduz conforme a entidade para
 * que a linha do tempo não mostre `sent_to_client`.
 */
function statusLabel(entityType: string, value: string): string {
  if (entityType === 'video' && value in VIDEO_STATUS_LABEL) {
    return VIDEO_STATUS_LABEL[value as keyof typeof VIDEO_STATUS_LABEL]
  }
  if (entityType === 'project' && value in PROJECT_STATUS_LABEL) {
    return PROJECT_STATUS_LABEL[value as keyof typeof PROJECT_STATUS_LABEL]
  }
  return value
}
