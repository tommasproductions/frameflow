import {
  CONTRACT_FREQUENCY_PER_MONTH,
  LEAD_OPEN_STAGES,
  VIDEO_CLOSED_STATUSES,
} from '@/lib/constants'
import { daysUntil, isWithinRange, monthRange, parseDate, sumBy, toISODate } from '@/lib/utils'
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
 * ## A regra de receita do sistema
 *
 * **Quem gera receita é o vídeo.** O preço de cada vídeo é a unidade de
 * faturamento, e a soma deles é o que um projeto, um cliente ou um mês valem.
 * Isso vem de como o trabalho realmente acontece: um editor não vende "um
 * projeto", vende vídeos — e o valor de um projeto é o que seus vídeos somam.
 *
 * Duas leituras saem daí, e elas respondem perguntas diferentes:
 *
 *   - **produção** — quanto foi produzido e quanto sobrou disso.
 *     Receita = soma do valor dos vídeos. Num período, só os concluídos dentro
 *     dele — aprovados ou entregues, pela data em `completedAt`. É a leitura
 *     de resultado.
 *   - **caixa** — quanto entrou e quanto saiu da conta no período.
 *     Vem dos recebimentos com status `paid`. É a leitura de fluxo.
 *
 * As duas nunca se somam: são o mesmo dinheiro visto de dois ângulos. Somá-las
 * dobraria o faturamento, que é exatamente o erro que esta separação evita.
 *
 * Os recebimentos deixaram de ser a base do lucro e passaram a responder só
 * "quanto disso já caiu na conta": recebido, a receber e vencido.
 *
 * Custo tem as duas metades: o custo direto gravado no vídeo (freela, trilha,
 * banco de imagens) e os lançamentos de custo do período. Os dois entram.
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

/**
 * O vídeo pertence ao escopo pedido?
 *
 * Precisa ser separado de `inScope` por um detalhe que morderia calado: o vídeo
 * se identifica por `id`, não por `videoId`. Passá-lo pela função genérica faria
 * todo recorte por vídeo devolver vazio, e um total zerado parece dado, não bug.
 */
function videoInScope(video: Video, filter?: ScopeFilter): boolean {
  if (!filter) return true
  if (filter.clientId && video.clientId !== filter.clientId) return false
  if (filter.projectId && video.projectId !== filter.projectId) return false
  if (filter.videoId && video.id !== filter.videoId) return false
  return true
}

/* -------------------------------------------------------------------------- */
/*                            Receita de produção                             */
/* -------------------------------------------------------------------------- */

/**
 * O vídeo já terminou? `approved` e `delivered` são as duas pontas em que o
 * trabalho acabou, e as duas contam como receita — parar em "Aprovado" é
 * comum, e não seria razoável que um mês inteiro de trabalho aprovado
 * aparecesse como zero faturado.
 */
function isCompleted(video: Video): boolean {
  return VIDEO_CLOSED_STATUSES.includes(video.status)
}

/**
 * Em que dia este vídeo entrou para a receita.
 *
 * `completedAt` é a resposta certa, mas nem todo vídeo concluído tem uma: os
 * que vieram de antes do campo existir, e os de um banco onde a migração ainda
 * não rodou, chegam sem ela. Um vídeo concluído aconteceu em algum dia — usar
 * `updatedAt` como aproximação é a mesma coisa que a migração faz, e é
 * preferível a devolver zero, que parece um mês sem trabalho em vez de um dado
 * faltando. Quando a data explícita existe, ela manda.
 */
export function completionDate(video: Video): string | null {
  if (video.completedAt) return video.completedAt
  const fallback = parseDate(video.updatedAt)
  return fallback ? toISODate(fallback) : null
}

/**
 * Os vídeos que respondem pela receita de um recorte.
 *
 * Sem `dateRange`, são todos os vídeos do escopo — a pergunta é "quanto este
 * projeto vale", e um vídeo ainda na esteira já faz parte desse valor.
 *
 * Com `dateRange`, são só os concluídos dentro do intervalo. Aí a pergunta é
 * "quanto rendeu este mês", e o que ainda está na esteira não rendeu nada.
 */
export function scopedVideos(videos: Video[], filters?: ScopeFilter): Video[] {
  const range = filters?.dateRange
  return videos.filter((video) => {
    if (!videoInScope(video, filters)) return false
    if (!range) return true
    return isCompleted(video) && inRange(completionDate(video), range)
  })
}

/** Vídeos concluídos dentro do intervalo, na ordem em que estavam. */
export function completedVideos(videos: Video[], range: DateRange): Video[] {
  return videos.filter((video) => isCompleted(video) && inRange(completionDate(video), range))
}

/* -------------------------------------------------------------------------- */
/*                             Recebimentos (caixa)                           */
/* -------------------------------------------------------------------------- */

/**
 * Tudo que foi lançado como recebimento e não foi cancelado — pago e em aberto.
 * Não é mais a base do lucro: serve para comparar o que foi produzido com o que
 * chegou a virar cobrança.
 * Quando há `dateRange`, filtra pelo vencimento.
 */
export function billedRevenue(payments: Payment[], filters?: ScopeFilter): number {
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
  /** Receita de produção: soma do preço dos vídeos do escopo. */
  produced: number
  /** Quantos vídeos entraram nessa soma. */
  videoCount: number
  /** Lançado em recebimentos, fora os cancelados. */
  billed: number
  /** Caixa: recebimentos com status `paid`. */
  received: number
  receivable: number
  overdue: number
  /** Custo direto dos vídeos do escopo. */
  videoCost: number
  /** Custo total: o direto dos vídeos mais os lançamentos de custo. */
  expenses: number
  /** `produced` − `expenses`. */
  profit: number
  margin: number
  /**
   * Produzido menos o que já virou cobrança. Positivo significa trabalho feito
   * que ainda não foi lançado como recebimento; negativo, cobrança acima do que
   * os vídeos somam — quase sempre vídeo que falta cadastrar.
   */
  notBilled: number
}

/**
 * Bloco financeiro de um escopo — cliente, projeto ou vídeo.
 *
 * Lucro e margem saem da produção: o que os vídeos somam menos o que custaram.
 * Os números de recebimento vêm junto porque a pergunta seguinte é sempre
 * "e quanto disso já entrou", mas eles não participam do resultado.
 */
export function financialSummary(
  payments: Payment[],
  expenses: Expense[],
  videos: Video[],
  filters?: ScopeFilter,
): FinancialSummary {
  const scoped = scopedVideos(videos, filters)
  const produced = sumBy(scoped, (video) => video.value)
  const direct = sumBy(scoped, (video) => video.cost)
  const logged = totalExpenses(expenses, filters)
  const cost = direct + logged
  const result = profit(produced, cost)
  const billed = billedRevenue(payments, filters)

  return {
    produced,
    videoCount: scoped.length,
    billed,
    received: paidRevenue(payments, filters),
    receivable: receivableRevenue(payments, filters),
    overdue: overdueRevenue(payments, filters),
    videoCost: direct,
    expenses: cost,
    profit: result,
    margin: margin(result, produced),
    notBilled: produced - billed,
  }
}

export interface MonthlyPoint {
  /** `YYYY-MM`, chave estável para o eixo dos gráficos. */
  key: string
  /** Rótulo curto: "ago". */
  label: string
  /** Receita de produção: vídeos concluídos no mês. */
  produced: number
  /** Vídeos concluídos no mês. */
  completed: number
  /** Caixa que entrou no mês — a outra leitura, para comparação. */
  received: number
  /** Custo dos vídeos concluídos mais os lançamentos com data no mês. */
  expenses: number
  /** `produced` − `expenses`. */
  profit: number
  margin: number
}

/**
 * Série mensal para os gráficos do dashboard e dos relatórios.
 * Cada ponto é um `productionSummary`, com o caixa do mês ao lado.
 */
export function monthlySeries(
  videos: Video[],
  payments: Payment[],
  expenses: Expense[],
  months: Date[],
): MonthlyPoint[] {
  return months.map((month) => {
    const range = monthRange(month)
    const production = productionSummary(videos, expenses, range)
    return {
      key: range.from.slice(0, 7),
      label: month.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      produced: production.produced,
      completed: production.completed,
      received: paidRevenue(payments, { dateRange: range }),
      expenses: production.expenses,
      profit: production.profit,
      margin: production.margin,
    }
  })
}

export interface ProductionSummary {
  /** Soma do preço dos vídeos concluídos no período. */
  produced: number
  /** Quantos vídeos foram concluídos. */
  completed: number
  /** Custo direto desses vídeos. */
  videoCost: number
  /** Lançamentos de custo com data no período. */
  loggedCost: number
  /** Custo total do período. */
  expenses: number
  /** `produced` − `expenses`. */
  profit: number
  margin: number
}

/**
 * Resultado da produção de um período: o que foi concluído menos o que custou.
 * É o cartão de lucro do mês — a leitura que o sistema trata como resultado.
 */
export function productionSummary(
  videos: Video[],
  expenses: Expense[],
  range: DateRange,
): ProductionSummary {
  const completed = completedVideos(videos, range)
  const produced = sumBy(completed, (video) => video.value)
  const direct = sumBy(completed, (video) => video.cost)
  const logged = totalExpenses(expenses, { dateRange: range })
  const cost = direct + logged
  const result = profit(produced, cost)

  return {
    produced,
    completed: completed.length,
    videoCost: direct,
    loggedCost: logged,
    expenses: cost,
    profit: result,
    margin: margin(result, produced),
  }
}

/**
 * Bloco de caixa de um período: o que entrou e o que saiu da conta.
 *
 * Continua existindo ao lado da produção porque responde outra pergunta — mês
 * bom de produção e mês bom de caixa não são o mesmo mês quando o cliente
 * paga depois.
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
