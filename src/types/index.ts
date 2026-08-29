/**
 * FrameFlow — modelo de dados.
 *
 * Datas sao sempre strings ISO. Campos `*Date` guardam apenas o dia
 * (`YYYY-MM-DD`); `createdAt`/`updatedAt`/`convertedAt` guardam o instante
 * completo (`YYYY-MM-DDTHH:mm:ss.sssZ`).
 */

/* -------------------------------------------------------------------------- */
/*                                   Enums                                    */
/* -------------------------------------------------------------------------- */

/** Etapas do funil comercial. A ordem e a ordem das colunas do Kanban. */
export enum LeadStage {
  NEW = 'new',
  CONTACTED = 'contacted',
  REPLIED = 'replied',
  MEETING = 'meeting',
  PROPOSAL_SENT = 'proposal_sent',
  NEGOTIATION = 'negotiation',
  CLOSED = 'closed',
  LOST = 'lost',
}

export enum LeadSource {
  INSTAGRAM = 'instagram',
  REFERRAL = 'referral',
  YOUTUBE = 'youtube',
  WEBSITE = 'website',
  COLD_EMAIL = 'cold_email',
  NETWORKING = 'networking',
  OTHER = 'other',
}

export enum ClientStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PAUSED = 'paused',
  LOST = 'lost',
}

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum VideoType {
  YOUTUBE_LONGFORM = 'youtube_longform',
  YOUTUBE_SHORT = 'youtube_short',
  INSTAGRAM_REEL = 'instagram_reel',
  TIKTOK = 'tiktok',
  AD = 'ad',
  INSTITUTIONAL = 'institutional',
  PODCAST = 'podcast',
  OTHER = 'other',
}

/** Etapas da esteira de producao. A ordem e a ordem das colunas do Kanban. */
export enum VideoStatus {
  BRIEFING = 'briefing',
  MATERIAL_RECEIVED = 'material_received',
  EDITING = 'editing',
  INTERNAL_REVIEW = 'internal_review',
  SENT_TO_CLIENT = 'sent_to_client',
  CHANGES = 'changes',
  APPROVED = 'approved',
  DELIVERED = 'delivered',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  PIX = 'pix',
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  BOLETO = 'boleto',
  OTHER = 'other',
}

export enum ExpenseCategory {
  FREELANCER = 'freelancer',
  SOFTWARE = 'software',
  MUSIC = 'music',
  STOCK = 'stock',
  PLUGINS = 'plugins',
  EQUIPMENT = 'equipment',
  SERVICES = 'services',
  OTHER = 'other',
}

export enum ContractStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  PENDING_RENEWAL = 'pending_renewal',
}

export enum ContractFrequency {
  ONE_TIME = 'one_time',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
}

export enum RevisionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum CalendarEventType {
  DEADLINE = 'deadline',
  TASK = 'task',
  MEETING = 'meeting',
  DELIVERY = 'delivery',
  FOLLOWUP = 'followup',
  PAYMENT = 'payment',
}

export enum ActivityAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  STATUS_CHANGED = 'status_changed',
  CONVERTED = 'converted',
  PAYMENT_REGISTERED = 'payment_registered',
  VIDEO_DELIVERED = 'video_delivered',
}

/** Reservado para o modo multiusuario. Ainda nao usado pela UI. */
export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  EDITOR = 'editor',
  FREELANCER = 'freelancer',
  VIEWER = 'viewer',
}

/* -------------------------------------------------------------------------- */
/*                                 Entidades                                  */
/* -------------------------------------------------------------------------- */

export interface Lead {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  instagram: string | null
  youtube: string | null
  website: string | null
  niche: string | null
  source: LeadSource
  desiredService: string | null
  estimatedBudget: number | null
  potentialValue: number | null
  stage: LeadStage
  /** 0-100 */
  closeProbability: number | null
  firstContactDate: string | null
  lastContactDate: string | null
  nextFollowUpDate: string | null
  nextFollowUpAction: string | null
  notes: string | null
  convertedToClientId: string | null
  convertedAt: string | null
  createdAt: string
  updatedAt: string
}

export type LeadActivityType =
  | 'contact'
  | 'meeting'
  | 'message'
  | 'proposal'
  | 'note'
  | 'followup'
  | 'stage_change'

export interface LeadActivity {
  id: string
  leadId: string
  type: LeadActivityType
  title: string
  description: string | null
  date: string
  createdAt: string
}

export interface Client {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  instagram: string | null
  youtube: string | null
  website: string | null
  niche: string | null
  status: ClientStatus
  source: LeadSource
  /** Preenchido quando o cliente veio da conversao de um lead. */
  leadId: string | null
  entryDate: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  clientId: string
  description: string | null
  /** Rotulo livre: "YouTube", "Instagram", "Anuncios". */
  type: string | null
  status: ProjectStatus
  startDate: string | null
  deadline: string | null
  contractedValue: number
  estimatedCost: number
  responsible: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/** Checklist de producao de um video. As chaves espelham a esteira de status. */
export interface VideoChecklist {
  briefingReceived: boolean
  materialReceived: boolean
  filesOrganized: boolean
  roughCut: boolean
  editing: boolean
  soundDesign: boolean
  colorGrading: boolean
  motionGraphics: boolean
  subtitles: boolean
  internalReview: boolean
  sentToClient: boolean
  changesApplied: boolean
  finalExport: boolean
  delivered: boolean
}

export type VideoChecklistKey = keyof VideoChecklist

export interface Video {
  id: string
  title: string
  clientId: string
  projectId: string
  type: VideoType
  status: VideoStatus
  priority: Priority
  deadline: string | null
  durationSeconds: number | null
  value: number
  cost: number
  estimatedHours: number | null
  workedHours: number | null
  fileLinks: FileLink[]
  notes: string | null
  checklist: VideoChecklist
  createdAt: string
  updatedAt: string
}

export interface VideoRevision {
  id: string
  videoId: string
  version: number
  date: string
  comments: string | null
  changesRequested: string | null
  status: RevisionStatus
  createdAt: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  responsible: string | null
  priority: Priority
  status: TaskStatus
  deadline: string | null
  clientId: string | null
  projectId: string | null
  videoId: string | null
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  description: string
  amount: number
  clientId: string | null
  projectId: string | null
  videoId: string | null
  dueDate: string
  paymentDate: string | null
  status: PaymentStatus
  method: PaymentMethod | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface Expense {
  id: string
  description: string
  amount: number
  category: ExpenseCategory
  clientId: string | null
  projectId: string | null
  videoId: string | null
  date: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface Contract {
  id: string
  clientId: string
  value: number
  frequency: ContractFrequency
  startDate: string
  renewalDate: string | null
  videoQuantity: number | null
  status: ContractStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface FileLink {
  id: string
  videoId: string
  /** Rotulo do destino: "Google Drive", "Frame.io". */
  label: string
  url: string
  createdAt: string
}

/** Entidades que podem ser referenciadas por eventos de calendario. */
export type CalendarEntityType =
  | 'lead'
  | 'client'
  | 'project'
  | 'video'
  | 'task'
  | 'payment'

export interface CalendarEvent {
  id: string
  title: string
  type: CalendarEventType
  date: string
  entityType: CalendarEntityType | null
  entityId: string | null
  notes: string | null
  createdAt: string
}

/** Entidades que geram registro no historico de atividades. */
export type ActivityEntityType =
  | 'lead'
  | 'client'
  | 'project'
  | 'video'
  | 'task'
  | 'payment'
  | 'expense'
  | 'contract'

export interface ActivityLog {
  id: string
  action: ActivityAction
  entityType: ActivityEntityType
  entityId: string
  entityName: string
  details: string | null
  previousValue: string | null
  newValue: string | null
  createdAt: string
}

export type NotificationType =
  | 'overdue_video'
  | 'overdue_payment'
  | 'overdue_followup'
  | 'upcoming_deadline'
  | 'contract_renewal'
  | 'overdue_task'

export interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  entityType: string | null
  entityId: string | null
  read: boolean
  createdAt: string
}

/* -------------------------------------------------------------------------- */
/*                              Tipos utilitarios                             */
/* -------------------------------------------------------------------------- */

/** Campos gerados pelo sistema em toda criacao de registro. */
export type SystemFields = 'id' | 'createdAt' | 'updatedAt'

/** Payload de criacao: tudo menos os campos gerados pelo sistema. */
export type NewRecord<T> = Omit<T, Extract<keyof T, SystemFields>>

/** Intervalo de datas usado pelos filtros de relatorios e financeiro. */
export interface DateRange {
  /** ISO `YYYY-MM-DD`, inclusivo. */
  from: string
  /** ISO `YYYY-MM-DD`, inclusivo. */
  to: string
}

/** Escopo comum de filtragem financeira. */
export interface ScopeFilter {
  clientId?: string
  projectId?: string
  videoId?: string
  dateRange?: DateRange
}
