import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  MoreVertical,
  Pencil,
  Plus,
  Receipt,
  Repeat,
  Trash2,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { usePeriod } from '@/app/period'
import { ProfitChart } from '@/components/charts/ProfitChart'
import { RevenueChart } from '@/components/charts/RevenueChart'
import { ContractForm } from '@/components/forms/ContractForm'
import { ExpenseForm } from '@/components/forms/ExpenseForm'
import { PaymentForm } from '@/components/forms/PaymentForm'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { FilterBar, type FilterConfig, type FilterValues } from '@/components/shared/FilterBar'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClients } from '@/hooks/useClients'
import { useContracts } from '@/hooks/useContracts'
import { useExpenses } from '@/hooks/useExpenses'
import { usePayments } from '@/hooks/usePayments'
import { useProjects } from '@/hooks/useProjects'
import { logDeleted } from '@/lib/activity'
import {
  cashSummary,
  monthlyRecurringRevenue,
  monthlySeries,
  overduePayments,
  receivableRevenue,
} from '@/lib/calculations'
import {
  CONTRACT_FREQUENCY_LABEL,
  DASHBOARD_MONTHS,
  EXPENSE_CATEGORY_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  toOptions,
} from '@/lib/constants'
import {
  cn,
  deadlineLabel,
  formatCurrency,
  formatDate,
  formatPercent,
  isWithinRange,
  matchesQuery,
  sortBy,
  sumBy,
} from '@/lib/utils'
import {
  ContractStatus,
  PaymentStatus,
  type Contract,
  type Expense,
  type Payment,
} from '@/types'

/** O que está aberto para exclusão — só um por vez. */
type Pending =
  | { kind: 'payment'; item: Payment }
  | { kind: 'expense'; item: Expense }
  | { kind: 'contract'; item: Contract }
  | null

export function FinancialPage() {
  const { range, previousRange, label, recentMonths } = usePeriod()
  const { payments, remove: removePayment } = usePayments()
  const { expenses, remove: removeExpense } = useExpenses()
  const { contracts, remove: removeContract } = useContracts()
  const { clients, byId: clientById } = useClients()
  const { byId: projectById } = useProjects()

  const [paymentForm, setPaymentForm] = useState<{ open: boolean; item?: Payment }>({ open: false })
  const [expenseForm, setExpenseForm] = useState<{ open: boolean; item?: Expense }>({ open: false })
  const [contractForm, setContractForm] = useState<{ open: boolean; item?: Contract }>({
    open: false,
  })
  const [pending, setPending] = useState<Pending>(null)
  const [revenueFilters, setRevenueFilters] = useState<FilterValues>({})
  const [expenseFilters, setExpenseFilters] = useState<FilterValues>({})

  const cash = cashSummary(payments, expenses, range)
  const previousCash = cashSummary(payments, expenses, previousRange)
  const receivable = receivableRevenue(payments)
  const late = overduePayments(payments)
  const overdueAmount = sumBy(late, (payment) => payment.amount)
  const mrr = monthlyRecurringRevenue(contracts)
  const series = useMemo(
    () => monthlySeries(payments, expenses, recentMonths(DASHBOARD_MONTHS)),
    [payments, expenses, recentMonths],
  )

  const clientOptions = clients.map((client) => ({ value: client.id, label: client.name }))

  /* ------------------------------ Receitas ------------------------------ */

  const revenueFilterConfig: FilterConfig[] = [
    { key: 'search', label: 'Buscar', type: 'search', placeholder: 'Descrição ou cliente' },
    { key: 'status', label: 'Status', type: 'select', options: toOptions(PAYMENT_STATUS_LABEL) },
    { key: 'clientId', label: 'Cliente', type: 'select', options: clientOptions },
    { key: 'due', label: 'Vencimento', type: 'date-range' },
  ]

  const filteredPayments = useMemo(
    () =>
      sortBy(
        payments.filter((payment) => {
          const query = revenueFilters.search ?? ''
          if (
            query &&
            !matchesQuery(payment.description, query) &&
            !matchesQuery(clientById(payment.clientId)?.name, query)
          ) {
            return false
          }
          if (revenueFilters.status && payment.status !== revenueFilters.status) return false
          if (revenueFilters.clientId && payment.clientId !== revenueFilters.clientId) return false
          if (revenueFilters.dueFrom || revenueFilters.dueTo) {
            const from = revenueFilters.dueFrom || '0000-01-01'
            const to = revenueFilters.dueTo || '9999-12-31'
            if (!isWithinRange(payment.dueDate, from, to)) return false
          }
          return true
        }),
        (payment) => payment.dueDate,
        'desc',
      ),
    [payments, clientById, revenueFilters],
  )

  const paymentColumns: Column<Payment>[] = [
    {
      key: 'description',
      header: 'Recebimento',
      sortValue: (payment) => payment.description,
      render: (payment) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{payment.description}</p>
          <p className="truncate text-xs text-ink-faint">
            {payment.clientId ? (
              <Link to={`/clients/${payment.clientId}`} className="hover:text-accent">
                {clientById(payment.clientId)?.name ?? '—'}
              </Link>
            ) : (
              'Sem cliente'
            )}
            {payment.projectId ? ` · ${projectById(payment.projectId)?.name ?? '—'}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (payment) => payment.status,
      render: (payment) => <StatusBadge type="payment" status={payment.status} />,
    },
    {
      key: 'method',
      header: 'Forma',
      hideOnMobile: true,
      sortValue: (payment) => (payment.method ? PAYMENT_METHOD_LABEL[payment.method] : ''),
      render: (payment) => (payment.method ? PAYMENT_METHOD_LABEL[payment.method] : '—'),
    },
    {
      key: 'dueDate',
      header: 'Vencimento',
      align: 'right',
      sortValue: (payment) => payment.dueDate,
      render: (payment) => {
        const settled =
          payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.CANCELLED
        const due = deadlineLabel(payment.dueDate, settled)
        return (
          <span className={cn('tabular', due.overdue ? 'font-medium text-danger' : '')}>
            {formatDate(payment.dueDate)}
          </span>
        )
      },
    },
    {
      key: 'paymentDate',
      header: 'Recebido em',
      align: 'right',
      hideOnMobile: true,
      sortValue: (payment) => payment.paymentDate ?? '',
      render: (payment) => <span className="tabular">{formatDate(payment.paymentDate)}</span>,
    },
    {
      key: 'amount',
      header: 'Valor',
      align: 'right',
      sortValue: (payment) => payment.amount,
      render: (payment) => (
        <span className="tabular font-medium text-ink">{formatCurrency(payment.amount)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-10',
      render: (payment) => (
        <RowMenu
          onEdit={() => setPaymentForm({ open: true, item: payment })}
          onDelete={() => setPending({ kind: 'payment', item: payment })}
        />
      ),
    },
  ]

  /* -------------------------------- Custos ------------------------------- */

  const expenseFilterConfig: FilterConfig[] = [
    { key: 'search', label: 'Buscar', type: 'search', placeholder: 'Descrição ou cliente' },
    {
      key: 'category',
      label: 'Categoria',
      type: 'select',
      options: toOptions(EXPENSE_CATEGORY_LABEL),
    },
    { key: 'clientId', label: 'Cliente', type: 'select', options: clientOptions },
    { key: 'date', label: 'Data', type: 'date-range' },
  ]

  const filteredExpenses = useMemo(
    () =>
      sortBy(
        expenses.filter((expense) => {
          const query = expenseFilters.search ?? ''
          if (
            query &&
            !matchesQuery(expense.description, query) &&
            !matchesQuery(clientById(expense.clientId)?.name, query)
          ) {
            return false
          }
          if (expenseFilters.category && expense.category !== expenseFilters.category) return false
          if (expenseFilters.clientId && expense.clientId !== expenseFilters.clientId) return false
          if (expenseFilters.dateFrom || expenseFilters.dateTo) {
            const from = expenseFilters.dateFrom || '0000-01-01'
            const to = expenseFilters.dateTo || '9999-12-31'
            if (!isWithinRange(expense.date, from, to)) return false
          }
          return true
        }),
        (expense) => expense.date,
        'desc',
      ),
    [expenses, clientById, expenseFilters],
  )

  const expenseColumns: Column<Expense>[] = [
    {
      key: 'description',
      header: 'Custo',
      sortValue: (expense) => expense.description,
      render: (expense) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{expense.description}</p>
          <p className="truncate text-xs text-ink-faint">
            {expense.clientId
              ? (clientById(expense.clientId)?.name ?? '—')
              : 'Despesa geral'}
            {expense.projectId ? ` · ${projectById(expense.projectId)?.name ?? '—'}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoria',
      sortValue: (expense) => EXPENSE_CATEGORY_LABEL[expense.category],
      render: (expense) => <Badge tone="neutral">{EXPENSE_CATEGORY_LABEL[expense.category]}</Badge>,
    },
    {
      key: 'date',
      header: 'Data',
      align: 'right',
      sortValue: (expense) => expense.date,
      render: (expense) => <span className="tabular">{formatDate(expense.date)}</span>,
    },
    {
      key: 'amount',
      header: 'Valor',
      align: 'right',
      sortValue: (expense) => expense.amount,
      render: (expense) => (
        <span className="tabular font-medium text-danger">-{formatCurrency(expense.amount)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-10',
      render: (expense) => (
        <RowMenu
          onEdit={() => setExpenseForm({ open: true, item: expense })}
          onDelete={() => setPending({ kind: 'expense', item: expense })}
        />
      ),
    },
  ]

  /* ------------------------------ Contratos ------------------------------ */

  const contractColumns: Column<Contract>[] = [
    {
      key: 'client',
      header: 'Cliente',
      sortValue: (contract) => clientById(contract.clientId)?.name ?? '',
      render: (contract) => (
        <Link
          to={`/clients/${contract.clientId}`}
          className="font-medium text-ink hover:text-accent"
        >
          {clientById(contract.clientId)?.name ?? 'Cliente removido'}
        </Link>
      ),
    },
    {
      key: 'frequency',
      header: 'Frequência',
      sortValue: (contract) => CONTRACT_FREQUENCY_LABEL[contract.frequency],
      render: (contract) => CONTRACT_FREQUENCY_LABEL[contract.frequency],
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (contract) => contract.status,
      render: (contract) => <StatusBadge type="contract" status={contract.status} />,
    },
    {
      key: 'videos',
      header: 'Vídeos',
      align: 'right',
      hideOnMobile: true,
      sortValue: (contract) => contract.videoQuantity ?? 0,
      render: (contract) => <span className="tabular">{contract.videoQuantity ?? '—'}</span>,
    },
    {
      key: 'renewal',
      header: 'Renovação',
      align: 'right',
      sortValue: (contract) => contract.renewalDate ?? '9999-12-31',
      render: (contract) => {
        if (!contract.renewalDate) return <span className="text-ink-faint">—</span>
        const due = deadlineLabel(contract.renewalDate, contract.status !== ContractStatus.ACTIVE)
        return (
          <span className={cn('tabular', due.overdue ? 'font-medium text-warning' : '')}>
            {due.text}
          </span>
        )
      },
    },
    {
      key: 'value',
      header: 'Valor',
      align: 'right',
      sortValue: (contract) => contract.value,
      render: (contract) => (
        <span className="tabular font-medium text-ink">{formatCurrency(contract.value)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-10',
      render: (contract) => (
        <RowMenu
          onEdit={() => setContractForm({ open: true, item: contract })}
          onDelete={() => setPending({ kind: 'contract', item: contract })}
        />
      ),
    },
  ]

  function handleDelete() {
    if (!pending) return
    if (pending.kind === 'payment') {
      removePayment(pending.item.id)
      logDeleted('payment', pending.item.id, pending.item.description)
    } else if (pending.kind === 'expense') {
      removeExpense(pending.item.id)
      logDeleted('expense', pending.item.id, pending.item.description)
    } else {
      removeContract(pending.item.id)
      logDeleted(
        'contract',
        pending.item.id,
        `Contrato — ${clientById(pending.item.clientId)?.name ?? 'cliente removido'}`,
      )
    }
    setPending(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description={`Entradas, saídas e resultado de ${label.toLowerCase()}.`}
        actions={
          <>
            <Button onClick={() => setExpenseForm({ open: true })}>
              <ArrowDownRight />
              Novo custo
            </Button>
            <Button variant="primary" onClick={() => setPaymentForm({ open: true })}>
              <ArrowUpRight />
              Novo recebimento
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Recebido no mês"
          value={cash.received}
          previousValue={previousCash.received}
          format="currency"
          icon={Wallet}
        />
        <MetricCard
          label="Custos do mês"
          value={cash.expenses}
          previousValue={previousCash.expenses}
          format="currency"
          trend="down"
          icon={Receipt}
        />
        <MetricCard
          label="Resultado do mês"
          value={cash.profit}
          previousValue={previousCash.profit}
          format="currency"
          tone={cash.profit < 0 ? 'danger' : undefined}
        />
        <MetricCard
          label="A receber"
          value={receivable}
          format="currency"
          tone={overdueAmount > 0 ? 'warning' : undefined}
          hint={
            overdueAmount > 0 ? `${formatCurrency(overdueAmount)} vencidos` : 'nada vencido'
          }
        />
        <MetricCard
          label="Recorrência mensal"
          value={mrr}
          format="currency"
          icon={Repeat}
          hint={`${contracts.filter((c) => c.status === ContractStatus.ACTIVE).length} contratos ativos`}
        />
      </section>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="revenue">Receitas ({payments.length})</TabsTrigger>
          <TabsTrigger value="expenses">Custos ({expenses.length})</TabsTrigger>
          <TabsTrigger value="contracts">Contratos ({contracts.length})</TabsTrigger>
        </TabsList>

        {/* ------------------------------ Visão geral ---------------------------- */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Receita e custos</CardTitle>
                  <p className="text-xs text-ink-dim">Últimos 6 meses, por caixa.</p>
                </div>
              </CardHeader>
              <CardContent>
                <RevenueChart data={series} activeKey={range.from.slice(0, 7)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Resultado</CardTitle>
                  <p className="text-xs text-ink-dim">Recebido menos custos, mês a mês.</p>
                </div>
              </CardHeader>
              <CardContent>
                <ProfitChart data={series} />
              </CardContent>
            </Card>
          </div>

          {late.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-danger" />
                  <CardTitle>Cobranças vencidas</CardTitle>
                </div>
                <span className="tabular text-xs font-medium text-danger">
                  {formatCurrency(overdueAmount)}
                </span>
              </CardHeader>
              <CardContent className="pt-0">
                <DataTable
                  columns={paymentColumns.filter((column) => column.key !== 'paymentDate')}
                  data={sortBy(late, (payment) => payment.dueDate)}
                  getRowId={(payment) => payment.id}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Custos por categoria</CardTitle>
              <span className="tabular text-xs text-ink-faint">
                {formatCurrency(sumBy(expenses, (expense) => expense.amount))} no total
              </span>
            </CardHeader>
            <CardContent>
              <CategoryBreakdown expenses={expenses} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------------------- Receitas ----------------------------- */}
        <TabsContent value="revenue" className="space-y-4">
          <FilterBar
            filters={revenueFilterConfig}
            values={revenueFilters}
            onChange={setRevenueFilters}
          />
          <SummaryLine
            count={filteredPayments.length}
            total={sumBy(filteredPayments, (payment) => payment.amount)}
            noun="recebimentos"
          />
          {filteredPayments.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Nenhum recebimento"
              description={
                payments.length === 0
                  ? 'Lance a primeira cobrança para acompanhar o que entra.'
                  : 'Nenhum recebimento corresponde aos filtros aplicados.'
              }
              actionLabel={payments.length === 0 ? 'Novo recebimento' : undefined}
              onAction={payments.length === 0 ? () => setPaymentForm({ open: true }) : undefined}
            />
          ) : (
            <DataTable
              columns={paymentColumns}
              data={filteredPayments}
              getRowId={(payment) => payment.id}
              initialSort={{ key: 'dueDate', direction: 'desc' }}
            />
          )}
        </TabsContent>

        {/* --------------------------------- Custos ------------------------------ */}
        <TabsContent value="expenses" className="space-y-4">
          <FilterBar
            filters={expenseFilterConfig}
            values={expenseFilters}
            onChange={setExpenseFilters}
          />
          <SummaryLine
            count={filteredExpenses.length}
            total={sumBy(filteredExpenses, (expense) => expense.amount)}
            noun="custos"
            negative
          />
          {filteredExpenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Nenhum custo"
              description={
                expenses.length === 0
                  ? 'Lance software, freelancers e trilhas para saber a margem real.'
                  : 'Nenhum custo corresponde aos filtros aplicados.'
              }
              actionLabel={expenses.length === 0 ? 'Novo custo' : undefined}
              onAction={expenses.length === 0 ? () => setExpenseForm({ open: true }) : undefined}
            />
          ) : (
            <DataTable
              columns={expenseColumns}
              data={filteredExpenses}
              getRowId={(expense) => expense.id}
              initialSort={{ key: 'date', direction: 'desc' }}
            />
          )}
        </TabsContent>

        {/* ------------------------------- Contratos ----------------------------- */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink-dim">
              {formatCurrency(mrr)} de receita recorrente mensal.
            </p>
            <Button onClick={() => setContractForm({ open: true })}>
              <Plus />
              Novo contrato
            </Button>
          </div>
          {contracts.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title="Nenhum contrato"
              description="Contratos recorrentes tornam previsível a receita do mês seguinte."
              actionLabel="Novo contrato"
              onAction={() => setContractForm({ open: true })}
            />
          ) : (
            <DataTable
              columns={contractColumns}
              data={contracts}
              getRowId={(contract) => contract.id}
              initialSort={{ key: 'renewal', direction: 'asc' }}
            />
          )}
        </TabsContent>
      </Tabs>

      <PaymentForm
        open={paymentForm.open}
        onOpenChange={(open) => setPaymentForm({ open, item: open ? paymentForm.item : undefined })}
        payment={paymentForm.item}
      />
      <ExpenseForm
        open={expenseForm.open}
        onOpenChange={(open) => setExpenseForm({ open, item: open ? expenseForm.item : undefined })}
        expense={expenseForm.item}
      />
      <ContractForm
        open={contractForm.open}
        onOpenChange={(open) =>
          setContractForm({ open, item: open ? contractForm.item : undefined })
        }
        contract={contractForm.item}
      />

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={
          pending?.kind === 'payment'
            ? 'Excluir recebimento?'
            : pending?.kind === 'expense'
              ? 'Excluir custo?'
              : 'Excluir contrato?'
        }
        confirmLabel="Excluir"
        message={
          pending?.kind === 'contract' ? (
            <>O contrato sai da recorrência mensal. Os recebimentos já lançados permanecem.</>
          ) : (
            <>
              <strong className="text-ink">{pending?.item.description ?? ''}</strong>{' '}
              será removido e deixará de contar nos totais.
            </>
          )
        }
        onConfirm={handleDelete}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  Auxiliares                                */
/* -------------------------------------------------------------------------- */

function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Ações da linha">
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem variant="danger" onSelect={onDelete}>
          <Trash2 />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Linha de resumo do recorte filtrado, acima da tabela. */
function SummaryLine({
  count,
  total,
  noun,
  negative = false,
}: {
  count: number
  total: number
  noun: string
  negative?: boolean
}) {
  return (
    <p className="text-sm text-ink-dim">
      {count} {noun} ·{' '}
      <span className={cn('tabular font-medium', negative ? 'text-danger' : 'text-ink')}>
        {negative ? '-' : ''}
        {formatCurrency(total)}
      </span>
    </p>
  )
}

/** Distribuição dos custos por categoria, ordenada pelo maior. */
function CategoryBreakdown({ expenses }: { expenses: Expense[] }) {
  const total = sumBy(expenses, (expense) => expense.amount)

  const rows = useMemo(() => {
    const byCategory = new Map<string, number>()
    for (const expense of expenses) {
      byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + expense.amount)
    }
    return [...byCategory.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [expenses])

  if (rows.length === 0) {
    return (
      <EmptyState
        size="inline"
        icon={Receipt}
        title="Nenhum custo lançado"
        description="Sem custos, a margem exibida é o valor cheio do contrato."
      />
    )
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.category} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-xs text-ink-dim">
            {EXPENSE_CATEGORY_LABEL[row.category as keyof typeof EXPENSE_CATEGORY_LABEL]}
          </span>
          <span className="relative h-4 flex-1 overflow-hidden rounded-sm bg-hover">
            <span
              className="absolute inset-y-0 left-0 rounded-sm bg-danger/70"
              style={{ width: `${(row.amount / total) * 100}%` }}
            />
          </span>
          <span className="tabular w-24 shrink-0 text-right text-xs text-ink">
            {formatCurrency(row.amount)}
          </span>
          <span className="tabular w-12 shrink-0 text-right text-xs text-ink-faint">
            {formatPercent((row.amount / total) * 100, 0)}
          </span>
        </div>
      ))}
    </div>
  )
}
