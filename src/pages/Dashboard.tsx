import {
  AlertTriangle,
  CalendarClock,
  Clapperboard,
  FolderKanban,
  Receipt,
  Target,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { usePeriod } from '@/app/period'
import { FunnelChart } from '@/components/charts/FunnelChart'
import { ProductionChart } from '@/components/charts/ProductionChart'
import { ProfitChart } from '@/components/charts/ProfitChart'
import { RevenueChart } from '@/components/charts/RevenueChart'
import { EmptyState } from '@/components/shared/EmptyState'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useClients } from '@/hooks/useClients'
import { useDashboard } from '@/hooks/useDashboard'
import { LEAD_STAGE_LABEL } from '@/lib/constants'
import { cn, deadlineLabel, formatCurrency, formatDateShort, truncate } from '@/lib/utils'

export function Dashboard() {
  const { label, range, month } = usePeriod()
  const data = useDashboard()
  const { byId: clientById } = useClients()

  const activeKey = range.from.slice(0, 7)
  const profitIsNegative = data.cash.profit < 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Visão geral de ${label.toLowerCase()}.`}
        actions={
          data.counts.overdueVideos > 0 || data.latePayments.length > 0 ? (
            <div className="flex items-center gap-2">
              {data.counts.overdueVideos > 0 ? (
                <Badge tone="danger" dot>
                  {data.counts.overdueVideos} vídeos atrasados
                </Badge>
              ) : null}
              {data.latePayments.length > 0 ? (
                <Badge tone="danger" dot>
                  {formatCurrency(data.overdueAmount)} em atraso
                </Badge>
              ) : null}
            </div>
          ) : null
        }
      />

      {/* Linha financeira do mês selecionado. */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Receita recebida"
          value={data.cash.received}
          previousValue={data.previousCash.received}
          format="currency"
          icon={Wallet}
        />
        <MetricCard
          label="Custos"
          value={data.cash.expenses}
          previousValue={data.previousCash.expenses}
          format="currency"
          trend="down"
          icon={Receipt}
        />
        <MetricCard
          label="Lucro"
          value={data.cash.profit}
          previousValue={data.previousCash.profit}
          format="currency"
          tone={profitIsNegative ? 'danger' : undefined}
          icon={profitIsNegative ? TrendingDown : TrendingUp}
        />
        <MetricCard
          label="Margem"
          value={data.cash.margin}
          format="percentage"
          hint={
            data.cash.received === 0
              ? 'sem receita recebida no mês'
              : `sobre ${formatCurrency(data.cash.received)}`
          }
          tone={profitIsNegative ? 'danger' : undefined}
        />
        <MetricCard
          label="A receber"
          value={data.receivable}
          format="currency"
          hint={
            data.overdueAmount > 0
              ? `${formatCurrency(data.overdueAmount)} vencidos`
              : 'nada vencido'
          }
          tone={data.overdueAmount > 0 ? 'warning' : undefined}
          icon={CalendarClock}
        />
      </section>

      {/* Linha operacional. */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Leads novos no mês"
          value={data.counts.newLeads}
          previousValue={data.counts.previousNewLeads}
          icon={Target}
          hint={`${formatCurrency(data.pipeline.value)} em oportunidades abertas`}
        />
        <MetricCard
          label="Novos clientes no mês"
          value={data.counts.newClients}
          icon={UserPlus}
          hint={`conversão histórica de ${data.pipeline.conversion.toFixed(0)}%`}
        />
        <MetricCard
          label="Projetos ativos"
          value={data.counts.activeProjects}
          icon={FolderKanban}
          hint={`${formatCurrency(data.monthlyRecurring)}/mês recorrentes`}
        />
        <MetricCard
          label="Vídeos em produção"
          value={data.counts.videosInProduction}
          icon={Clapperboard}
          hint={
            data.counts.overdueVideos > 0
              ? `${data.counts.overdueVideos} com prazo vencido`
              : 'todos dentro do prazo'
          }
          tone={data.counts.overdueVideos > 0 ? 'danger' : undefined}
        />
      </section>

      {/* Séries do semestre. */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Receita e custos</CardTitle>
              <p className="text-xs text-ink-dim">Últimos 6 meses, por caixa.</p>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart data={data.series} activeKey={activeKey} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Lucro</CardTitle>
              <p className="text-xs text-ink-dim">Receita recebida menos custos do mês.</p>
            </div>
          </CardHeader>
          <CardContent>
            <ProfitChart data={data.series} />
          </CardContent>
        </Card>
      </section>

      {/* Funil e produção. */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Funil comercial</CardTitle>
              <p className="text-xs text-ink-dim">
                {formatCurrency(data.pipeline.value)} em oportunidades abertas.
              </p>
            </div>
            <Link to="/leads" className="text-xs text-accent hover:underline">
              Ver leads
            </Link>
          </CardHeader>
          <CardContent>
            <FunnelChart counts={data.funnel} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Produção</CardTitle>
              <p className="text-xs text-ink-dim">
                {data.counts.videosInProduction} vídeos na esteira.
              </p>
            </div>
            <Link to="/production" className="text-xs text-accent hover:underline">
              Ver esteira
            </Link>
          </CardHeader>
          <CardContent>
            <ProductionChart counts={data.production} />
          </CardContent>
        </Card>
      </section>

      {/* Listas de ação. */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximos prazos</CardTitle>
            <Link to="/production" className="text-xs text-accent hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {data.upcomingVideos.length === 0 ? (
              <EmptyState
                size="inline"
                icon={Clapperboard}
                title="Nenhum vídeo na esteira"
                description="Tudo aprovado ou entregue."
              />
            ) : (
              <ul className="divide-y divide-line">
                {data.upcomingVideos.map((video) => {
                  const deadline = deadlineLabel(video.deadline)
                  return (
                    <li key={video.id}>
                      <Link
                        to={`/videos/${video.id}`}
                        className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-hover"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{video.title}</p>
                          <p className="truncate text-xs text-ink-dim">
                            {clientById(video.clientId)?.name ?? 'Cliente removido'}
                            {' · '}
                            {formatDateShort(video.deadline)}
                          </p>
                        </div>
                        <StatusBadge type="video" status={video.status} />
                        <span
                          className={cn(
                            'w-28 shrink-0 text-right text-xs',
                            deadline.overdue ? 'font-medium text-danger' : 'text-ink-faint',
                          )}
                        >
                          {deadline.text}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Follow-ups pendentes</CardTitle>
            <Link to="/leads" className="text-xs text-accent hover:underline">
              Ver funil
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {data.followUps.length === 0 ? (
              <EmptyState
                size="inline"
                icon={Target}
                title="Nenhum follow-up vencido"
                description="O funil está em dia."
              />
            ) : (
              <ul className="divide-y divide-line">
                {data.followUps.map((lead) => {
                  const due = deadlineLabel(lead.nextFollowUpDate)
                  return (
                    <li key={lead.id}>
                      <Link
                        to={`/leads/${lead.id}`}
                        className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-hover"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{lead.name}</p>
                          <p className="truncate text-xs text-ink-dim">
                            {LEAD_STAGE_LABEL[lead.stage]}
                            {lead.nextFollowUpAction
                              ? ` · ${truncate(lead.nextFollowUpAction, 44)}`
                              : ''}
                          </p>
                        </div>
                        <span className="tabular shrink-0 text-xs text-ink-dim">
                          {formatCurrency(lead.potentialValue, true)}
                        </span>
                        <span
                          className={cn(
                            'w-24 shrink-0 text-right text-xs',
                            due.overdue ? 'font-medium text-danger' : 'text-warning',
                          )}
                        >
                          {due.text}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Cobranças e tarefas. */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cobranças em atraso</CardTitle>
            <Link to="/financial" className="text-xs text-accent hover:underline">
              Ver financeiro
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {data.latePayments.length === 0 ? (
              <EmptyState
                size="inline"
                icon={Wallet}
                title="Nenhuma cobrança vencida"
                description="Todos os recebimentos estão dentro do prazo."
              />
            ) : (
              <ul className="divide-y divide-line">
                {data.latePayments.map((payment) => {
                  const due = deadlineLabel(payment.dueDate)
                  return (
                    <li
                      key={payment.id}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <AlertTriangle className="size-4 shrink-0 text-danger" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {payment.description}
                        </p>
                        <p className="truncate text-xs text-ink-dim">
                          {clientById(payment.clientId)?.name ?? '—'} · venceu em{' '}
                          {formatDateShort(payment.dueDate)}
                        </p>
                      </div>
                      <span className="tabular shrink-0 text-sm font-medium text-ink">
                        {formatCurrency(payment.amount)}
                      </span>
                      <span className="w-28 shrink-0 text-right text-xs font-medium text-danger">
                        {due.text}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarefas em aberto</CardTitle>
            <Link to="/tasks" className="text-xs text-accent hover:underline">
              Ver tarefas
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {data.openTasks.length === 0 ? (
              <EmptyState
                size="inline"
                icon={Users}
                title="Nada pendente"
                description="Todas as tarefas estão concluídas."
              />
            ) : (
              <ul className="divide-y divide-line">
                {data.openTasks.map((task) => {
                  const due = deadlineLabel(task.deadline, task.status === 'done')
                  return (
                    <li key={task.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{task.title}</p>
                        <p className="truncate text-xs text-ink-dim">
                          {clientById(task.clientId)?.name ?? 'Sem cliente'}
                        </p>
                      </div>
                      <StatusBadge type="task" status={task.status} />
                      <span
                        className={cn(
                          'w-28 shrink-0 text-right text-xs',
                          due.overdue ? 'font-medium text-danger' : 'text-ink-faint',
                        )}
                      >
                        {due.text}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-ink-faint">
        Período de referência: {formatDateShort(range.from)} a {formatDateShort(range.to)} ·{' '}
        {month.getFullYear()}
      </p>
    </div>
  )
}
