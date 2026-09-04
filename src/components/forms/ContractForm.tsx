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
import { useClients } from '@/hooks/useClients'
import { logCreated, logStatusChange, logUpdated } from '@/lib/activity'
import {
  CONTRACT_FREQUENCY_LABEL,
  CONTRACT_FREQUENCY_PER_MONTH,
  CONTRACT_STATUS_LABEL,
  toOptions,
} from '@/lib/constants'
import { contractsStore } from '@/lib/store'
import { formatCurrency, today } from '@/lib/utils'
import { ContractFrequency, ContractStatus, type Contract } from '@/types'

interface ContractFormValues {
  clientId: string
  value: string
  frequency: ContractFrequency
  startDate: string
  renewalDate: string
  videoQuantity: string
  status: ContractStatus
  notes: string
}

function emptyValues(clientId: string): ContractFormValues {
  return {
    clientId,
    value: '',
    frequency: ContractFrequency.MONTHLY,
    startDate: today(),
    renewalDate: '',
    videoQuantity: '',
    status: ContractStatus.ACTIVE,
    notes: '',
  }
}

function fromContract(contract: Contract): ContractFormValues {
  return {
    clientId: contract.clientId,
    value: String(contract.value),
    frequency: contract.frequency,
    startDate: contract.startDate,
    renewalDate: contract.renewalDate ?? '',
    videoQuantity: contract.videoQuantity?.toString() ?? '',
    status: contract.status,
    notes: contract.notes ?? '',
  }
}

const text = (value: string): string | null => value.trim() || null

export function ContractForm({
  open,
  onOpenChange,
  contract,
  defaultClientId = '',
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract?: Contract
  defaultClientId?: string
  onSaved?: (contract: Contract) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <ContractFormBody
          contract={contract}
          defaultClientId={defaultClientId}
          onSaved={onSaved}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function ContractFormBody({
  contract,
  defaultClientId,
  onSaved,
  onClose,
}: {
  contract?: Contract
  defaultClientId: string
  onSaved?: (contract: Contract) => void
  onClose: () => void
}) {
  const { clients } = useClients()
  const [values, setValues] = useState<ContractFormValues>(() =>
    contract ? fromContract(contract) : emptyValues(defaultClientId),
  )
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof ContractFormValues>(key: K, value: ContractFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const monthly = Number(values.value || 0) * CONTRACT_FREQUENCY_PER_MONTH[values.frequency]

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!values.clientId) {
      setError('Selecione o cliente do contrato.')
      return
    }
    if (!values.startDate) {
      setError('Informe a data de início.')
      return
    }
    const value = Number(values.value)
    if (!values.value.trim() || Number.isNaN(value) || value <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }
    if (values.renewalDate && values.renewalDate < values.startDate) {
      setError('A renovação não pode ser anterior ao início.')
      return
    }

    const payload = {
      clientId: values.clientId,
      value,
      frequency: values.frequency,
      startDate: values.startDate,
      renewalDate: text(values.renewalDate),
      videoQuantity: values.videoQuantity.trim() === '' ? null : Number(values.videoQuantity),
      status: values.status,
      notes: text(values.notes),
    }

    const clientName = clients.find((client) => client.id === values.clientId)?.name ?? 'Cliente'
    const label = `Contrato ${CONTRACT_FREQUENCY_LABEL[payload.frequency].toLowerCase()} — ${clientName}`

    if (contract) {
      const updated = contractsStore.update(contract.id, payload)
      if (updated) {
        logUpdated('contract', contract.id, label, 'Contrato atualizado.')
        if (contract.status !== payload.status) {
          logStatusChange('contract', contract.id, label, contract.status, payload.status)
        }
        onSaved?.(updated)
      }
    } else {
      const created = contractsStore.create(payload)
      logCreated('contract', created.id, label, formatCurrency(created.value))
      onSaved?.(created)
    }

    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
      <DialogHeader>
        <DialogTitle>{contract ? 'Editar contrato' : 'Novo contrato'}</DialogTitle>
        <DialogDescription>
          Contratos recorrentes alimentam a receita mensal previsível do negócio.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-2">
          <Field label="Cliente" className="sm:col-span-2">
            <Select value={values.clientId} onValueChange={(value) => set('clientId', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Valor (R$)">
            <Input
              type="number"
              min={0}
              step="any"
              value={values.value}
              onChange={(event) => set('value', event.target.value)}
            />
          </Field>
          <Field
            label="Frequência"
            hint={
              CONTRACT_FREQUENCY_PER_MONTH[values.frequency] > 0
                ? `${formatCurrency(monthly)} por mês`
                : 'Avulso não entra na recorrência.'
            }
          >
            <Select
              value={values.frequency}
              onValueChange={(value) => set('frequency', value as ContractFrequency)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toOptions(CONTRACT_FREQUENCY_LABEL).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Início">
            <Input
              type="date"
              value={values.startDate}
              onChange={(event) => set('startDate', event.target.value)}
            />
          </Field>
          <Field label="Renovação">
            <Input
              type="date"
              value={values.renewalDate}
              onChange={(event) => set('renewalDate', event.target.value)}
            />
          </Field>
          <Field label="Qtd. de vídeos">
            <Input
              type="number"
              min={0}
              value={values.videoQuantity}
              onChange={(event) => set('videoQuantity', event.target.value)}
            />
          </Field>
          <Field label="Status">
            <Select
              value={values.status}
              onValueChange={(value) => set('status', value as ContractStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toOptions(CONTRACT_STATUS_LABEL).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </section>

        <Field label="Observações">
          <Textarea
            value={values.notes}
            onChange={(event) => set('notes', event.target.value)}
            className="min-h-16"
          />
        </Field>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </DialogBody>

      <DialogFooter>
        <Button type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary">
          {contract ? 'Salvar alterações' : 'Criar contrato'}
        </Button>
      </DialogFooter>
    </form>
  )
}
