import { AlertTriangle, Clapperboard, Clock, KanbanSquare, List, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { VideoCard } from '@/components/cards/VideoCard'
import { VideoForm } from '@/components/forms/VideoForm'
import { KanbanBoard, type KanbanColumnData } from '@/components/kanban/KanbanBoard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { FilterBar, type FilterConfig, type FilterValues } from '@/components/shared/FilterBar'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useClients } from '@/hooks/useClients'
import { useProjects } from '@/hooks/useProjects'
import { useVideoRevisions } from '@/hooks/useVideoRevisions'
import { useVideos } from '@/hooks/useVideos'
import { logStatusChange } from '@/lib/activity'
import { hoursSummary, overdueVideos, videosInProduction } from '@/lib/calculations'
import {
  applyStatusToChecklist,
  PRIORITY_LABEL,
  PRIORITY_WEIGHT,
  VIDEO_STATUS_LABEL,
  VIDEO_STATUS_ORDER,
  VIDEO_STATUS_SHORT,
  VIDEO_STATUS_TONE,
  VIDEO_TYPE_LABEL,
  toOptions,
} from '@/lib/constants'
import {
  cn,
  deadlineLabel,
  formatCurrency,
  formatHours,
  matchesQuery,
  sortBy,
  sumBy,
} from '@/lib/utils'
import { RevisionStatus, VideoStatus, type Video } from '@/types'

type View = 'kanban' | 'list'

export function ProductionPage() {
  const navigate = useNavigate()
  const { videos, update } = useVideos()
  const { clients, byId: clientById } = useClients()
  const { projects } = useProjects()
  const { revisions } = useVideoRevisions()

  const [searchParams, setSearchParams] = useSearchParams()
  const [localFilters, setLocalFilters] = useState<FilterValues>({})
  const [view, setView] = useState<View>('kanban')
  const [formOpen, setFormOpen] = useState(false)

  const statusFilter = searchParams.get('status') ?? ''
  const filters: FilterValues = { ...localFilters, status: statusFilter }

  function handleFilters(next: FilterValues) {
    const { status, ...rest } = next
    setLocalFilters(rest)
    const params = new URLSearchParams(searchParams)
    if (status) params.set('status', status)
    else params.delete('status')
    setSearchParams(params, { replace: true })
  }

  const clientName = (video: Video) => clientById(video.clientId)?.name ?? 'Cliente removido'

  /** Revisões ainda não concluídas, por vídeo. */
  const openRevisions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const revision of revisions) {
      if (revision.status === RevisionStatus.COMPLETED) continue
      counts.set(revision.videoId, (counts.get(revision.videoId) ?? 0) + 1)
    }
    return counts
  }, [revisions])

  const filterConfig: FilterConfig[] = [
    { key: 'search', label: 'Buscar', type: 'search', placeholder: 'Título, cliente ou projeto' },
    { key: 'status', label: 'Etapa', type: 'select', options: toOptions(VIDEO_STATUS_LABEL) },
    {
      key: 'clientId',
      label: 'Cliente',
      type: 'select',
      options: clients.map((client) => ({ value: client.id, label: client.name })),
    },
    { key: 'priority', label: 'Prioridade', type: 'select', options: toOptions(PRIORITY_LABEL) },
    { key: 'type', label: 'Tipo', type: 'select', options: toOptions(VIDEO_TYPE_LABEL) },
  ]

  const filtered = useMemo(
    () =>
      videos.filter((video) => {
        const query = filters.search ?? ''
        if (
          query &&
          !matchesQuery(video.title, query) &&
          !matchesQuery(clientById(video.clientId)?.name, query) &&
          !matchesQuery(projects.find((p) => p.id === video.projectId)?.name, query)
        ) {
          return false
        }
        if (filters.status && video.status !== filters.status) return false
        if (filters.clientId && video.clientId !== filters.clientId) return false
        if (filters.priority && video.priority !== filters.priority) return false
        if (filters.type && video.type !== filters.type) return false
        return true
      }),
    [
      videos,
      projects,
      clientById,
      filters.search,
      filters.status,
      filters.clientId,
      filters.priority,
      filters.type,
    ],
  )

  const columns: KanbanColumnData<Video>[] = useMemo(() => {
    const stages = filters.status ? [filters.status as VideoStatus] : VIDEO_STATUS_ORDER
    return stages.map((status) => {
      // Dentro da coluna, o prazo manda; a prioridade desempata.
      const items = sortBy(
        sortBy(
          filtered.filter((video) => video.status === status),
          (video) => PRIORITY_WEIGHT[video.priority],
          'desc',
        ),
        (video) => video.deadline ?? '9999-12-31',
      )

      return {
        id: status,
        title: VIDEO_STATUS_SHORT[status],
        tone: VIDEO_STATUS_TONE[status],
        items,
        subtitle: items.length ? formatCurrency(sumBy(items, (video) => video.value)) : undefined,
      }
    })
  }, [filtered, filters.status])

  function handleMove(videoId: string, toStatus: string) {
    const video = videos.find((item) => item.id === videoId)
    if (!video) return
    const status = toStatus as VideoStatus

    update(videoId, {
      status,
      // Mover na esteira marca no checklist tudo que a etapa implica.
      checklist: applyStatusToChecklist(status, video.checklist),
    })
    logStatusChange(
      'video',
      video.id,
      video.title,
      video.status,
      status,
      `${VIDEO_STATUS_LABEL[video.status]} → ${VIDEO_STATUS_LABEL[status]}`,
    )
  }

  const inProduction = videosInProduction(filtered)
  const overdue = overdueVideos(filtered)
  const hours = hoursSummary(inProduction)

  const tableColumns: Column<Video>[] = [
    {
      key: 'title',
      header: 'Vídeo',
      sortValue: (video) => video.title,
      render: (video) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{video.title}</p>
          <p className="truncate text-xs text-ink-faint">
            {clientName(video)} · {projects.find((p) => p.id === video.projectId)?.name ?? '—'}
          </p>
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
        const closed =
          video.status === VideoStatus.APPROVED || video.status === VideoStatus.DELIVERED
        const due = deadlineLabel(video.deadline, closed)
        return (
          <span className={cn('tabular', due.overdue && !closed ? 'font-medium text-danger' : '')}>
            {due.text}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produção"
        description="Esteira dos vídeos, do briefing à entrega."
        actions={
          <Button variant="primary" onClick={() => setFormOpen(true)}>
            <Plus />
            Novo vídeo
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Em produção"
          value={inProduction.length}
          icon={Clapperboard}
          hint={`${filtered.length} vídeos no recorte atual`}
        />
        <MetricCard
          label="Com prazo vencido"
          value={overdue.length}
          icon={AlertTriangle}
          tone={overdue.length > 0 ? 'danger' : undefined}
          trend="down"
          hint={overdue.length > 0 ? 'exigem replanejamento' : 'tudo dentro do prazo'}
        />
        <MetricCard
          label="Horas restantes"
          value={Math.max(0, hours.estimated - hours.worked)}
          format="hours"
          icon={Clock}
          hint={`${formatHours(hours.worked)} de ${formatHours(hours.estimated)} previstas`}
        />
        <MetricCard
          label="Valor em produção"
          value={sumBy(inProduction, (video) => video.value)}
          format="currency"
          hint="Ainda não aprovado nem entregue"
        />
      </section>

      <FilterBar filters={filterConfig} values={filters} onChange={handleFilters}>
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
          icon={Clapperboard}
          title="Nenhum vídeo encontrado"
          description={
            videos.length === 0
              ? 'Crie um vídeo ou use um template ao abrir um projeto.'
              : 'Nenhum vídeo corresponde aos filtros aplicados.'
          }
          actionLabel={videos.length === 0 ? 'Novo vídeo' : undefined}
          onAction={videos.length === 0 ? () => setFormOpen(true) : undefined}
        />
      ) : view === 'kanban' ? (
        <>
          <KanbanBoard
            columns={columns}
            getId={(video) => video.id}
            getLabel={(video) => video.title}
            renderCard={(video) => (
              <VideoCard
                video={video}
                clientName={clientName(video)}
                revisionCount={openRevisions.get(video.id) ?? 0}
              />
            )}
            onMove={handleMove}
            onOpen={(video) => navigate(`/videos/${video.id}`)}
          />
          <p className="text-xs text-ink-faint">
            Mover um card marca no checklist as etapas que a coluna implica. No teclado, as setas
            movem entre colunas e Enter abre o vídeo.
          </p>
        </>
      ) : (
        <DataTable
          columns={tableColumns}
          data={filtered}
          getRowId={(video) => video.id}
          onRowClick={(video) => navigate(`/videos/${video.id}`)}
          initialSort={{ key: 'deadline', direction: 'asc' }}
        />
      )}

      <VideoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={(video) => navigate(`/videos/${video.id}`)}
      />
    </div>
  )
}
