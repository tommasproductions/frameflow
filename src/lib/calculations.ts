import {
  CONTRACT_FREQUENCY_PER_MONTH,
  LEAD_OPEN_STAGES,
  VIDEO_CLOSED_STATUSES,
} from '@/lib/constants'
import { daysUntil, isWithinRange, monthRange, sumBy } from '@/lib/utils'
import {
  ContractStatus,
  LeadStage,
  PaymentStatus,
  ProjectStatus,
  TaskStatus,
  type Contract,
  type DateRange,
  type Expense,
  type Lead,
  type Payment,
  type Project,
  type ScopeFilter,
  type Task,
  type Video,
} from '@/types'

/**
 * Funções puras de cálculo. Nenhuma delas lê o store — recebem as coleções já
 * carregadas, para que sirvam igualmente ao dashboard, aos relatórios e aos
 * recortes por cliente/projeto/vídeo.
 *
 * Convenção de receita, aplicada em todo o sistema:
 *   - **contratada** — tudo que não foi cancelado (pago + em aberto)
 *   - **recebida**   — apenas `paid`
 *   - **a receber**  — `pending` + `overdue`
 * Os cartões por cliente/projeto usam a receita contratada; os cartões mensais
 * do dashboard usam a recebida, porque medem caixa do mês.
 */

/* -------------------------------------------------------------------------- */
/*                                  Escopo                                    */
/* -------------------------------------------------------------------------- */

interface Scoped {
  clientId?: string | null
  projectId?: string | null
  videoId?: string | null
}

/** O registro pertence ao escopo pedido? Filtros ausentes não restringem. */
function inScope(record: Scoped, filter?: ScopeFilter): boolean {
  if (!filter) return true
  if (filter.clientId && record.clientId !== filter.clientId) return false
  if (filter.projectId && record.projectId !== filter.projectId) return false
  if (filter.videoId && record.videoId !== filter.videoId) return false
  return true
}

function inRange(date: string | null | undefined, range?: DateRange): boolean {
  if (!range) return true
  return isWithinRange(date, range.from, range.to)
}

/* -------------------------------------------------------------------------- */
/*                                  Receita                                   */
/* -------------------------------------------------------------------------- */

/**
 * Receita contratada: soma de tudo que não foi cancelado.
 * Quando há `dateRange`, filtra pelo vencimento.
 */
export function totalRevenue(payments: Payment[], filters?: ScopeFilter): number {
  return sumBy(
    payments.filter(
      (p) =>
        p.status !== PaymentStatus.CANCELLED &&
        inScope(p, filters) &&
        inRange(p.dueDate, filters?.dateRange),
    ),
    (p) => p.amount,
  )
}

/**
 * Receita efetivamente recebida.
 * Quando há `dateRange`, filtra pela data do pagamento — é caixa, não competência.
 */
export function paidRevenue(payments: Payment[], filters?: ScopeFilter): number {
  return sumBy(
    payments.filter(
      (p) =>
        p.status === PaymentStatus.PAID &&
        inScope(p, filters) &&
        inRange(p.paymentDate, filters?.dateRange),
    ),
    (p) => p.amount,
  )
}

/** Receita em aberto: pendente + atrasada. Filtra pelo vencimento. */
export function receivableRevenue(payments: Payment[], filters?: ScopeFilter): number {
  return sumBy(
    payments.filter(
      (p) =>
        (p.status === PaymentStatus.PENDING || p.status === PaymentStatus.OVERDUE) &&
        inScope(p, filters) &&
        inRange(p.dueDate, filters?.dateRange),
    ),
    (p) => p.amount,
  )
}

/** Receita vencida e não recebida. */
export function overdueRevenue(payments: Payment[], filters?: ScopeFilter): number {
  return sumBy(overduePayments(payments).filter((p) => inScope(p, filters)), (p) => p.amount)
}

/* -------------------------------------------------------------------------- */
/*                              Custos e resultado                            */
/* -------------------------------------------------------------------------- */

/** Custo total do escopo. Quando há `dateRange`, filtra pela data do custo. */
export function totalExpenses(expenses: Expense[], filters?: ScopeFilter): number {
  return sumBy(
    expenses.filter((e) => inScope(e, filters) && inRange(e.date, filters?.dateRange)),
    (e) => e.amount,
  )
}

/** Lucro = receita − custos. */
export function profit(revenue: number, expenses: number): number {
  return revenue - expenses
}

/** Margem em pontos percentuais. Receita zero devolve 0 em vez de infinito. */
export function margin(profitValue: number, revenue: number): number {
  if (!revenue) return 0
  return (profitValue / revenue) * 100
}

/** Lucro por hora trabalhada. Sem horas registradas, não há o que dividir. */
export function profitPerHour(profitValue: number, hours: number): number | null {
  if (!hours) return null
  return profitValue / hours
}

/** Ticket médio por projeto. */
export function averageTicket(revenue: number, projectCount: number): number {
  if (!projectCount) return 0
  return revenue / projectCount
}

/* -------------------------------------------------------------------------- */
/*                                 Comercial                                  */
/* -------------------------------------------------------------------------- */

/** Taxa de conversão do funil, em pontos percentuais. */
export function conversionRate(closedLeads: number, totalLeads: number): number {
  if (!totalLeads) return 0
  return (closedLeads / totalLeads) * 100
}

/** Valor potencial das oportunidades ainda vivas no funil. */
export function pipelineValue(leads: Lead[]): number {
  return sumBy(
    leads.filter((l) => LEAD_OPEN_STAGES.includes(l.stage)),
    (l) => l.potentialValue,
  )
}

/** Valor potencial ponderado pela probabilidade informada em cada lead. */
export function weightedPipelineValue(leads: Lead[]): number {
  return sumBy(
    leads.filter((l) => LEAD_OPEN_STAGES.includes(l.stage)),
    (l) => ((l.potentialValue ?? 0) * (l.closeProbability ?? 0)) / 100,
  )
}

/** Contagem de leads por etapa, na ordem do funil. */
export function leadsByStage(leads: Lead[]): Record<LeadStage, number> {
  const counts = Object.fromEntries(
    Object.values(LeadStage).map((stage) => [stage, 0]),
  ) as Record<LeadStage, number>
  for (const lead of leads) counts[lead.stage] += 1
  return counts
}

/* -------------------------------------------------------------------------- */
/*                                 Recorrência                                */
/* -------------------------------------------------------------------------- */

/**
 * Receita recorrente mensal: cada contrato ativo convertido para sua
 * equivalência mensal. Contratos avulsos não entram.
 */
export function monthlyRecurringRevenue(contracts: Contract[]): number {
  return sumBy(
    contracts.filter((c) => c.status === ContractStatus.ACTIVE),
    (c) => c.value * CONTRACT_FREQUENCY_PER_MONTH[c.frequency],
  )
}

/** Contratos cuja renovação cai dentro da janela de aviso. */
export function contractsNearRenewal(contracts: Contract[], withinDays: number): Contract[] {
  return contracts.filter((c) => {
    if (c.status === ContractStatus.CANCELLED) return false
    const diff = daysUntil(c.renewalDate)
    return diff !== null && diff <= withinDays
  })
}

/* -------------------------------------------------------------------------- */
/*                                  Atrasos                                   */
/* -------------------------------------------------------------------------- */

/** Vídeos com prazo vencido que ainda não foram aprovados nem entregues. */
export function overdueVideos(videos: Video[]): Video[] {
  return videos.filter((v) => {
    if (VIDEO_CLOSED_STATUSES.includes(v.status)) return false
    const diff = daysUntil(v.deadline)
    return diff !== null && diff < 0
  })
}

/** Vídeos com prazo dentro da janela informada (ainda não vencido). */
export function upcomingVideos(videos: Video[], withinDays: number): Video[] {
  return videos.filter((v) => {
    if (VIDEO_CLOSED_STATUSES.includes(v.status)) return false
    const diff = daysUntil(v.deadline)
    return diff !== null && diff >= 0 && diff <= withinDays
  })
}

/**
 * Pagamentos atrasados: os marcados como `overdue` e também os `pending`
 * cujo vencimento já passou — o status gravado nem sempre acompanha o relógio.
 */
export function overduePayments(payments: Payment[]): Payment[] {
  return payments.filter((p) => {
    if (p.status === PaymentStatus.OVERDUE) return true
    if (p.status !== PaymentStatus.PENDING) return false
    const diff = daysUntil(p.dueDate)
    return diff !== null && diff < 0
  })
}

/** Leads cujo follow-up está marcado para hoje ou já passou. */
export function overdueFollowUps(leads: Lead[]): Lead[] {
  return leads.filter((l) => {
    if (l.stage === LeadStage.CLOSED || l.stage === LeadStage.LOST) return false
    const diff = daysUntil(l.nextFollowUpDate)
    return diff !== null && diff <= 0
  })
}

/** Tarefas em aberto com prazo vencido. */
export function overdueTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => {
    if (t.status === TaskStatus.DONE) return false
    const diff = daysUntil(t.deadline)
    return diff !== null && diff < 0
  })
}

/* -------------------------------------------------------------------------- */
/*                                  Produção                                  */
/* -------------------------------------------------------------------------- */

/** Vídeos que ainda não saíram da esteira. */
export function videosInProduction(videos: Video[]): Video[] {
  return videos.filter((v) => !VIDEO_CLOSED_STATUSES.includes(v.status))
}

/** Projetos em andamento. */
export function activeProjects(projects: Project[]): Project[] {
  return projects.filter((p) => p.status === ProjectStatus.ACTIVE)
}

/** Horas estimadas e trabalhadas de um conjunto de vídeos. */
export function hoursSummary(videos: Video[]): { estimated: number; worked: number } {
  return {
    estimated: sumBy(videos, (v) => v.estimatedHours),
    worked: sumBy(videos, (v) => v.workedHours),
  }
}

/** Percentual do checklist concluído — 0 a 100. */
export function checklistProgress(video: Video): number {
  const values = Object.values(video.checklist)
  if (values.length === 0) return 0
  return (values.filter(Boolean).length / values.length) * 100
}

/* -------------------------------------------------------------------------- */
/*                            Resumo financeiro                               */
/* -------------------------------------------------------------------------- */

export interface FinancialSummary {
  /** Não cancelada: recebida + a receber. */
  contracted: number
  received: number
  receivable: number
  overdue: number
  expenses: number
  profit: number
  margin: number
}

/**
 * Bloco financeiro de um escopo. Usa a receita contratada como base de lucro e
 * margem — é a leitura de rentabilidade do trabalho, não de caixa.
 */
export function financialSummary(
  payments: Payment[],
  expenses: Expense[],
  filters?: ScopeFilter,
): FinancialSummary {
  const contracted = totalRevenue(payments, filters)
  const received = paidRevenue(payments, filters)
  const receivable = receivableRevenue(payments, filters)
  const overdue = overdueRevenue(payments, filters)
  const cost = totalExpenses(expenses, filters)
  const result = profit(contracted, cost)
  return {
    contracted,
    received,
    receivable,
    overdue,
    expenses: cost,
    profit: result,
    margin: margin(result, contracted),
  }
}

export interface MonthlyPoint {
  /** `YYYY-MM`, chave estável para o eixo dos gráficos. */
  key: string
  /** Rótulo curto: "ago". */
  label: string
  received: number
  expenses: number
  profit: number
  margin: number
}

/**
 * Série mensal de caixa para os gráficos do dashboard e dos relatórios.
 * Cada ponto usa a mesma regra de `cashSummary`, mês a mês.
 */
export function monthlySeries(
  payments: Payment[],
  expenses: Expense[],
  months: Date[],
): MonthlyPoint[] {
  return months.map((month) => {
    const range = monthRange(month)
    const summary = cashSummary(payments, expenses, range)
    return {
      key: range.from.slice(0, 7),
      label: month.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      received: summary.received,
      expenses: summary.expenses,
      profit: summary.profit,
      margin: summary.margin,
    }
  })
}

/**
 * Bloco de caixa de um período: entradas e saídas com data dentro do intervalo.
 * É o que o dashboard mostra no cartão do mês.
 */
export function cashSummary(
  payments: Payment[],
  expenses: Expense[],
  range: DateRange,
): { received: number; expenses: number; profit: number; margin: number } {
  const received = paidRevenue(payments, { dateRange: range })
  const cost = totalExpenses(expenses, { dateRange: range })
  const result = profit(received, cost)
  return { received, expenses: cost, profit: result, margin: margin(result, received) }
}
