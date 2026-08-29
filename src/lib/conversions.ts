import { logActivity, logCreated } from '@/lib/activity'
import { clientsStore, leadActivitiesStore, leadsStore } from '@/lib/store'
import { now, today } from '@/lib/utils'
import { ActivityAction, ClientStatus, LeadStage, type Client, type Lead } from '@/types'

/**
 * Converte um lead fechado em cliente.
 *
 * O lead não é apagado: ele fica marcado como convertido e guarda o id do
 * cliente. É o que permite responder "de onde veio este cliente?" e manter o
 * histórico comercial ligado à conta depois do fechamento.
 *
 * Devolve o cliente criado, ou o já existente se o lead já tinha sido
 * convertido — converter duas vezes por engano não deve duplicar a carteira.
 */
export function convertLeadToClient(lead: Lead): Client {
  if (lead.convertedToClientId) {
    const existing = clientsStore.byId(lead.convertedToClientId)
    if (existing) return existing
  }

  const client = clientsStore.create({
    name: lead.name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    whatsapp: lead.whatsapp,
    instagram: lead.instagram,
    youtube: lead.youtube,
    website: lead.website,
    niche: lead.niche,
    status: ClientStatus.ACTIVE,
    source: lead.source,
    leadId: lead.id,
    entryDate: today(),
    notes: lead.notes,
  })

  leadsStore.update(lead.id, {
    stage: LeadStage.CLOSED,
    closeProbability: 100,
    convertedToClientId: client.id,
    convertedAt: now(),
    nextFollowUpDate: null,
    nextFollowUpAction: null,
  })

  leadActivitiesStore.create({
    leadId: lead.id,
    type: 'stage_change',
    title: 'Convertido em cliente',
    description: `${lead.name} passou a fazer parte da carteira.`,
    date: today(),
  })

  logActivity({
    action: ActivityAction.CONVERTED,
    entityType: 'lead',
    entityId: lead.id,
    entityName: lead.name,
    details: 'Lead convertido em cliente.',
    previousValue: lead.stage,
    newValue: LeadStage.CLOSED,
  })

  logCreated('client', client.id, client.name, `Originado do lead ${lead.name}.`)

  return client
}
