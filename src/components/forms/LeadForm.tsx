import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { logCreated, logStatusChange, logUpdated } from '@/lib/activity'
import {
  LEAD_SOURCE_LABEL,
  LEAD_STAGE_LABEL,
  LEAD_STAGE_PROBABILITY,
  nextProbability,
  toOptions,
} from '@/lib/constants'
import { leadActivitiesStore, leadsStore } from '@/lib/store'
import { today } from '@/lib/utils'
import { LeadSource, LeadStage, type Lead } from '@/types'

/** Todos os campos como texto — a conversão para número/null acontece no envio. */
interface LeadFormValues {
  name: string
  company: string
  niche: string
  source: LeadSource
  desiredService: string
  estimatedBudget: string
  potentialValue: string
  stage: LeadStage
  closeProbability: string
  email: string
  phone: string
  whatsapp: string
  instagram: string
  youtube: string
  website: string
  firstContactDate: string
  lastContactDate: string
  nextFollowUpDate: string
  nextFollowUpAction: string
  notes: string
}

function emptyValues(stage: LeadStage): LeadFormValues {
  return {
    name: '',
    company: '',
    niche: '',
    source: LeadSource.INSTAGRAM,
    desiredService: '',
    estimatedBudget: '',
    potentialValue: '',
    stage,
    closeProbability: String(LEAD_STAGE_PROBABILITY[stage]),
    email: '',
    phone: '',
    whatsapp: '',
    instagram: '',
    youtube: '',
    website: '',
    firstContactDate: '',
    lastContactDate: '',
    nextFollowUpDate: '',
    nextFollowUpAction: '',
    notes: '',
  }
}

function fromLead(lead: Lead): LeadFormValues {
  return {
    name: lead.name,
    company: lead.company ?? '',
    niche: lead.niche ?? '',
    source: lead.source,
    desiredService: lead.desiredService ?? '',
    estimatedBudget: lead.estimatedBudget?.toString() ?? '',
    potentialValue: lead.potentialValue?.toString() ?? '',
    stage: lead.stage,
    closeProbability: lead.closeProbability?.toString() ?? '',
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    whatsapp: lead.whatsapp ?? '',
    instagram: lead.instagram ?? '',
    youtube: lead.youtube ?? '',
    website: lead.website ?? '',
    firstContactDate: lead.firstContactDate ?? '',
    lastContactDate: lead.lastContactDate ?? '',
    nextFollowUpDate: lead.nextFollowUpDate ?? '',
    nextFollowUpAction: lead.nextFollowUpAction ?? '',
    notes: lead.notes ?? '',
  }
}

/** Campo vazio vira null — o modelo não guarda string em branco. */
const text = (value: string): string | null => value.trim() || null
const num = (value: string): number | null => (value.trim() === '' ? null : Number(value))

export function LeadForm({
  open,
  onOpenChange,
  lead,
  defaultStage = LeadStage.NEW,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Presente, o formulário edita; ausente, cria. */
  lead?: Lead
  /** Etapa inicial ao criar — a coluna de onde o botão foi acionado. */
  defaultStage?: LeadStage
  onSaved?: (lead: Lead) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {/*
          O corpo só existe enquanto o diálogo está aberto: o Radix desmonta o
          conteúdo ao fechar, então cada abertura remonta com o estado inicial
          correto. É o que dispensa um efeito de reset.
        */}
        <LeadFormBody
          lead={lead}
          defaultStage={defaultStage}
          onSaved={onSaved}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function LeadFormBody({
  lead,
  defaultStage,
  onSaved,
  onClose,
}: {
  lead?: Lead
  defaultStage: LeadStage
  onSaved?: (lead: Lead) => void
  onClose: () => void
}) {
  const [values, setValues] = useState<LeadFormValues>(() =>
    lead ? fromLead(lead) : emptyValues(defaultStage),
  )
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof LeadFormValues>(key: K, value: LeadFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!values.name.trim()) {
      setError('Informe o nome do lead.')
      return
    }

    const probability = num(values.closeProbability)
    if (probability !== null && (probability < 0 || probability > 100)) {
      setError('A probabilidade deve ficar entre 0 e 100.')
      return
    }

    const payload = {
      name: values.name.trim(),
      company: text(values.company),
      niche: text(values.niche),
      source: values.source,
      desiredService: text(values.desiredService),
      estimatedBudget: num(values.estimatedBudget),
      potentialValue: num(values.potentialValue),
      stage: values.stage,
      closeProbability: probability,
      email: text(values.email),
      phone: text(values.phone),
      whatsapp: text(values.whatsapp),
      instagram: text(values.instagram),
      youtube: text(values.youtube),
      website: text(values.website),
      firstContactDate: text(values.firstContactDate),
      lastContactDate: text(values.lastContactDate),
      nextFollowUpDate: text(values.nextFollowUpDate),
      nextFollowUpAction: text(values.nextFollowUpAction),
      notes: text(values.notes),
    }

    if (lead) {
      const updated = leadsStore.update(lead.id, payload)
      if (updated) {
        logUpdated('lead', lead.id, updated.name, 'Dados do lead atualizados.')
        if (lead.stage !== payload.stage) {
          logStatusChange('lead', lead.id, updated.name, lead.stage, payload.stage)
        }
        onSaved?.(updated)
      }
    } else {
      const created = leadsStore.create({
        ...payload,
        convertedToClientId: null,
        convertedAt: null,
      })
      logCreated('lead', created.id, created.name, `Entrou no funil em ${LEAD_STAGE_LABEL[created.stage].toLowerCase()}.`)
      leadActivitiesStore.create({
        leadId: created.id,
        type: 'note',
        title: 'Lead cadastrado',
        description: created.desiredService,
        date: today(),
      })
      onSaved?.(created)
    }

    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
      <DialogHeader>
        <DialogTitle>{lead ? 'Editar lead' : 'Novo lead'}</DialogTitle>
        <DialogDescription>
          {lead
            ? 'Altere os dados e o andamento da oportunidade.'
            : 'Cadastre uma nova oportunidade no funil comercial.'}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome" className="sm:col-span-2">
            <Input
              value={values.name}
              onChange={(event) => set('name', event.target.value)}
              placeholder="Nome do contato"
              autoFocus
            />
          </Field>
          <Field label="Empresa">
            <Input
              value={values.company}
              onChange={(event) => set('company', event.target.value)}
              placeholder="Opcional"
            />
          </Field>
          <Field label="Nicho">
            <Input
              value={values.niche}
              onChange={(event) => set('niche', event.target.value)}
              placeholder="Finanças, Fitness, Moda…"
            />
          </Field>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Field label="Etapa">
            <Select
              value={values.stage}
              onValueChange={(value) => {
                const stage = value as LeadStage
                setValues((current) => ({
                  ...current,
                  stage,
                  closeProbability: String(
                    nextProbability(num(current.closeProbability), current.stage, stage) ?? '',
                  ),
                }))
              }}
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

          <Field label="Origem">
            <Select
              value={values.source}
              onValueChange={(value) => set('source', value as LeadSource)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toOptions(LEAD_SOURCE_LABEL).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Serviço desejado" className="sm:col-span-2">
            <Input
              value={values.desiredService}
              onChange={(event) => set('desiredService', event.target.value)}
              placeholder="Ex.: 4 vídeos longform por mês"
            />
          </Field>

          <Field label="Orçamento estimado (R$)">
            <Input
              type="number"
              min={0}
              step={100}
              value={values.estimatedBudget}
              onChange={(event) => set('estimatedBudget', event.target.value)}
            />
          </Field>
          <Field label="Valor potencial (R$)" hint="Usado no total do funil.">
            <Input
              type="number"
              min={0}
              step={100}
              value={values.potentialValue}
              onChange={(event) => set('potentialValue', event.target.value)}
            />
          </Field>
          <Field label="Probabilidade de fechamento (%)">
            <Input
              type="number"
              min={0}
              max={100}
              step={5}
              value={values.closeProbability}
              onChange={(event) => set('closeProbability', event.target.value)}
            />
          </Field>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Field label="E-mail">
            <Input
              type="email"
              value={values.email}
              onChange={(event) => set('email', event.target.value)}
            />
          </Field>
          <Field label="Telefone">
            <Input
              value={values.phone}
              onChange={(event) => set('phone', event.target.value)}
              placeholder="(11) 90000-0000"
            />
          </Field>
          <Field label="WhatsApp">
            <Input
              value={values.whatsapp}
              onChange={(event) => set('whatsapp', event.target.value)}
              placeholder="5511900000000"
            />
          </Field>
          <Field label="Instagram">
            <Input
              value={values.instagram}
              onChange={(event) => set('instagram', event.target.value)}
              placeholder="@perfil"
            />
          </Field>
          <Field label="YouTube">
            <Input
              value={values.youtube}
              onChange={(event) => set('youtube', event.target.value)}
            />
          </Field>
          <Field label="Site">
            <Input
              value={values.website}
              onChange={(event) => set('website', event.target.value)}
            />
          </Field>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Field label="Primeiro contato">
            <Input
              type="date"
              value={values.firstContactDate}
              onChange={(event) => set('firstContactDate', event.target.value)}
            />
          </Field>
          <Field label="Último contato">
            <Input
              type="date"
              value={values.lastContactDate}
              onChange={(event) => set('lastContactDate', event.target.value)}
            />
          </Field>
          <Field label="Próximo follow-up">
            <Input
              type="date"
              value={values.nextFollowUpDate}
              onChange={(event) => set('nextFollowUpDate', event.target.value)}
            />
          </Field>
          <Field label="Ação do follow-up">
            <Input
              value={values.nextFollowUpAction}
              onChange={(event) => set('nextFollowUpAction', event.target.value)}
              placeholder="Ex.: enviar proposta revisada"
            />
          </Field>
        </section>

        <Field label="Observações">
          <Textarea
            value={values.notes}
            onChange={(event) => set('notes', event.target.value)}
            placeholder="Contexto, objeções, histórico…"
          />
        </Field>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </DialogBody>

      <DialogFooter>
        <Button type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary">
          {lead ? 'Salvar alterações' : 'Criar lead'}
        </Button>
      </DialogFooter>
    </form>
  )
}
