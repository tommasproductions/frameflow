import { useState } from 'react'

import { LinkFields, type LinkValues } from '@/components/forms/LinkFields'
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
import { logActivity, logCreated, logUpdated } from '@/lib/activity'
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, toOptions } from '@/lib/constants'
import { paymentsStore } from '@/lib/store'
import { formatCurrency, today } from '@/lib/utils'
import { ActivityAction, PaymentMethod, PaymentStatus, type Payment } from '@/types'

interface PaymentFormValues extends LinkValues {
  description: string
  amount: string
  dueDate: string
  paymentDate: string
  status: PaymentStatus
  method: string
  notes: string
}

function emptyValues(defaults: Partial<PaymentFormValues>): PaymentFormValues {
  return {
    description: '',
    amount: '',
    dueDate: today(),
    paymentDate: '',
    status: PaymentStatus.PENDING,
    method: '',
    notes: '',
    clientId: '',
    projectId: '',
    videoId: '',
    ...defaults,
  }
}

function fromPayment(payment: Payment): PaymentFormValues {
  return {
    description: payment.description,
    amount: String(payment.amount),
    dueDate: payment.dueDate,
    paymentDate: payment.paymentDate ?? '',
    status: payment.status,
    method: payment.method ?? '',
    notes: payment.notes ?? '',
    clientId: payment.clientId ?? '',
    projectId: payment.projectId ?? '',
    videoId: payment.videoId ?? '',
  }
}

const text = (value: string): string | null => value.trim() || null

export function PaymentForm({
  open,
  onOpenChange,
  payment,
  defaults,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment?: Payment
  defaults?: Partial<LinkValues>
  onSaved?: (payment: Payment) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <PaymentFormBody
          payment={payment}
          defaults={defaults ?? {}}
          onSaved={onSaved}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function PaymentFormBody({
  payment,
  defaults,
  onSaved,
  onClose,
}: {
  payment?: Payment
  defaults: Partial<LinkValues>
  onSaved?: (payment: Payment) => void
  onClose: () => void
}) {
  const [values, setValues] = useState<PaymentFormValues>(() =>
    payment ? fromPayment(payment) : emptyValues(defaults),
  )
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof PaymentFormValues>(key: K, value: PaymentFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  /**
   * Status e data de pagamento andam juntos: marcar como pago sem data, ou
   * lançar uma data e deixar como pendente, são estados incoerentes que depois
   * bagunçam a receita do mês.
   */
  function setStatus(status: PaymentStatus) {
    setValues((current) => ({
      ...current,
      status,
      paymentDate:
        status === PaymentStatus.PAID
          ? current.paymentDate || today()
          : status === PaymentStatus.PENDING || status === PaymentStatus.OVERDUE
            ? ''
            : current.paymentDate,
    }))
  }

  function setPaymentDate(date: string) {
    setValues((current) => ({
      ...current,
      paymentDate: date,
      status: date ? PaymentStatus.PAID : PaymentStatus.PENDING,
    }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!values.description.trim()) {
      setError('Informe a descrição do recebimento.')
      return
    }
    if (!values.dueDate) {
      setError('Informe a data de vencimento.')
      return
    }
    const amount = Number(values.amount)
    if (!values.amount.trim() || Number.isNaN(amount) || amount <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }
    if (values.status === PaymentStatus.PAID && !values.paymentDate) {
      setError('Um recebimento pago precisa da data em que entrou.')
      return
    }

    const payload = {
      description: values.description.trim(),
      amount,
      clientId: text(values.clientId),
      projectId: text(values.projectId),
      videoId: text(values.videoId),
      dueDate: values.dueDate,
      paymentDate: text(values.paymentDate),
      status: values.status,
      method: (text(values.method) as PaymentMethod | null) ?? null,
      notes: text(values.notes),
    }

    if (payment) {
      const updated = paymentsStore.update(payment.id, payload)
      if (updated) {
        // Virar "pago" é o evento que interessa no histórico, não uma edição
        // qualquer de cadastro.
        if (payment.status !== PaymentStatus.PAID && payload.status === PaymentStatus.PAID) {
          logActivity({
            action: ActivityAction.PAYMENT_REGISTERED,
            entityType: 'payment',
            entityId: payment.id,
            entityName: updated.description,
            details: `${formatCurrency(updated.amount)} recebidos.`,
            previousValue: payment.status,
            newValue: payload.status,
          })
        } else {
          logUpdated('payment', payment.id, updated.description, 'Recebimento atualizado.')
        }
        onSaved?.(updated)
      }
    } else {
      const created = paymentsStore.create(payload)
      logCreated('payment', created.id, created.description, formatCurrency(created.amount))
      onSaved?.(created)
    }

    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
      <DialogHeader>
        <DialogTitle>{payment ? 'Editar recebimento' : 'Novo recebimento'}</DialogTitle>
        <DialogDescription>
          {payment
            ? 'Altere valor, prazo e situação da cobrança.'
            : 'Lance uma cobrança a receber ou um valor já recebido.'}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-6">
        <Field label="Descrição">
          <Input
            value={values.description}
            onChange={(event) => set('description', event.target.value)}
            placeholder="Ex.: Reels Setembro — parcela 1"
            autoFocus
          />
        </Field>

        <section className="grid gap-3 sm:grid-cols-2">
          <Field label="Valor (R$)">
            <Input
              type="number"
              min={0}
              step="any"
              value={values.amount}
              onChange={(event) => set('amount', event.target.value)}
            />
          </Field>
          <Field label="Status">
            <Select value={values.status} onValueChange={(value) => setStatus(value as PaymentStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toOptions(PAYMENT_STATUS_LABEL).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Vencimento">
            <Input
              type="date"
              value={values.dueDate}
              onChange={(event) => set('dueDate', event.target.value)}
            />
          </Field>
          <Field
            label="Data do pagamento"
            hint={values.paymentDate ? undefined : 'Preencher marca como pago.'}
          >
            <Input
              type="date"
              value={values.paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
            />
          </Field>
          <Field label="Forma de pagamento" className="sm:col-span-2">
            <Select value={values.method || '__none'} onValueChange={(value) => set('method', value === '__none' ? '' : value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Não informada</SelectItem>
                {toOptions(PAYMENT_METHOD_LABEL).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <LinkFields
            values={values}
            onChange={(links) => setValues((current) => ({ ...current, ...links }))}
          />
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
          {payment ? 'Salvar alterações' : 'Lançar recebimento'}
        </Button>
      </DialogFooter>
    </form>
  )
}
