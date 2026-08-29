import {
  ArrowRight,
  CalendarClock,
  MessageCircle,
  MoreVertical,
  Pencil,
  Target,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { LeadForm } from '@/components/forms/LeadForm'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ContactList } from '@/components/shared/ContactList'
import { EmptyState } from '@/components/shared/EmptyState'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, Input, Textarea } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLeadActivities } from '@/hooks/useLeadActivities'
import { useLeads } from '@/hooks/useLeads'
import { logDeleted, logStatusChange, logUpdated } from '@/lib/activity'
import { convertLeadToClient } from '@/lib/conversions'
import { LEAD_SOURCE_LABEL, LEAD_STAGE_LABEL, nextProbability, toOptions } from '@/lib/constants'
import { leadActivitiesStore } from '@/lib/store'
import {
  cn,
  daysUntil,
  deadlineLabel,
  formatCurrency,
  formatDate,
  sortBy,
  today,
} from '@/lib/utils'
import { LeadStage, type LeadActivity, type LeadActivityType } from '@/types'

/* -------------------------------------------------------------------------- */
/*                                  Timeline                                  */
/* -------------------------------------------------------------------------- */

const ACTIVITY_LABEL: Record<LeadActivityType, string> = {
  contact: 'Contato',
  meeting: 'Reunião',
  message: 'Mensagem',
  proposal: 'Proposta',
  note: 'Nota',
  followup: 'Follow-up',
  stage_change: 'Mudança de etapa',
}

function Timeline({ activities }: { activities: LeadActivity[] }) {
  if (activities.length === 0) {
    return (
      <EmptyState
        size="inline"
        icon={MessageCircle}
        title="Sem atividades"
        description="Registre contatos, reuniões e propostas para montar o histórico."
      />
    )
  }

  return (
    <ol className="relative space-y-4 pl-5">
      {/* Trilho vertical que liga os marcadores. */}
      <span aria-hidden className="absolute top-1 bottom-1 left-[3px] w-px bg-line" />
      {activities.map((activity) => (
        <li key={activity.id} className="relative">
          <span
            aria-hidden
            className="absolute top-1.5 -left-5 size-[7px] rounded-full bg-line-active ring-4 ring-card"
          />
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-ink">{activity.title}</p>
            <span className="tabular shrink-0 text-xs text-ink-faint">
              {formatDate(activity.date)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-ink-faint">{ACTIVITY_LABEL[activity.type]}</p>
          {activity.description ? (
            <p className="mt-1 text-sm text-ink-dim">{activity.description}</p>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   Página                                   */
/* -------------------------------------------------------------------------- */

export function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { byId, update, remove } = useLeads()
  const { activities, removeWhere } = useLeadActivities()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [noteType, setNoteType] = useState<LeadActivityType>('contact')
  const [noteTitle, setNoteTitle] = useState('')
  const [noteDescription, setNoteDescription] = useState('')

  const lead = byId(id)

  if (!lead) {
    return (
      <div className="space-y-6">
        <PageHeader title="Lead" breadcrumbs={[{ label: 'Leads', to: '/leads' }]} />
        <EmptyState
          icon={Target}
          title="Lead não encontrado"
          description="Ele pode ter sido removido ou o endereço está incorreto."
          actionLabel="Voltar para o funil"
          onAction={() => navigate('/leads')}
        />
      </div>
    )
  }

  const leadActivities = sortBy(
    activities.filter((activity) => activity.leadId === lead.id),
    (activity) => activity.createdAt,
    'desc',
  )

  const daysInFunnel = Math.abs(daysUntil(lead.createdAt) ?? 0)
  const weighted = ((lead.potentialValue ?? 0) * (lead.closeProbability ?? 0)) / 100
  const followUp = lead.nextFollowUpDate ? deadlineLabel(lead.nextFollowUpDate) : null
  const isLost = lead.stage === LeadStage.LOST
  const converted = Boolean(lead.convertedToClientId)

  function changeStage(next: LeadStage) {
    if (!lead || next === lead.stage) return
    update(lead.id, {
      stage: next,
      closeProbability: nextProbability(lead.closeProbability, lead.stage, next),
    })
    logStatusChange('lead', lead.id, lead.name, lead.stage, next)
    leadActivitiesStore.create({
      leadId: lead.id,
      type: 'stage_change',
      title: `Movido para ${LEAD_STAGE_LABEL[next].toLowerCase()}`,
      description: `Etapa anterior: ${LEAD_STAGE_LABEL[lead.stage].toLowerCase()}.`,
      date: today(),
    })
  }

  function addActivity(event: React.FormEvent) {
    event.preventDefault()
    if (!lead || !noteTitle.trim()) return

    leadActivitiesStore.create({
      leadId: lead.id,
      type: noteType,
      title: noteTitle.trim(),
      description: noteDescription.trim() || null,
      date: today(),
    })

    // Registrar uma interação também move a régua do último contato — é o campo
    // que alimenta os alertas de follow-up.
    if (noteType !== 'note') update(lead.id, { lastContactDate: today() })
    logUpdated('lead', lead.id, lead.name, `Atividade registrada: ${noteTitle.trim()}`)

    setNoteTitle('')
    setNoteDescription('')
  }

  function handleConvert() {
    if (!lead) return
    const client = convertLeadToClient(lead)
    navigate(`/clients/${client.id}`)
  }

  function handleDelete() {
    if (!lead) return
    removeWhere((activity) => activity.leadId === lead.id)
    remove(lead.id)
    logDeleted('lead', lead.id, lead.name)
    navigate('/leads')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={lead.name}
        description={[lead.company, lead.niche].filter(Boolean).join(' · ') || undefined}
        breadcrumbs={[{ label: 'Leads', to: '/leads' }, { label: lead.name }]}
        actions={
          <>
            {converted ? (
              <Button asChild variant="secondary">
                <Link to={`/clients/${lead.convertedToClientId}`}>
                  Ver cliente
                  <ArrowRight />
                </Link>
              </Button>
            ) : isLost ? null : (
              <Button variant="primary" onClick={() => setConvertOpen(true)}>
                <UserPlus />
                Converter em cliente
              </Button>
            )}
            <Button onClick={() => setEditOpen(true)}>
              <Pencil />
              Editar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Mais ações">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="danger" onSelect={() => setDeleteOpen(true)}>
                  <Trash2 />
                  Excluir lead
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Valor potencial"
          value={lead.potentialValue}
          format="currency"
          hint={
            lead.estimatedBudget !== null
              ? `Orçamento estimado: ${formatCurrency(lead.estimatedBudget)}`
              : undefined
          }
        />
        <MetricCard
          label="Probabilidade"
          value={lead.closeProbability}
          format="percentage"
          hint={LEAD_STAGE_LABEL[lead.stage]}
        />
        <MetricCard
          label="Valor ponderado"
          value={weighted}
          format="currency"
          hint="Valor × probabilidade"
        />
        <MetricCard
          label="Dias no funil"
          value={daysInFunnel}
          hint={`Cadastrado em ${formatDate(lead.createdAt)}`}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Oportunidade</CardTitle>
              <StatusBadge type="lead" status={lead.stage} dot />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Etapa">
                  <Select
                    value={lead.stage}
                    onValueChange={(value) => changeStage(value as LeadStage)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {toOptions(LEAD_STAGE_LABEL).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-ink-dim">Origem</span>
                  <p className="flex h-8 items-center text-sm text-ink">
                    {LEAD_SOURCE_LABEL[lead.source]}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-ink-dim">Serviço desejado</p>
                <p className="text-sm text-ink">{lead.desiredService ?? '—'}</p>
              </div>

              {lead.notes ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-ink-dim">Observações</p>
                  <p className="text-sm whitespace-pre-line text-ink-dim">{lead.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contato</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ContactList contact={lead} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Follow-up</CardTitle>
              <CalendarClock className="size-4 shrink-0 text-ink-faint" />
            </CardHeader>
            <CardContent className="space-y-3">
              {followUp ? (
                <>
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        followUp.overdue ? 'text-danger' : 'text-ink',
                      )}
                    >
                      {followUp.text}
                    </span>
                    <span className="tabular text-xs text-ink-faint">
                      {formatDate(lead.nextFollowUpDate)}
                    </span>
                  </div>
                  <p className="text-sm text-ink-dim">{lead.nextFollowUpAction ?? 'Sem ação definida.'}</p>
                </>
              ) : (
                <p className="text-sm text-ink-faint">Nenhum follow-up agendado.</p>
              )}

              <div className="space-y-1 border-t border-line pt-3 text-xs text-ink-faint">
                <p>Primeiro contato: {formatDate(lead.firstContactDate)}</p>
                <p>Último contato: {formatDate(lead.lastContactDate)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
              <span className="tabular text-xs text-ink-faint">{leadActivities.length}</span>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={addActivity} className="space-y-2 rounded-lg border border-line p-3">
                <div className="flex gap-2">
                  <Select
                    value={noteType}
                    onValueChange={(value) => setNoteType(value as LeadActivityType)}
                  >
                    <SelectTrigger className="w-32 shrink-0" aria-label="Tipo de atividade">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ACTIVITY_LABEL) as LeadActivityType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {ACTIVITY_LABEL[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={noteTitle}
                    onChange={(event) => setNoteTitle(event.target.value)}
                    placeholder="O que aconteceu?"
                    aria-label="Título da atividade"
                  />
                </div>
                <Textarea
                  value={noteDescription}
                  onChange={(event) => setNoteDescription(event.target.value)}
                  placeholder="Detalhes (opcional)"
                  className="min-h-16"
                />
                <Button type="submit" variant="primary" size="sm" disabled={!noteTitle.trim()}>
                  Registrar
                </Button>
              </form>

              <Timeline activities={leadActivities} />
            </CardContent>
          </Card>
        </div>
      </div>

      <LeadForm open={editOpen} onOpenChange={setEditOpen} lead={lead} />

      <ConfirmDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        variant="warning"
        title="Converter em cliente?"
        description="O lead continua no funil, marcado como convertido."
        confirmLabel="Converter"
        message={
          <>
            Um cliente será criado com os dados de <strong className="text-ink">{lead.name}</strong>,
            e o lead passa para a etapa “fechado”. Dá para abrir o primeiro projeto logo em seguida.
          </>
        }
        onConfirm={handleConvert}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir lead?"
        confirmLabel="Excluir"
        message={
          <>
            <strong className="text-ink">{lead.name}</strong> e suas {leadActivities.length}{' '}
            atividades serão removidos do funil.
          </>
        }
        onConfirm={handleDelete}
      />
    </div>
  )
}
