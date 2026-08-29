import { LayoutGrid, List, Plus, TrendingUp, Users, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ClientCard } from '@/components/cards/ClientCard'
import { ClientForm } from '@/components/forms/ClientForm'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { FilterBar, type FilterConfig, type FilterValues } from '@/components/shared/FilterBar'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useClients } from '@/hooks/useClients'
import { EMPTY_CLIENT_METRICS, useAllClientMetrics } from '@/hooks/useClientMetrics'
import { CLIENT_STATUS_LABEL, LEAD_SOURCE_LABEL, toOptions } from '@/lib/constants'
import { cn, formatCurrency, formatPercent, initials, matchesQuery } from '@/lib/utils'
import { ClientStatus, type Client } from '@/types'

type View = 'cards' | 'list'

export function ClientsPage() {
  const navigate = useNavigate()
  const { clients } = useClients()
  const metricsById = useAllClientMetrics()

  const [filters, setFilters] = useState<FilterValues>({})
  const [view, setView] = useState<View>('cards')
  const [formOpen, setFormOpen] = useState(false)

  const metricsFor = (client: Client) => metricsById.get(client.id) ?? EMPTY_CLIENT_METRICS

  const niches = useMemo(
    () =>
      [...new Set(clients.map((client) => client.niche).filter((n): n is string => Boolean(n)))]
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .map((niche) => ({ value: niche, label: niche })),
    [clients],
  )

  const filterConfig: FilterConfig[] = [
    { key: 'search', label: 'Buscar', type: 'search', placeholder: 'Nome, empresa ou nicho' },
    { key: 'status', label: 'Status', type: 'select', options: toOptions(CLIENT_STATUS_LABEL) },
    { key: 'source', label: 'Origem', type: 'select', options: toOptions(LEAD_SOURCE_LABEL) },
    { key: 'niche', label: 'Nicho', type: 'select', options: niches },
  ]

  const filtered = useMemo(
    () =>
      clients.filter((client) => {
        const query = filters.search ?? ''
        if (
          query &&
          !matchesQuery(client.name, query) &&
          !matchesQuery(client.company, query) &&
          !matchesQuery(client.niche, query)
        ) {
          return false
        }
        if (filters.status && client.status !== filters.status) return false
        if (filters.source && client.source !== filters.source) return false
        if (filters.niche && client.niche !== filters.niche) return false
        return true
      }),
    [clients, filters.search, filters.status, filters.source, filters.niche],
  )

  const totals = useMemo(() => {
    let contracted = 0
    let profit = 0
    let receivable = 0
    let mrr = 0
    for (const client of filtered) {
      const m = metricsFor(client)
      contracted += m.contracted
      profit += m.profit
      receivable += m.receivable
      mrr += m.mrr
    }
    return {
      contracted,
      profit,
      receivable,
      mrr,
      margin: contracted ? (profit / contracted) * 100 : 0,
      active: filtered.filter((client) => client.status === ClientStatus.ACTIVE).length,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, metricsById])

  const columns: Column<Client>[] = [
    {
      key: 'name',
      header: 'Cliente',
      sortValue: (client) => client.name,
      render: (client) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent/12 text-xs font-semibold text-accent">
            {initials(client.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{client.name}</p>
            <p className="truncate text-xs text-ink-faint">
              {[client.company, client.niche].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (client) => CLIENT_STATUS_LABEL[client.status],
      render: (client) => <StatusBadge type="client" status={client.status} />,
    },
    {
      key: 'projects',
      header: 'Projetos',
      align: 'right',
      hideOnMobile: true,
      sortValue: (client) => metricsFor(client).projectCount,
      render: (client) => <span className="tabular">{metricsFor(client).projectCount}</span>,
    },
    {
      key: 'videos',
      header: 'Vídeos',
      align: 'right',
      hideOnMobile: true,
      sortValue: (client) => metricsFor(client).videoCount,
      render: (client) => <span className="tabular">{metricsFor(client).videoCount}</span>,
    },
    {
      key: 'revenue',
      header: 'Receita',
      align: 'right',
      sortValue: (client) => metricsFor(client).contracted,
      render: (client) => (
        <span className="tabular text-ink">{formatCurrency(metricsFor(client).contracted)}</span>
      ),
    },
    {
      key: 'profit',
      header: 'Lucro',
      align: 'right',
      sortValue: (client) => metricsFor(client).profit,
      render: (client) => {
        const { profit } = metricsFor(client)
        return (
          <span className={cn('tabular', profit < 0 ? 'text-danger' : 'text-ink')}>
            {formatCurrency(profit)}
          </span>
        )
      },
    },
    {
      key: 'margin',
      header: 'Margem',
      align: 'right',
      hideOnMobile: true,
      sortValue: (client) => metricsFor(client).margin,
      render: (client) => <span className="tabular">{formatPercent(metricsFor(client).margin)}</span>,
    },
    {
      key: 'receivable',
      header: 'A receber',
      align: 'right',
      sortValue: (client) => metricsFor(client).receivable,
      render: (client) => {
        const { receivable, overdue } = metricsFor(client)
        return (
          <span className={cn('tabular', overdue > 0 ? 'font-medium text-danger' : 'text-ink-dim')}>
            {formatCurrency(receivable)}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Carteira, rentabilidade e situação de cada conta."
        actions={
          <Button variant="primary" onClick={() => setFormOpen(true)}>
            <Plus />
            Novo cliente
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Clientes ativos"
          value={totals.active}
          icon={Users}
          hint={`${filtered.length} no recorte atual`}
        />
        <MetricCard
          label="Receita contratada"
          value={totals.contracted}
          format="currency"
          icon={Wallet}
          hint="Pago mais em aberto"
        />
        <MetricCard
          label="Lucro"
          value={totals.profit}
          format="currency"
          icon={TrendingUp}
          tone={totals.profit < 0 ? 'danger' : undefined}
          hint={`Margem de ${formatPercent(totals.margin)}`}
        />
        <MetricCard
          label="Recorrência mensal"
          value={totals.mrr}
          format="currency"
          hint={`${formatCurrency(totals.receivable)} a receber`}
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
          icon={Users}
          title="Nenhum cliente encontrado"
          description={
            clients.length === 0
              ? 'Converta um lead fechado ou cadastre um cliente direto.'
              : 'Nenhum cliente corresponde aos filtros aplicados.'
          }
          actionLabel={clients.length === 0 ? 'Novo cliente' : undefined}
          onAction={clients.length === 0 ? () => setFormOpen(true) : undefined}
        />
      ) : view === 'cards' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              metrics={metricsFor(client)}
              onClick={() => navigate(`/clients/${client.id}`)}
            />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowId={(client) => client.id}
          onRowClick={(client) => navigate(`/clients/${client.id}`)}
          initialSort={{ key: 'revenue', direction: 'desc' }}
        />
      )}

      <ClientForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={(client) => navigate(`/clients/${client.id}`)}
      />
    </div>
  )
}
