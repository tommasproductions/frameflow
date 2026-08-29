import { Clock, Target, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { usePeriod } from '@/app/period'
import { FunnelChart } from '@/components/charts/FunnelChart'
import { ProductionChart } from '@/components/charts/ProductionChart'
import { ProfitChart } from '@/components/charts/ProfitChart'
import { RevenueChart } from '@/components/charts/RevenueChart'
import { StageBars } from '@/components/charts/StageBars'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  EMPTY_CLIENT_METRICS,
  useAllClientMetrics,
  type ClientMetrics,
} from '@/hooks/useClientMetrics'
import { useClients } from '@/hooks/useClients'
import { useLeads } from '@/hooks/useLeads'
import { useExpenses } from '@/hooks/useExpenses'
import { usePayments } from '@/hooks/usePayments'
import { useProjects } from '@/hooks/useProjects'
import { useVideos } from '@/hooks/useVideos'
import {
  averageTicket,
  cashSummary,
  conversionRate,
  hoursSummary,
  leadsByStage,
  monthlySeries,
  overdueVideos,
  pipelineValue,
  profitPerHour,
  videosInProduction,
} from '@/lib/calculations'
import {
  LEAD_SOURCE_LABEL,
  VIDEO_STATUS_ORDER,
  VIDEO_TYPE_LABEL,
  type Tone,
} from '@/lib/constants'
import { cn, formatCurrency, formatHours, formatPercent, sortBy, sumBy } from '@/lib/utils'
import { LeadStage, VideoStatus, type Client, type Video, type VideoType } from '@/types'

/** Quantos meses as séries dos relatórios cobrem. */
const REPORT_MONTHS = 12

export function ReportsPage() {
  const navigate = useNavigate()
  const { range, recentMonths, label } = usePeriod()
  const { clients } = useClients()
  const { leads } = useLeads()
  const { projects } = useProjects()
  const { videos } = useVideos()
  const { payments } = usePayments()
  const { expenses } = useExpenses()
  const clientMetrics = useAllClientMetrics()

  const series = useMemo(
    () => monthlySeries(payments, expenses, recentMonths(REPORT_MONTHS)),
    [payments, expenses, recentMonths],
  )
  const cash = cashSummary(payments, expenses, range)

  /* ------------------------------ Comercial ------------------------------ */

  const funnel = leadsByStage(leads)
  const closedLeads = leads.filter((lead) => lead.stage === LeadStage.CLOSED)
  const lostLeads = leads.filter((lead) => lead.stage === LeadStage.LOST)

  /** Leads e valor por origem, para saber qual canal vale o esforço. */
  const bySource = useMemo(() => {
    const map = new Map<string, { total: number; closed: number; value: number }>()
    for (const lead of leads) {
      const entry = map.get(lead.source) ?? { total: 0, closed: 0, value: 0 }
      entry.total += 1
      if (lead.stage === LeadStage.CLOSED) {
        entry.closed += 1
        entry.value += lead.potentialValue ?? 0
      }
      map.set(lead.source, entry)
    }
    return [...map.entries()]
      .map(([source, entry]) => ({ source, ...entry }))
      .sort((a, b) => b.total - a.total)
  }, [leads])

  /* ------------------------------- Produção ------------------------------ */

  const production = useMemo(() => {
    const counts = Object.fromEntries(VIDEO_STATUS_ORDER.map((s) => [s, 0])) as Record<
      VideoStatus,
      number
    >
    for (const video of videos) counts[video.status] += 1
    return counts
  }, [videos])

  const byType = useMemo(() => {
    const map = new Map<VideoType, { count: number; value: number; hours: number }>()
    for (const video of videos) {
      const entry = map.get(video.type) ?? { count: 0, value: 0, hours: 0 }
      entry.count += 1
      entry.value += video.value
      entry.hours += video.workedHours ?? 0
      map.set(video.type, entry)
    }
    return [...map.entries()]
      .map(([type, entry]) => ({
        type,
        ...entry,
        perHour: entry.hours ? entry.value / entry.hours : null,
      }))
      .sort((a, b) => b.value - a.value)
  }, [videos])

  const hours = hoursSummary(videos)
  const overdue = overdueVideos(videos)
  // Estourou a estimativa: sinal precoce de vídeo que corrói a margem.
  const overBudgetHours = videos.filter(
    (video) =>
      video.estimatedHours !== null &&
      video.workedHours !== null &&
      video.workedHours > video.estimatedHours,
  )

  /* ----------------------------- Rentabilidade --------------------------- */

  const ranked = useMemo(
    () =>
      sortBy(
        clients.filter((client) => clientMetrics.has(client.id)),
        (client) => clientMetrics.get(client.id)?.profit ?? 0,
        'desc',
      ),
    [clients, clientMetrics],
  )

  const totals = useMemo(() => {
    let contracted = 0
    let profit = 0
    let cost = 0
    let worked = 0
    for (const client of ranked) {
      const m = clientMetrics.get(client.id)
      if (!m) continue
      contracted += m.contracted
      profit += m.profit
      cost += m.expenses
      worked += m.hoursWorked
    }
    return { contracted, profit, cost, worked }
  }, [ranked, clientMetrics])

  const metricsFor = (client: Client): ClientMetrics =>
    clientMetrics.get(client.id) ?? EMPTY_CLIENT_METRICS

  const profitabilityColumns: Column<Client>[] = [
    {
      key: 'name',
      header: 'Cliente',
      sortValue: (client) => client.name,
      render: (client) => <span className="font-medium text-ink">{client.name}</span>,
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
      key: 'cost',
      header: 'Custos',
      align: 'right',
      hideOnMobile: true,
      sortValue: (client) => metricsFor(client).expenses,
      render: (client) => (
        <span className="tabular">{formatCurrency(metricsFor(client).expenses)}</span>
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
          <span className={cn('tabular font-medium', profit < 0 ? 'text-danger' : 'text-ink')}>
            {formatCurrency(profit)}
          </span>
        )
      },
    },
    {
      key: 'margin',
      header: 'Margem',
      align: 'right',
      sortValue: (client) => metricsFor(client).margin,
      render: (client) => (
        <span className="tabular">{formatPercent(metricsFor(client).margin)}</span>
      ),
    },
    {
      key: 'hours',
      header: 'Horas',
      align: 'right',
      hideOnMobile: true,
      sortValue: (client) => metricsFor(client).hoursWorked,
      render: (client) => (
        <span className="tabular">{formatHours(metricsFor(client).hoursWorked)}</span>
      ),
    },
    {
      key: 'perHour',
      header: 'Lucro/hora',
      align: 'right',
      sortValue: (client) => metricsFor(client).profitPerHour ?? -1,
      render: (client) => {
        const value = metricsFor(client).profitPerHour
        return (
          <span className="tabular font-medium text-ink">
            {value === null ? '—' : formatCurrency(value)}
          </span>
        )
      },
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
          <p className="truncate text-xs text-ink-faint">{VIDEO_TYPE_LABEL[video.type]}</p>
        </div>
      ),
    },
    {
      key: 'estimated',
      header: 'Estimadas',
      align: 'right',
      sortValue: (video) => video.estimatedHours ?? 0,
      render: (video) => <span className="tabular">{formatHours(video.estimatedHours)}</span>,
    },
    {
      key: 'worked',
      header: 'Trabalhadas',
      align: 'right',
      sortValue: (video) => video.workedHours ?? 0,
      render: (video) => (
        <span className="tabular font-medium text-warning">{formatHours(video.workedHours)}</span>
      ),
    },
    {
      key: 'over',
      header: 'Excedente',
      align: 'right',
      sortValue: (video) => (video.workedHours ?? 0) - (video.estimatedHours ?? 0),
      render: (video) => (
        <span className="tabular text-danger">
          +{formatHours((video.workedHours ?? 0) - (video.estimatedHours ?? 0))}
        </span>
      ),
    },
    {
      key: 'perHour',
      header: 'Valor/hora',
      align: 'right',
      sortValue: (video) => (video.workedHours ? video.value / video.workedHours : 0),
      render: (video) => (
        <span className="tabular">
          {video.workedHours ? formatCurrency(video.value / video.workedHours) : '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description={`Desempenho do negócio, com ${label.toLowerCase()} como referência.`}
      />

      <Tabs defaultValue="commercial">
        <TabsList>
          <TabsTrigger value="commercial">Comercial</TabsTrigger>
          <TabsTrigger value="production">Produção</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="profitability">Rentabilidade</TabsTrigger>
        </TabsList>

        {/* ------------------------------- Comercial ----------------------------- */}
        <TabsContent value="commercial" className="space-y-4">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Leads no funil"
              value={leads.length}
              icon={Target}
              hint={`${formatCurrency(pipelineValue(leads))} em aberto`}
            />
            <MetricCard
              label="Taxa de conversão"
              value={conversionRate(closedLeads.length, leads.length)}
              format="percentage"
              hint={`${closedLeads.length} fechados, ${lostLeads.length} perdidos`}
            />
            <MetricCard
              label="Valor fechado"
              value={sumBy(closedLeads, (lead) => lead.potentialValue)}
              format="currency"
              hint="Soma dos leads ganhos"
            />
            <MetricCard
              label="Valor perdido"
              value={sumBy(lostLeads, (lead) => lead.potentialValue)}
              format="currency"
              trend="down"
              hint="Oportunidades que não fecharam"
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Funil por etapa</CardTitle>
              </CardHeader>
              <CardContent>
                <FunnelChart counts={funnel} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Origem dos leads</CardTitle>
                  <p className="text-xs text-ink-dim">Total de leads e quantos fecharam.</p>
                </div>
              </CardHeader>
              <CardContent>
                {bySource.length === 0 ? (
                  <EmptyState size="inline" icon={Target} title="Nenhum lead cadastrado" />
                ) : (
                  <div className="space-y-2">
                    {bySource.map((row) => (
                      <div key={row.source} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 truncate text-xs text-ink-dim">
                          {LEAD_SOURCE_LABEL[row.source as keyof typeof LEAD_SOURCE_LABEL]}
                        </span>
                        <span className="relative h-4 flex-1 overflow-hidden rounded-sm bg-hover">
                          <span
                            className="absolute inset-y-0 left-0 rounded-sm bg-accent/70"
                            style={{
                              width: `${(row.total / Math.max(...bySource.map((s) => s.total))) * 100}%`,
                            }}
                          />
                          {row.closed > 0 ? (
                            <span
                              className="absolute inset-y-0 left-0 rounded-sm bg-success"
                              style={{
                                width: `${(row.closed / Math.max(...bySource.map((s) => s.total))) * 100}%`,
                              }}
                            />
                          ) : null}
                        </span>
                        <span className="tabular w-16 shrink-0 text-right text-xs text-ink">
                          {row.closed}/{row.total}
                        </span>
                      </div>
                    ))}
                    <p className="pt-1 text-xs text-ink-faint">
                      A barra verde é a parte que virou cliente.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* -------------------------------- Produção ----------------------------- */}
        <TabsContent value="production" className="space-y-4">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Vídeos produzidos"
              value={videos.length}
              hint={`${videosInProduction(videos).length} ainda na esteira`}
            />
            <MetricCard
              label="Horas trabalhadas"
              value={hours.worked}
              format="hours"
              icon={Clock}
              hint={`${formatHours(hours.estimated)} estimadas`}
            />
            <MetricCard
              label="Aderência à estimativa"
              value={hours.estimated ? (hours.worked / hours.estimated) * 100 : 0}
              format="percentage"
              trend="down"
              tone={hours.worked > hours.estimated ? 'warning' : undefined}
              hint="Acima de 100% significa estourar o previsto"
            />
            <MetricCard
              label="Com prazo vencido"
              value={overdue.length}
              trend="down"
              tone={overdue.length > 0 ? 'danger' : undefined}
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição na esteira</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductionChart counts={production} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Valor por tipo de vídeo</CardTitle>
                  <p className="text-xs text-ink-dim">Quanto cada formato representa.</p>
                </div>
              </CardHeader>
              <CardContent>
                <StageBars
                  items={byType.map((row) => ({
                    key: row.type,
                    label: VIDEO_TYPE_LABEL[row.type],
                    count: row.count,
                    tone: 'accent' as Tone,
                  }))}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Retorno por formato</CardTitle>
                <p className="text-xs text-ink-dim">
                  Valor por hora revela qual formato realmente compensa.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {byType.map((row) => (
                  <div
                    key={row.type}
                    className="flex items-center justify-between gap-3 border-b border-line/60 py-2 last:border-0"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {VIDEO_TYPE_LABEL[row.type]}
                    </span>
                    <span className="tabular w-16 shrink-0 text-right text-xs text-ink-faint">
                      {row.count} vídeos
                    </span>
                    <span className="tabular w-20 shrink-0 text-right text-xs text-ink-faint">
                      {formatHours(row.hours)}
                    </span>
                    <span className="tabular w-24 shrink-0 text-right text-sm text-ink">
                      {formatCurrency(row.value)}
                    </span>
                    <span className="tabular w-24 shrink-0 text-right text-sm font-medium text-ink">
                      {row.perHour === null ? '—' : `${formatCurrency(row.perHour)}/h`}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {overBudgetHours.length > 0 ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Vídeos que estouraram a estimativa</CardTitle>
                  <p className="text-xs text-ink-dim">
                    Onde as horas passaram do previsto — a margem some aqui primeiro.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <DataTable
                  columns={videoColumns}
                  data={overBudgetHours}
                  getRowId={(video) => video.id}
                  onRowClick={(video) => navigate(`/videos/${video.id}`)}
                  initialSort={{ key: 'over', direction: 'desc' }}
                />
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* ------------------------------- Financeiro ---------------------------- */}
        <TabsContent value="financial" className="space-y-4">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Recebido no mês" value={cash.received} format="currency" />
            <MetricCard label="Custos do mês" value={cash.expenses} format="currency" trend="down" />
            <MetricCard
              label="Resultado do mês"
              value={cash.profit}
              format="currency"
              tone={cash.profit < 0 ? 'danger' : undefined}
            />
            <MetricCard
              label="Margem do mês"
              value={cash.margin}
              format="percentage"
              tone={cash.profit < 0 ? 'danger' : undefined}
            />
          </section>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Receita e custos — 12 meses</CardTitle>
                <p className="text-xs text-ink-dim">Por caixa: data de recebimento e de custo.</p>
              </div>
            </CardHeader>
            <CardContent>
              <RevenueChart data={series} activeKey={range.from.slice(0, 7)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Resultado — 12 meses</CardTitle>
                <p className="text-xs text-ink-dim">
                  Meses negativos acontecem quando o custo cai antes da receita entrar.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <ProfitChart data={series} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------- Rentabilidade --------------------------- */}
        <TabsContent value="profitability" className="space-y-4">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Receita contratada"
              value={totals.contracted}
              format="currency"
              hint="Pago mais em aberto"
            />
            <MetricCard
              label="Lucro"
              value={totals.profit}
              format="currency"
              icon={TrendingUp}
              tone={totals.profit < 0 ? 'danger' : undefined}
              hint={`Margem de ${formatPercent(totals.contracted ? (totals.profit / totals.contracted) * 100 : 0)}`}
            />
            <MetricCard
              label="Lucro por hora"
              value={profitPerHour(totals.profit, totals.worked)}
              format="currency"
              icon={Clock}
              hint={`${formatHours(totals.worked)} trabalhadas`}
            />
            <MetricCard
              label="Ticket médio"
              value={averageTicket(totals.contracted, projects.length)}
              format="currency"
              hint={`${projects.length} projetos`}
            />
          </section>

          {ranked.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Sem dados de rentabilidade"
              description="Cadastre clientes e lançamentos para comparar o retorno de cada conta."
            />
          ) : (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Rentabilidade por cliente</CardTitle>
                  <p className="text-xs text-ink-dim">
                    Ordene por lucro/hora para ver quem paga melhor pelo seu tempo — nem sempre é
                    quem tem a maior receita.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <DataTable
                  columns={profitabilityColumns}
                  data={ranked}
                  getRowId={(client) => client.id}
                  onRowClick={(client) => navigate(`/clients/${client.id}`)}
                  initialSort={{ key: 'profit', direction: 'desc' }}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
