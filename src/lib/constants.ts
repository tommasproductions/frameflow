import {
  ActivityAction,
  CalendarEventType,
  ClientStatus,
  ContractFrequency,
  ContractStatus,
  ExpenseCategory,
  LeadSource,
  LeadStage,
  PaymentMethod,
  PaymentStatus,
  Priority,
  ProjectStatus,
  RevisionStatus,
  TaskStatus,
  VideoStatus,
  VideoType,
  type VideoChecklist,
  type VideoChecklistKey,
} from '@/types'

/* -------------------------------------------------------------------------- */
/*                                    Tons                                    */
/* -------------------------------------------------------------------------- */

/**
 * Vocabulário de cor semântica do sistema. Toda badge, ponto de status e
 * série de gráfico resolve para um destes seis tons — nunca para uma cor solta.
 */
export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'neutral'

/** Classes utilitárias por tom: fundo sutil + texto colorido. */
export const TONE_BADGE: Record<Tone, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
  accent: 'bg-accent/12 text-accent',
  neutral: 'bg-ink-faint/10 text-ink-faint',
}

/** Apenas a cor do texto — para números e rótulos fora de badges. */
export const TONE_TEXT: Record<Tone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
  accent: 'text-accent',
  neutral: 'text-ink-faint',
}

/** Apenas o preenchimento — para pontos, barras de progresso e trilhos. */
export const TONE_FILL: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  accent: 'bg-accent',
  neutral: 'bg-ink-faint',
}

/**
 * Valores hex — Recharts e SVG não leem classes do Tailwind.
 *
 * Precisa espelhar os tokens de `index.css`. Não há como o TypeScript garantir
 * isso, então mexer num lado pede conferir o outro.
 */
export const TONE_HEX: Record<Tone, string> = {
  success: '#3FB950',
  warning: '#D29922',
  danger: '#F85149',
  info: '#8B8B93',
  accent: '#FAFAFA',
  neutral: '#7E7E87',
}

/** Cores cruas do tema, para quando um componente precisa do hex. */
export const THEME_HEX = {
  canvas: '#0A0A0B',
  surface: '#101011',
  card: '#151517',
  hover: '#1E1E21',
  line: '#25252A',
  lineActive: '#3A3A41',
  ink: '#FAFAFA',
  inkDim: '#A1A1A6',
  inkFaint: '#7E7E87',
  accent: '#FAFAFA',
  accentHover: '#FFFFFF',
  success: '#3FB950',
  warning: '#D29922',
  danger: '#F85149',
  info: '#8B8B93',
} as const

/* -------------------------------------------------------------------------- */
/*                            Rótulos e tons — Leads                          */
/* -------------------------------------------------------------------------- */

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  [LeadStage.NEW]: 'Novo',
  [LeadStage.CONTACTED]: 'Contatado',
  [LeadStage.REPLIED]: 'Respondeu',
  [LeadStage.MEETING]: 'Reunião',
  [LeadStage.PROPOSAL_SENT]: 'Proposta enviada',
  [LeadStage.NEGOTIATION]: 'Negociação',
  [LeadStage.CLOSED]: 'Fechado',
  [LeadStage.LOST]: 'Perdido',
}

export const LEAD_STAGE_TONE: Record<LeadStage, Tone> = {
  [LeadStage.NEW]: 'info',
  [LeadStage.CONTACTED]: 'info',
  [LeadStage.REPLIED]: 'warning',
  [LeadStage.MEETING]: 'warning',
  [LeadStage.PROPOSAL_SENT]: 'accent',
  [LeadStage.NEGOTIATION]: 'accent',
  [LeadStage.CLOSED]: 'success',
  [LeadStage.LOST]: 'danger',
}

/** Ordem das colunas do Kanban comercial. */
export const LEAD_STAGE_ORDER: LeadStage[] = [
  LeadStage.NEW,
  LeadStage.CONTACTED,
  LeadStage.REPLIED,
  LeadStage.MEETING,
  LeadStage.PROPOSAL_SENT,
  LeadStage.NEGOTIATION,
  LeadStage.CLOSED,
  LeadStage.LOST,
]

/** Etapas que ainda contam como oportunidade viva no funil. */
export const LEAD_OPEN_STAGES: LeadStage[] = [
  LeadStage.NEW,
  LeadStage.CONTACTED,
  LeadStage.REPLIED,
  LeadStage.MEETING,
  LeadStage.PROPOSAL_SENT,
  LeadStage.NEGOTIATION,
]

/**
 * Probabilidade de fechamento sugerida por etapa.
 *
 * É só um padrão: o usuário pode sobrescrever no formulário. Quando o valor
 * atual bate com o padrão da etapa de origem, mover o lead atualiza junto —
 * quando não bate, foi ajustado à mão e é preservado.
 */
export const LEAD_STAGE_PROBABILITY: Record<LeadStage, number> = {
  [LeadStage.NEW]: 10,
  [LeadStage.CONTACTED]: 20,
  [LeadStage.REPLIED]: 35,
  [LeadStage.MEETING]: 50,
  [LeadStage.PROPOSAL_SENT]: 65,
  [LeadStage.NEGOTIATION]: 80,
  [LeadStage.CLOSED]: 100,
  [LeadStage.LOST]: 0,
}

/**
 * Aplica a sugestão de probabilidade ao mudar de etapa, respeitando um valor
 * que tenha sido definido manualmente.
 */
export function nextProbability(
  current: number | null,
  from: LeadStage,
  to: LeadStage,
): number | null {
  if (current === null) return LEAD_STAGE_PROBABILITY[to]
  return current === LEAD_STAGE_PROBABILITY[from] ? LEAD_STAGE_PROBABILITY[to] : current
}

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  [LeadSource.INSTAGRAM]: 'Instagram',
  [LeadSource.REFERRAL]: 'Indicação',
  [LeadSource.YOUTUBE]: 'YouTube',
  [LeadSource.WEBSITE]: 'Site',
  [LeadSource.COLD_EMAIL]: 'Cold email',
  [LeadSource.NETWORKING]: 'Networking',
  [LeadSource.OTHER]: 'Outro',
}

/* -------------------------------------------------------------------------- */
/*                              Clientes e projetos                           */
/* -------------------------------------------------------------------------- */

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  [ClientStatus.ACTIVE]: 'Ativo',
  [ClientStatus.INACTIVE]: 'Inativo',
  [ClientStatus.PAUSED]: 'Pausado',
  [ClientStatus.LOST]: 'Perdido',
}

export const CLIENT_STATUS_TONE: Record<ClientStatus, Tone> = {
  [ClientStatus.ACTIVE]: 'success',
  [ClientStatus.INACTIVE]: 'neutral',
  [ClientStatus.PAUSED]: 'neutral',
  [ClientStatus.LOST]: 'danger',
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  [ProjectStatus.PLANNING]: 'Planejamento',
  [ProjectStatus.ACTIVE]: 'Ativo',
  [ProjectStatus.PAUSED]: 'Pausado',
  [ProjectStatus.COMPLETED]: 'Concluído',
  [ProjectStatus.CANCELLED]: 'Cancelado',
}

export const PROJECT_STATUS_TONE: Record<ProjectStatus, Tone> = {
  [ProjectStatus.PLANNING]: 'info',
  [ProjectStatus.ACTIVE]: 'success',
  [ProjectStatus.PAUSED]: 'neutral',
  [ProjectStatus.COMPLETED]: 'success',
  [ProjectStatus.CANCELLED]: 'danger',
}

/* -------------------------------------------------------------------------- */
/*                                   Vídeos                                   */
/* -------------------------------------------------------------------------- */

export const VIDEO_TYPE_LABEL: Record<VideoType, string> = {
  [VideoType.YOUTUBE_LONGFORM]: 'YouTube (longo)',
  [VideoType.YOUTUBE_SHORT]: 'YouTube Short',
  [VideoType.INSTAGRAM_REEL]: 'Reel',
  [VideoType.TIKTOK]: 'TikTok',
  [VideoType.AD]: 'Anúncio',
  [VideoType.INSTITUTIONAL]: 'Institucional',
  [VideoType.PODCAST]: 'Podcast',
  [VideoType.OTHER]: 'Outro',
}

export const VIDEO_STATUS_LABEL: Record<VideoStatus, string> = {
  [VideoStatus.BRIEFING]: 'Briefing',
  [VideoStatus.MATERIAL_RECEIVED]: 'Material recebido',
  [VideoStatus.EDITING]: 'Edição',
  [VideoStatus.INTERNAL_REVIEW]: 'Revisão interna',
  [VideoStatus.SENT_TO_CLIENT]: 'Enviado ao cliente',
  [VideoStatus.CHANGES]: 'Alterações',
  [VideoStatus.APPROVED]: 'Aprovado',
  [VideoStatus.DELIVERED]: 'Entregue',
}

/** Rótulo curto para cabeçalhos de coluna do Kanban de produção. */
export const VIDEO_STATUS_SHORT: Record<VideoStatus, string> = {
  [VideoStatus.BRIEFING]: 'Briefing',
  [VideoStatus.MATERIAL_RECEIVED]: 'Material',
  [VideoStatus.EDITING]: 'Edição',
  [VideoStatus.INTERNAL_REVIEW]: 'Revisão',
  [VideoStatus.SENT_TO_CLIENT]: 'Enviado',
  [VideoStatus.CHANGES]: 'Alterações',
  [VideoStatus.APPROVED]: 'Aprovado',
  [VideoStatus.DELIVERED]: 'Entregue',
}

export const VIDEO_STATUS_TONE: Record<VideoStatus, Tone> = {
  [VideoStatus.BRIEFING]: 'info',
  [VideoStatus.MATERIAL_RECEIVED]: 'info',
  [VideoStatus.EDITING]: 'warning',
  [VideoStatus.INTERNAL_REVIEW]: 'warning',
  [VideoStatus.SENT_TO_CLIENT]: 'accent',
  [VideoStatus.CHANGES]: 'danger',
  [VideoStatus.APPROVED]: 'success',
  [VideoStatus.DELIVERED]: 'success',
}

/** Ordem das colunas do Kanban de produção. */
export const VIDEO_STATUS_ORDER: VideoStatus[] = [
  VideoStatus.BRIEFING,
  VideoStatus.MATERIAL_RECEIVED,
  VideoStatus.EDITING,
  VideoStatus.INTERNAL_REVIEW,
  VideoStatus.SENT_TO_CLIENT,
  VideoStatus.CHANGES,
  VideoStatus.APPROVED,
  VideoStatus.DELIVERED,
]

/** Status que encerram a produção — usados para "em produção" e atrasos. */
export const VIDEO_CLOSED_STATUSES: VideoStatus[] = [VideoStatus.APPROVED, VideoStatus.DELIVERED]

/**
 * Ao mover um vídeo para um status, estas caixas do checklist são marcadas.
 * Espelha o fluxo "Pipeline de produção (drag)" da arquitetura.
 */
export const STATUS_CHECKLIST_MAP: Record<VideoStatus, VideoChecklistKey[]> = {
  [VideoStatus.BRIEFING]: ['briefingReceived'],
  [VideoStatus.MATERIAL_RECEIVED]: ['briefingReceived', 'materialReceived'],
  [VideoStatus.EDITING]: ['briefingReceived', 'materialReceived', 'filesOrganized', 'editing'],
  [VideoStatus.INTERNAL_REVIEW]: [
    'briefingReceived',
    'materialReceived',
    'filesOrganized',
    'roughCut',
    'editing',
    'internalReview',
  ],
  [VideoStatus.SENT_TO_CLIENT]: [
    'briefingReceived',
    'materialReceived',
    'filesOrganized',
    'roughCut',
    'editing',
    'internalReview',
    'sentToClient',
  ],
  // Em alterações o vídeo já passou por tudo até o envio; o que falta é aplicar.
  [VideoStatus.CHANGES]: [
    'briefingReceived',
    'materialReceived',
    'filesOrganized',
    'roughCut',
    'editing',
    'internalReview',
    'sentToClient',
  ],
  [VideoStatus.APPROVED]: [
    'briefingReceived',
    'materialReceived',
    'filesOrganized',
    'roughCut',
    'editing',
    'internalReview',
    'sentToClient',
    'changesApplied',
    'finalExport',
  ],
  [VideoStatus.DELIVERED]: [
    'briefingReceived',
    'materialReceived',
    'filesOrganized',
    'roughCut',
    'editing',
    'internalReview',
    'sentToClient',
    'changesApplied',
    'finalExport',
    'delivered',
  ],
}

/** Checklist zerado — ponto de partida de todo vídeo novo. */
export const EMPTY_CHECKLIST: VideoChecklist = {
  briefingReceived: false,
  materialReceived: false,
  filesOrganized: false,
  roughCut: false,
  editing: false,
  soundDesign: false,
  colorGrading: false,
  motionGraphics: false,
  subtitles: false,
  internalReview: false,
  sentToClient: false,
  changesApplied: false,
  finalExport: false,
  delivered: false,
}

/**
 * Marca no checklist tudo que o status implica.
 *
 * É a regra usada em três lugares: ao arrastar um card na esteira, ao criar
 * vídeos por template e ao montar o seed. Só acrescenta — nunca desmarca uma
 * etapa opcional (legendas, motion, cor) que já tenha sido concluída.
 */
export function applyStatusToChecklist(
  status: VideoStatus,
  current: VideoChecklist = EMPTY_CHECKLIST,
): VideoChecklist {
  const next = { ...current }
  for (const key of STATUS_CHECKLIST_MAP[status]) next[key] = true
  return next
}

/** Checklist na ordem em que aparece na página do vídeo. */
export const CHECKLIST_ITEMS: { key: VideoChecklistKey; label: string }[] = [
  { key: 'briefingReceived', label: 'Briefing recebido' },
  { key: 'materialReceived', label: 'Material recebido' },
  { key: 'filesOrganized', label: 'Arquivos organizados' },
  { key: 'roughCut', label: 'Corte bruto' },
  { key: 'editing', label: 'Edição' },
  { key: 'soundDesign', label: 'Sound design' },
  { key: 'colorGrading', label: 'Color grading' },
  { key: 'motionGraphics', label: 'Motion graphics' },
  { key: 'subtitles', label: 'Legendas' },
  { key: 'internalReview', label: 'Revisão interna' },
  { key: 'sentToClient', label: 'Enviado ao cliente' },
  { key: 'changesApplied', label: 'Alterações aplicadas' },
  { key: 'finalExport', label: 'Exportação final' },
  { key: 'delivered', label: 'Entregue' },
]

export const REVISION_STATUS_LABEL: Record<RevisionStatus, string> = {
  [RevisionStatus.PENDING]: 'Pendente',
  [RevisionStatus.IN_PROGRESS]: 'Em andamento',
  [RevisionStatus.COMPLETED]: 'Concluída',
}

export const REVISION_STATUS_TONE: Record<RevisionStatus, Tone> = {
  [RevisionStatus.PENDING]: 'warning',
  [RevisionStatus.IN_PROGRESS]: 'warning',
  [RevisionStatus.COMPLETED]: 'success',
}

/* -------------------------------------------------------------------------- */
/*                             Tarefas e prioridade                           */
/* -------------------------------------------------------------------------- */

export const PRIORITY_LABEL: Record<Priority, string> = {
  [Priority.LOW]: 'Baixa',
  [Priority.MEDIUM]: 'Média',
  [Priority.HIGH]: 'Alta',
  [Priority.URGENT]: 'Urgente',
}

export const PRIORITY_TONE: Record<Priority, Tone> = {
  [Priority.LOW]: 'neutral',
  [Priority.MEDIUM]: 'info',
  [Priority.HIGH]: 'warning',
  [Priority.URGENT]: 'danger',
}

/** Peso para ordenar listas por urgência (maior primeiro). */
export const PRIORITY_WEIGHT: Record<Priority, number> = {
  [Priority.URGENT]: 4,
  [Priority.HIGH]: 3,
  [Priority.MEDIUM]: 2,
  [Priority.LOW]: 1,
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'A fazer',
  [TaskStatus.IN_PROGRESS]: 'Em andamento',
  [TaskStatus.DONE]: 'Concluído',
}

export const TASK_STATUS_TONE: Record<TaskStatus, Tone> = {
  [TaskStatus.TODO]: 'info',
  [TaskStatus.IN_PROGRESS]: 'warning',
  [TaskStatus.DONE]: 'success',
}

export const TASK_STATUS_ORDER: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.DONE,
]

/* -------------------------------------------------------------------------- */
/*                                 Financeiro                                 */
/* -------------------------------------------------------------------------- */

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: 'Pendente',
  [PaymentStatus.PAID]: 'Pago',
  [PaymentStatus.OVERDUE]: 'Atrasado',
  [PaymentStatus.CANCELLED]: 'Cancelado',
}

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, Tone> = {
  [PaymentStatus.PENDING]: 'warning',
  [PaymentStatus.PAID]: 'success',
  [PaymentStatus.OVERDUE]: 'danger',
  [PaymentStatus.CANCELLED]: 'neutral',
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.PIX]: 'Pix',
  [PaymentMethod.BANK_TRANSFER]: 'Transferência',
  [PaymentMethod.CREDIT_CARD]: 'Cartão de crédito',
  [PaymentMethod.BOLETO]: 'Boleto',
  [PaymentMethod.OTHER]: 'Outro',
}

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  [ExpenseCategory.FREELANCER]: 'Freelancer',
  [ExpenseCategory.SOFTWARE]: 'Software',
  [ExpenseCategory.MUSIC]: 'Música',
  [ExpenseCategory.STOCK]: 'Stock',
  [ExpenseCategory.PLUGINS]: 'Plugins',
  [ExpenseCategory.EQUIPMENT]: 'Equipamento',
  [ExpenseCategory.SERVICES]: 'Serviços',
  [ExpenseCategory.OTHER]: 'Outro',
}

/** Paleta categórica para o gráfico de custos por categoria. */
export const EXPENSE_CATEGORY_HEX: Record<ExpenseCategory, string> = {
  [ExpenseCategory.FREELANCER]: '#6C5CE7',
  [ExpenseCategory.SOFTWARE]: '#74B9FF',
  [ExpenseCategory.MUSIC]: '#00B894',
  [ExpenseCategory.STOCK]: '#FDCB6E',
  [ExpenseCategory.PLUGINS]: '#FF6B6B',
  [ExpenseCategory.EQUIPMENT]: '#A29BFE',
  [ExpenseCategory.SERVICES]: '#55EFC4',
  [ExpenseCategory.OTHER]: '#5C6378',
}

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  [ContractStatus.ACTIVE]: 'Ativo',
  [ContractStatus.EXPIRED]: 'Expirado',
  [ContractStatus.CANCELLED]: 'Cancelado',
  [ContractStatus.PENDING_RENEWAL]: 'Renovação pendente',
}

export const CONTRACT_STATUS_TONE: Record<ContractStatus, Tone> = {
  [ContractStatus.ACTIVE]: 'success',
  [ContractStatus.EXPIRED]: 'neutral',
  [ContractStatus.CANCELLED]: 'danger',
  [ContractStatus.PENDING_RENEWAL]: 'warning',
}

export const CONTRACT_FREQUENCY_LABEL: Record<ContractFrequency, string> = {
  [ContractFrequency.ONE_TIME]: 'Avulso',
  [ContractFrequency.WEEKLY]: 'Semanal',
  [ContractFrequency.BIWEEKLY]: 'Quinzenal',
  [ContractFrequency.MONTHLY]: 'Mensal',
  [ContractFrequency.QUARTERLY]: 'Trimestral',
}

/** Quantas ocorrências por mês cada frequência representa (para MRR). */
export const CONTRACT_FREQUENCY_PER_MONTH: Record<ContractFrequency, number> = {
  [ContractFrequency.ONE_TIME]: 0,
  [ContractFrequency.WEEKLY]: 4,
  [ContractFrequency.BIWEEKLY]: 2,
  [ContractFrequency.MONTHLY]: 1,
  [ContractFrequency.QUARTERLY]: 1 / 3,
}

/* -------------------------------------------------------------------------- */
/*                            Calendário e histórico                          */
/* -------------------------------------------------------------------------- */

export const CALENDAR_EVENT_LABEL: Record<CalendarEventType, string> = {
  [CalendarEventType.DEADLINE]: 'Prazo',
  [CalendarEventType.TASK]: 'Tarefa',
  [CalendarEventType.MEETING]: 'Reunião',
  [CalendarEventType.DELIVERY]: 'Entrega',
  [CalendarEventType.FOLLOWUP]: 'Follow-up',
  [CalendarEventType.PAYMENT]: 'Pagamento',
}

export const CALENDAR_EVENT_TONE: Record<CalendarEventType, Tone> = {
  [CalendarEventType.DEADLINE]: 'danger',
  [CalendarEventType.TASK]: 'info',
  [CalendarEventType.MEETING]: 'accent',
  [CalendarEventType.DELIVERY]: 'success',
  [CalendarEventType.FOLLOWUP]: 'warning',
  [CalendarEventType.PAYMENT]: 'success',
}

export const ACTIVITY_ACTION_LABEL: Record<ActivityAction, string> = {
  [ActivityAction.CREATED]: 'Criado',
  [ActivityAction.UPDATED]: 'Atualizado',
  [ActivityAction.DELETED]: 'Excluído',
  [ActivityAction.STATUS_CHANGED]: 'Status alterado',
  [ActivityAction.CONVERTED]: 'Convertido',
  [ActivityAction.PAYMENT_REGISTERED]: 'Pagamento registrado',
  [ActivityAction.VIDEO_DELIVERED]: 'Vídeo entregue',
}

export const ENTITY_LABEL: Record<string, string> = {
  lead: 'Lead',
  client: 'Cliente',
  project: 'Projeto',
  video: 'Vídeo',
  task: 'Tarefa',
  payment: 'Pagamento',
  expense: 'Custo',
  contract: 'Contrato',
}

/* -------------------------------------------------------------------------- */
/*                              Ajustes gerais                                */
/* -------------------------------------------------------------------------- */

/** Janela, em dias, para "prazo se aproximando" nos alertas do dashboard. */
export const UPCOMING_DEADLINE_DAYS = 7

/** Janela, em dias, para avisar sobre renovação de contrato. */
export const CONTRACT_RENEWAL_WARNING_DAYS = 30

/** Quantos meses o dashboard mostra nos gráficos de série temporal. */
export const DASHBOARD_MONTHS = 6

/** Utilitário genérico: converte um Record de rótulos em opções de select. */
export function toOptions<K extends string>(
  labels: Record<K, string>,
): { value: K; label: string }[] {
  return (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }))
}
