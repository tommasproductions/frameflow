import { KanbanSquare, List, Plus, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { LeadCard } from '@/components/cards/LeadCard'
import { LeadForm } from '@/components/forms/LeadForm'
import { KanbanBoard, type KanbanColumnData } from '@/components/kanban/KanbanBoard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { FilterBar, type FilterConfig, type FilterValues } from '@/components/shared/FilterBar'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useLeads } from '@/hooks/useLeads'
import { logStatusChange } from '@/lib/activity'
import { conversionRate, pipelineValue, weightedPipelineValue } from '@/lib/calculations'
import {
  LEAD_SOURCE_LABEL,
  LEAD_STAGE_LABEL,
  LEAD_STAGE_ORDER,
  LEAD_STAGE_TONE,
  nextProbability,
  toOptions,
} from '@/lib/constants'
import { leadActivitiesStore } from '@/lib/store'
import {
  cn,
  deadlineLabel,
  formatCurrency,
  matchesQuery,
  sortBy,
  sumBy,
  today,
} from '@/lib/utils'
import { LeadStage, type Lead } from '@/types'

type View = 'kanban' | 'list'

export function LeadsPage() {
  const navigate = useNavigate()
  const { leads, update } = useLeads()

  // A etapa vive na URL: o dashboard linka para `/leads?stage=meeting`, e assim
  // o recorte continua compartilhável e sobrevive ao voltar do navegador.
  const [searchParams, setSearchParams] = useSearchParams()
  const [localFilters, setLocalFilters] = useState<FilterValues>({})
  const [view, setView] = useState<View>('kanban')
  const [formOpen, setFormOpen] = useState(false)
  const [formStage, setFormStage] = useState<LeadStage>(LeadStage.NEW)

  const stageFilter = searchParams.get('stage') ?? ''
  const filters: FilterValues = { ...localFilters, stage: stageFilter }

  function handleFilters(next: FilterValues) {
    const { stage, ...rest } = next
    setLocalFilters(rest)
    const params = new URLSearchParams(searchParams)
    if (stage) params.set('stage', stage)
    else params.delete('stage')
    setSearchParams(params, { replace: true })
  }

  const niches = useMemo(
    () =>
      [...new Set(leads.map((lead) => lead.niche).filter((n): n is string => Boolean(n)))]
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .map((niche) => ({ value: niche, label: niche })),
    [leads],
  )

  const filterConfig: FilterConfig[] = [
    { key: 'search', label: 'Buscar', type: 'search', placeholder: 'Nome, empresa ou serviço' },
    { key: 'stage', label: 'Etapa', type: 'select', options: toOptions(LEAD_STAGE_LABEL) },
    { key: 'source', label: 'Origem', type: 'select', options: toOptions(LEAD_SOURCE_LABEL) },
    { key: 'niche', label: 'Nicho', type: 'select', options: niches },
  ]

  const filtered = useMemo(
    () =>
      leads.filter((lead) => {
        const query = filters.search ?? ''
        if (
          query &&
          !matchesQuery(lead.name, query) &&
          !matchesQuery(lead.company, query) &&
          !matchesQuery(lead.niche, query) &&
          !matchesQuery(lead.desiredService, query)
        ) {
          return false
        }
        if (filters.source && lead.source !== filters.source) return false
        if (filters.niche && lead.niche !== filters.niche) return false
        if (filters.stage && lead.stage !== filters.stage) return false
        return true
      }),
    [leads, filters.search, filters.source, filters.niche, filters.stage],
  )

  const columns: KanbanColumnData<Lead>[] = useMemo(() => {
    const stages = filters.stage ? [filters.stage as LeadStage] : LEAD_STAGE_ORDER
    return stages.map((stage) => {
      const items = filtered.filter((lead) => lead.stage === stage)
      // Quem tem follow-up marcado vem primeiro, do mais urgente ao mais
      // distante; o resto desce ordenado por valor.
      const withFollowUp = sortBy(
        items.filter((lead) => lead.nextFollowUpDate),
        (lead) => lead.nextFollowUpDate,
      )
      const withoutFollowUp = sortBy(
        items.filter((lead) => !lead.nextFollowUpDate),
        (lead) => lead.potentialValue ?? 0,
        'desc',
      )
      const ordered = [...withFollowUp, ...withoutFollowUp]

      return {
        id: stage,
        title: LEAD_STAGE_LABEL[stage],
        tone: LEAD_STAGE_TONE[stage],
        items: ordered,
        subtitle: ordered.length
          ? formatCurrency(sumBy(ordered, (lead) => lead.potentialValue))
          : undefined,
      }
    })
  }, [filtered, filters.stage])

  function handleMove(leadId: string, toStage: string) {
    const lead = leads.find((item) => item.id === leadId)
    if (!lead) return
    const stage = toStage as LeadStage

    update(leadId, {
      stage,
      closeProbability: nextProbability(lead.closeProbability, lead.stage, stage),
    })
    logStatusChange(
      'lead',
      lead.id,
      lead.name,
      lead.stage,
      stage,
      `${LEAD_STAGE_LABEL[lead.stage]} → ${LEAD_STAGE_LABEL[stage]}`,
    )
    leadActivitiesStore.create({
      leadId: lead.id,
      type: 'stage_change',
      title: `Movido para ${LEAD_STAGE_LABEL[stage].toLowerCase()}`,
      description: `Etapa anterior: ${LEAD_STAGE_LABEL[lead.stage].toLowerCase()}.`,
      date: today(),
    })
  }

  const openLeads = filtered.filter(
    (lead) => lead.stage !== LeadStage.CLOSED && lead.stage !== LeadStage.LOST,
  )
  const closedCount = leads.filter((lead) => lead.stage === LeadStage.CLOSED).length

  const tableColumns: Column<Lead>[] = [
    {
      key: 'name',
      header: 'Lead',
      sortValue: (lead) => lead.name,
      render: (lead) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{lead.name}</p>
          <p className="truncate text-xs text-ink-faint">
            {[lead.company, lead.niche].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'Etapa',
      sortValue: (lead) => LEAD_STAGE_ORDER.indexOf(lead.stage),
      render: (lead) => <StatusBadge type="lead" status={lead.stage} />,
    },
    {
      key: 'value',
      header: 'Valor',
      align: 'right',
      sortValue: (lead) => lead.potentialValue ?? 0,
      render: (lead) => (
        <span className="tabular text-ink">{formatCurrency(lead.potentialValue)}</span>
      ),
    },
    {
      key: 'probability',
      header: 'Prob.',
      align: 'right',
      hideOnMobile: true,
      sortValue: (lead) => lead.closeProbability ?? 0,
      render: (lead) => (
        <span className="tabular">
          {lead.closeProbability === null ? '—' : `${lead.closeProbability}%`}
        </span>
      ),
    },
    {
      key: 'source',
      header: 'Origem',
      hideOnMobile: true,
      sortValue: (lead) => LEAD_SOURCE_LABEL[lead.source],
      render: (lead) => LEAD_SOURCE_LABEL[lead.source],
    },
    {
      key: 'followUp',
      header: 'Follow-up',
      align: 'right',
      sortValue: (lead) => lead.nextFollowUpDate ?? '9999-12-31',
      render: (lead) => {
        if (!lead.nextFollowUpDate) return <span className="text-ink-faint">—</span>
        const due = deadlineLabel(lead.nextFollowUpDate)
        return (
          <span className={cn(due.overdue ? 'font-medium text-danger' : 'text-ink-dim')}>
            {due.text}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Funil comercial, do primeiro contato ao fechamento."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setFormStage((filters.stage as LeadStage) || LeadStage.NEW)
              setFormOpen(true)
            }}
          >
            <Plus />
            Novo lead
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Oportunidades abertas"
          value={openLeads.length}
          icon={Target}
          hint={`${filtered.length} leads no recorte atual`}
        />
        <MetricCard
          label="Valor em aberto"
          value={pipelineValue(filtered)}
          format="currency"
          hint="Soma do valor potencial"
        />
        <MetricCard
          label="Valor ponderado"
          value={weightedPipelineValue(filtered)}
          format="currency"
          hint="Ajustado pela probabilidade de cada lead"
        />
        <MetricCard
          label="Taxa de conversão"
          value={conversionRate(closedCount, leads.length)}
          format="percentage"
          hint={`${closedCount} de ${leads.length} leads fechados`}
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
          icon={Target}
          title="Nenhum lead encontrado"
          description={
            leads.length === 0
              ? 'Cadastre a primeira oportunidade para começar a acompanhar o funil.'
              : 'Nenhum lead corresponde aos filtros aplicados.'
          }
          actionLabel={leads.length === 0 ? 'Novo lead' : undefined}
          onAction={leads.length === 0 ? () => setFormOpen(true) : undefined}
        />
      ) : view === 'kanban' ? (
        <>
          <KanbanBoard
            columns={columns}
            getId={(lead) => lead.id}
            getLabel={(lead) => lead.name}
            renderCard={(lead) => <LeadCard lead={lead} />}
            onMove={handleMove}
            onOpen={(lead) => navigate(`/leads/${lead.id}`)}
          />
          <p className="text-xs text-ink-faint">
            Arraste um card para mudar de etapa. No teclado, as setas movem entre colunas e Enter
            abre o lead.
          </p>
        </>
      ) : (
        <DataTable
          columns={tableColumns}
          data={filtered}
          getRowId={(lead) => lead.id}
          onRowClick={(lead) => navigate(`/leads/${lead.id}`)}
          initialSort={{ key: 'followUp', direction: 'asc' }}
        />
      )}

      <LeadForm
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultStage={formStage}
        onSaved={(lead) => navigate(`/leads/${lead.id}`)}
      />
    </div>
  )
}
