import { activityLogStore } from '@/lib/store'
import { ActivityAction, type ActivityEntityType } from '@/types'

/**
 * Registro do histórico de alterações.
 *
 * Toda escrita que o usuário reconheceria como "uma coisa que aconteceu" passa
 * por aqui. O histórico é append-only: nada nunca é editado nem removido, para
 * que as abas de histórico contem a sequência real dos fatos.
 */

interface LogInput {
  action: ActivityAction
  entityType: ActivityEntityType
  entityId: string
  entityName: string
  details?: string | null
  previousValue?: string | null
  newValue?: string | null
}

export function logActivity(input: LogInput): void {
  activityLogStore.create({
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    entityName: input.entityName,
    details: input.details ?? null,
    previousValue: input.previousValue ?? null,
    newValue: input.newValue ?? null,
  })
}

export function logCreated(
  entityType: ActivityEntityType,
  entityId: string,
  entityName: string,
  details?: string,
): void {
  logActivity({ action: ActivityAction.CREATED, entityType, entityId, entityName, details })
}

export function logUpdated(
  entityType: ActivityEntityType,
  entityId: string,
  entityName: string,
  details?: string,
): void {
  logActivity({ action: ActivityAction.UPDATED, entityType, entityId, entityName, details })
}

export function logDeleted(
  entityType: ActivityEntityType,
  entityId: string,
  entityName: string,
  details?: string,
): void {
  logActivity({ action: ActivityAction.DELETED, entityType, entityId, entityName, details })
}

/** Mudança de etapa/status, guardando de onde veio e para onde foi. */
export function logStatusChange(
  entityType: ActivityEntityType,
  entityId: string,
  entityName: string,
  previous: string,
  next: string,
  details?: string,
): void {
  logActivity({
    action: ActivityAction.STATUS_CHANGED,
    entityType,
    entityId,
    entityName,
    previousValue: previous,
    newValue: next,
    details,
  })
}
