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
import { CLIENT_STATUS_LABEL, LEAD_SOURCE_LABEL, toOptions } from '@/lib/constants'
import { clientsStore } from '@/lib/store'
import { today } from '@/lib/utils'
import { ClientStatus, LeadSource, type Client } from '@/types'

interface ClientFormValues {
  name: string
  company: string
  niche: string
  status: ClientStatus
  source: LeadSource
  entryDate: string
  email: string
  phone: string
  whatsapp: string
  instagram: string
  youtube: string
  website: string
  notes: string
}

function emptyValues(): ClientFormValues {
  return {
    name: '',
    company: '',
    niche: '',
    status: ClientStatus.ACTIVE,
    source: LeadSource.INSTAGRAM,
    entryDate: today(),
    email: '',
    phone: '',
    whatsapp: '',
    instagram: '',
    youtube: '',
    website: '',
    notes: '',
  }
}

function fromClient(client: Client): ClientFormValues {
  return {
    name: client.name,
    company: client.company ?? '',
    niche: client.niche ?? '',
    status: client.status,
    source: client.source,
    entryDate: client.entryDate,
    email: client.email ?? '',
    phone: client.phone ?? '',
    whatsapp: client.whatsapp ?? '',
    instagram: client.instagram ?? '',
    youtube: client.youtube ?? '',
    website: client.website ?? '',
    notes: client.notes ?? '',
  }
}

const text = (value: string): string | null => value.trim() || null

export function ClientForm({
  open,
  onOpenChange,
  client,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Presente, edita; ausente, cria. */
  client?: Client
  onSaved?: (client: Client) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {/*
          O corpo só existe enquanto o diálogo está aberto: o Radix desmonta o
          conteúdo ao fechar, então cada abertura remonta com o estado inicial
          correto. É o que dispensa um efeito de reset.
        */}
        <ClientFormBody
          client={client}
          onSaved={onSaved}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function ClientFormBody({
  client,
  onSaved,
  onClose,
}: {
  client?: Client
  onSaved?: (client: Client) => void
  onClose: () => void
}) {
  const [values, setValues] = useState<ClientFormValues>(() =>
    client ? fromClient(client) : emptyValues(),
  )
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof ClientFormValues>(key: K, value: ClientFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!values.name.trim()) {
      setError('Informe o nome do cliente.')
      return
    }
    if (!values.entryDate) {
      setError('Informe a data de entrada.')
      return
    }

    const payload = {
      name: values.name.trim(),
      company: text(values.company),
      niche: text(values.niche),
      status: values.status,
      source: values.source,
      entryDate: values.entryDate,
      email: text(values.email),
      phone: text(values.phone),
      whatsapp: text(values.whatsapp),
      instagram: text(values.instagram),
      youtube: text(values.youtube),
      website: text(values.website),
      notes: text(values.notes),
    }

    if (client) {
      const updated = clientsStore.update(client.id, payload)
      if (updated) {
        logUpdated('client', client.id, updated.name, 'Cadastro do cliente atualizado.')
        if (client.status !== payload.status) {
          logStatusChange('client', client.id, updated.name, client.status, payload.status)
        }
        onSaved?.(updated)
      }
    } else {
      // `leadId` fica nulo: cliente criado direto não veio de conversão.
      const created = clientsStore.create({ ...payload, leadId: null })
      logCreated('client', created.id, created.name, 'Cliente cadastrado manualmente.')
      onSaved?.(created)
    }

    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
      <DialogHeader>
        <DialogTitle>{client ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
        <DialogDescription>
          {client
            ? 'Altere os dados cadastrais e o status da conta.'
            : 'Cadastre um cliente sem passar pelo funil comercial.'}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome" className="sm:col-span-2">
            <Input
              value={values.name}
              onChange={(event) => set('name', event.target.value)}
              placeholder="Nome do contato principal"
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
              placeholder="Finanças, Beleza, Tecnologia…"
            />
          </Field>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <Field label="Status">
            <Select
              value={values.status}
              onValueChange={(value) => set('status', value as ClientStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toOptions(CLIENT_STATUS_LABEL).map((option) => (
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
          <Field label="Entrada">
            <Input
              type="date"
              value={values.entryDate}
              onChange={(event) => set('entryDate', event.target.value)}
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

        <Field label="Observações">
          <Textarea
            value={values.notes}
            onChange={(event) => set('notes', event.target.value)}
            placeholder="Preferências de entrega, prazos de aprovação, combinados…"
          />
        </Field>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </DialogBody>

      <DialogFooter>
        <Button type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary">
          {client ? 'Salvar alterações' : 'Criar cliente'}
        </Button>
      </DialogFooter>
    </form>
  )
}
