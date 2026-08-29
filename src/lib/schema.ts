import type {
  ActivityLog,
  CalendarEvent,
  Client,
  Contract,
  Expense,
  Lead,
  LeadActivity,
  Notification,
  Payment,
  Project,
  Task,
  Video,
  VideoRevision,
} from '@/types'

/**
 * Forma do banco persistido.
 *
 * Fica em um módulo próprio porque tanto o store quanto o seed dependem dela —
 * se vivesse dentro do store, os dois se importariam em círculo.
 */

export const STORAGE_KEY = 'frameflow:db'
export const SCHEMA_VERSION = 1

export interface Database {
  leads: Lead[]
  leadActivities: LeadActivity[]
  clients: Client[]
  projects: Project[]
  videos: Video[]
  videoRevisions: VideoRevision[]
  tasks: Task[]
  payments: Payment[]
  expenses: Expense[]
  contracts: Contract[]
  calendarEvents: CalendarEvent[]
  activityLog: ActivityLog[]
  notifications: Notification[]
  meta: {
    version: number
    seededAt: string | null
    updatedAt: string
  }
}

/** Coleções que guardam registros — exclui `meta`. */
export type CollectionKey = Exclude<keyof Database, 'meta'>

/** Banco vazio: também define a lista canônica de coleções. */
export const EMPTY_DATABASE: Database = {
  leads: [],
  leadActivities: [],
  clients: [],
  projects: [],
  videos: [],
  videoRevisions: [],
  tasks: [],
  payments: [],
  expenses: [],
  contracts: [],
  calendarEvents: [],
  activityLog: [],
  notifications: [],
  meta: { version: SCHEMA_VERSION, seededAt: null, updatedAt: '' },
}

/** Rótulos das coleções para a tela de configurações. */
export const COLLECTION_LABEL: Record<CollectionKey, string> = {
  leads: 'Leads',
  leadActivities: 'Atividades de leads',
  clients: 'Clientes',
  projects: 'Projetos',
  videos: 'Vídeos',
  videoRevisions: 'Revisões',
  tasks: 'Tarefas',
  payments: 'Pagamentos',
  expenses: 'Custos',
  contracts: 'Contratos',
  calendarEvents: 'Eventos',
  activityLog: 'Histórico',
  notifications: 'Notificações',
}
