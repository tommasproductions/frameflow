import { AlertTriangle, Clapperboard, FolderKanban, LayoutGrid, List, Plus, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ProjectCard } from '@/components/cards/ProjectCard'
import { ProjectForm } from '@/components/forms/ProjectForm'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { FilterBar, type FilterConfig, type FilterValues } from '@/components/shared/FilterBar'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/misc'
import { useClients } from '@/hooks/useClients'
import { EMPTY_PROJECT_METRICS, useAllProjectMetrics } from '@/hooks/useProjectMetrics'
import { useProjects } from '@/hooks/useProjects'
import { PROJECT_STATUS_LABEL, toOptions } from '@/lib/constants'
import { cn, deadlineLabel, formatCurrency, matchesQuery, sumBy } from '@/lib/utils'
import { ProjectStatus, type Project } from '@/types'

type View = 'cards' | 'list'

export function ProjectsPage() {
  const navigate = useNavigate()
  const { projects } = useProjects()
  const { clients, byId: clientById } = useClients()
  const metricsById = useAllProjectMetrics()

  const [filters, setFilters] = useState<FilterValues>({})
  const [view, setView] = useState<View>('cards')
  const [formOpen, setFormOpen] = useState(false)

  const metricsFor = (project: Project) => metricsById.get(project.id) ?? EMPTY_PROJECT_METRICS
  const clientName = (project: Project) => clientById(project.clientId)?.name ?? 'Cliente removido'

  const types = useMemo(
    () =>
      [...new Set(projects.map((p) => p.type).filter((t): t is string => Boolean(t)))]
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .map((type) => ({ value: type, label: type })),
    [projects],
  )

  const filterConfig: FilterConfig[] = [
    { key: 'search', label: 'Buscar', type: 'search', placeholder: 'Nome, cliente ou descrição' },
    { key: 'status', label: 'Status', type: 'select', options: toOptions(PROJECT_STATUS_LABEL) },
    {
      key: 'clientId',
      label: 'Cliente',
      type: 'select',
      options: clients.map((client) => ({ value: client.id, label: client.name })),
    },
    { key: 'type', label: 'Tipo', type: 'select', options: types },
  ]

  const filtered = useMemo(
    () =>
      projects.filter((project) => {
        const query = filters.search ?? ''
        if (
          query &&
          !matchesQuery(project.name, query) &&
          !matchesQuery(clientById(project.clientId)?.name, query) &&
          !matchesQuery(project.description, query)
        ) {
          return false
        }
        if (filters.status && project.status !== filters.status) return false
        if (filters.clientId && project.clientId !== filters.clientId) return false
        if (filters.type && project.type !== filters.type) return false
        return true
      }),
    [projects, filters.search, filters.status, filters.clientId, filters.type, clientById],
  )

  const totals = useMemo(() => {
    const contracted = sumBy(filtered, (project) => project.contractedValue)
    let profit = 0
    let overdueVideos = 0
    let inProduction = 0
    for (const project of filtered) {
      const m = metricsFor(project)
      profit += m.profit
      overdueVideos += m.overdueCount
      inProduction += m.inProductionCount
    }
    return {
      contracted,
      profit,
      overdueVideos,
      inProduction,
      active: filtered.filter((p) => p.status === ProjectStatus.ACTIVE).length,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, metricsById])

  const columns: Column<Project>[] = [
    {
      key: 'name',
      header: 'Projeto',
      sortValue: (project) => project.name,
      render: (project) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{project.name}</p>
          <p className="truncate text-xs text-ink-faint">
            {clientName(project)}
            {project.type ? ` · ${project.type}` : ''}
          </p>
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
      key: 'progress',
      header: 'Progresso',
      width: 'w-40',
      hideOnMobile: true,
      sortValue: (project) => metricsFor(project).progress,
      render: (project) => {
        const m = metricsFor(project)
        return (
          <div className="space-y-1">
            <Progress value={m.progress} tone={m.progress === 100 ? 'success' : 'accent'} />
            <span className="tabular text-xs text-ink-faint">
              {m.deliveredCount}/{m.videoCount} vídeos
            </span>
          </div>
        )
      },
    },
    {
      key: 'value',
      header: 'Contratado',
      align: 'right',
      sortValue: (project) => project.contractedValue,
      render: (project) => (
        <span className="tabular text-ink">{formatCurrency(project.contractedValue)}</span>
      ),
    },
    {
      key: 'profit',
      header: 'Lucro',
      align: 'right',
      hideOnMobile: true,
      sortValue: (project) => metricsFor(project).profit,
      render: (project) => {
        const { profit } = metricsFor(project)
        return (
          <span className={cn('tabular', profit < 0 ? 'text-danger' : 'text-ink')}>
            {formatCurrency(profit)}
          </span>
        )
      },
    },
    {
      key: 'deadline',
      header: 'Prazo',
      align: 'right',
      sortValue: (project) => project.deadline ?? '9999-12-31',
      render: (project) => {
        const closed =
          project.status === ProjectStatus.COMPLETED || project.status === ProjectStatus.CANCELLED
        const due = deadlineLabel(project.deadline, closed)
        return (
          <span className={cn('tabular', due.overdue && !closed ? 'font-medium text-danger' : '')}>
            {due.text}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projetos"
        description="Escopo contratado, andamento e resultado de cada projeto."
        actions={
          <Button variant="primary" onClick={() => setFormOpen(true)}>
            <Plus />
            Novo projeto
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Projetos ativos"
          value={totals.active}
          icon={FolderKanban}
          hint={`${filtered.length} no recorte atual`}
        />
        <MetricCard
          label="Valor contratado"
          value={totals.contracted}
          format="currency"
          icon={Wallet}
        />
        <MetricCard
          label="Lucro"
          value={totals.profit}
          format="currency"
          tone={totals.profit < 0 ? 'danger' : undefined}
        />
        <MetricCard
          label="Vídeos em produção"
          value={totals.inProduction}
          icon={totals.overdueVideos > 0 ? AlertTriangle : Clapperboard}
          tone={totals.overdueVideos > 0 ? 'danger' : undefined}
          hint={
            totals.overdueVideos > 0
              ? `${totals.overdueVideos} com prazo vencido`
              : 'todos dentro do prazo'
          }
        />
      </section>

      <FilterBar filters={filterConfig} values={filters} onChange={setFilters}>
        <div className="flex items-center rounded-md border border-line p-0.5">
          <Button
            variant={view === 'cards' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setView('cards')}
            aria-pressed={view === 'cards'}
          >
            <LayoutGrid />
            Cards
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
          icon={FolderKanban}
          title="Nenhum projeto encontrado"
          description={
            projects.length === 0
              ? 'Abra o primeiro projeto para começar a organizar a produção.'
              : 'Nenhum projeto corresponde aos filtros aplicados.'
          }
          actionLabel={projects.length === 0 ? 'Novo projeto' : undefined}
          onAction={projects.length === 0 ? () => setFormOpen(true) : undefined}
        />
      ) : view === 'cards' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              clientName={clientName(project)}
              metrics={metricsFor(project)}
              onClick={() => navigate(`/projects/${project.id}`)}
            />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowId={(project) => project.id}
          onRowClick={(project) => navigate(`/projects/${project.id}`)}
          initialSort={{ key: 'deadline', direction: 'asc' }}
        />
      )}

      <ProjectForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={(project) => navigate(`/projects/${project.id}`)}
      />
    </div>
  )
}
