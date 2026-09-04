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
import { logCreated, logUpdated } from '@/lib/activity'
import { EXPENSE_CATEGORY_LABEL, toOptions } from '@/lib/constants'
import { expensesStore } from '@/lib/store'
import { formatCurrency, today } from '@/lib/utils'
import { ExpenseCategory, type Expense } from '@/types'

interface ExpenseFormValues extends LinkValues {
  description: string
  amount: string
  category: ExpenseCategory
  date: string
  notes: string
}

function emptyValues(defaults: Partial<ExpenseFormValues>): ExpenseFormValues {
  return {
    description: '',
    amount: '',
    category: ExpenseCategory.SOFTWARE,
    date: today(),
    notes: '',
    clientId: '',
    projectId: '',
    videoId: '',
    ...defaults,
  }
}

function fromExpense(expense: Expense): ExpenseFormValues {
  return {
    description: expense.description,
    amount: String(expense.amount),
    category: expense.category,
    date: expense.date,
    notes: expense.notes ?? '',
    clientId: expense.clientId ?? '',
    projectId: expense.projectId ?? '',
    videoId: expense.videoId ?? '',
  }
}

const text = (value: string): string | null => value.trim() || null

export function ExpenseForm({
  open,
  onOpenChange,
  expense,
  defaults,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: Expense
  defaults?: Partial<LinkValues>
  onSaved?: (expense: Expense) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <ExpenseFormBody
          expense={expense}
          defaults={defaults ?? {}}
          onSaved={onSaved}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function ExpenseFormBody({
  expense,
  defaults,
  onSaved,
  onClose,
}: {
  expense?: Expense
  defaults: Partial<LinkValues>
  onSaved?: (expense: Expense) => void
  onClose: () => void
}) {
  const [values, setValues] = useState<ExpenseFormValues>(() =>
    expense ? fromExpense(expense) : emptyValues(defaults),
  )
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!values.description.trim()) {
      setError('Informe a descrição do custo.')
      return
    }
    if (!values.date) {
      setError('Informe a data do custo.')
      return
    }
    const amount = Number(values.amount)
    if (!values.amount.trim() || Number.isNaN(amount) || amount <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }

    const payload = {
      description: values.description.trim(),
      amount,
      category: values.category,
      clientId: text(values.clientId),
      projectId: text(values.projectId),
      videoId: text(values.videoId),
      date: values.date,
      notes: text(values.notes),
    }

    if (expense) {
      const updated = expensesStore.update(expense.id, payload)
      if (updated) {
        logUpdated('expense', expense.id, updated.description, 'Custo atualizado.')
        onSaved?.(updated)
      }
    } else {
      const created = expensesStore.create(payload)
      logCreated('expense', created.id, created.description, formatCurrency(created.amount))
      onSaved?.(created)
    }

    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
      <DialogHeader>
        <DialogTitle>{expense ? 'Editar custo' : 'Novo custo'}</DialogTitle>
        <DialogDescription>
          {expense
            ? 'Altere valor, categoria e vínculos do custo.'
            : 'Lance um custo. Sem cliente vinculado, ele conta como despesa geral.'}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-6">
        <Field label="Descrição">
          <Input
            value={values.description}
            onChange={(event) => set('description', event.target.value)}
            placeholder="Ex.: Freelancer — motion graphics"
            autoFocus
          />
        </Field>

        <section className="grid gap-3 sm:grid-cols-3">
          <Field label="Valor (R$)">
            <Input
              type="number"
              min={0}
              step="any"
              value={values.amount}
              onChange={(event) => set('amount', event.target.value)}
            />
          </Field>
          <Field label="Categoria">
            <Select
              value={values.category}
              onValueChange={(value) => set('category', value as ExpenseCategory)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toOptions(EXPENSE_CATEGORY_LABEL).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Data">
            <Input
              type="date"
              value={values.date}
              onChange={(event) => set('date', event.target.value)}
            />
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
          {expense ? 'Salvar alterações' : 'Lançar custo'}
        </Button>
      </DialogFooter>
    </form>
  )
}
