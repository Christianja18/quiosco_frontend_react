import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ReceiptText, Search, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../shared/components/Modal'
import type {
  AccountReceivableStatus,
  AccountReceivableWithConsumer,
  Profile,
  ReceivablePaymentMethod,
} from '../../shared/types/domain'
import {
  formatCurrency,
  formatDateTime,
  orderPaymentTypeLabels,
  paymentMethodLabels,
} from '../../shared/utils/format'
import {
  getAccountReceivableDetails,
  getAccountReceivables,
  getReceivablePayments,
  registerReceivablePayment,
} from './api'

const pageSize = 5
const emptyAccounts: ReadonlyArray<AccountReceivableWithConsumer> = []
const receivablePaymentMethods: ReadonlyArray<ReceivablePaymentMethod> = [
  'cash',
  'yape',
  'plin',
]

const receivableStatusLabels: Record<AccountReceivableStatus, string> = {
  OPEN: 'Abierta',
  PARTIAL: 'Parcial',
  PAID: 'Pagada',
}

type DebtsPageProps = {
  readonly profile: Profile
}

const toNullableText = (value: string): string | null => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const toPeriodValue = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, '0')}`

export const DebtsPage = ({ profile }: DebtsPageProps) => {
  const queryClient = useQueryClient()
  const canOperate = profile.role === 'admin' || profile.role === 'seller'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | AccountReceivableStatus>(
    'ALL',
  )
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'STUDENT' | 'TEACHER'>(
    'ALL',
  )
  const [periodFilter, setPeriodFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [detailsPage, setDetailsPage] = useState(1)
  const [paymentsPage, setPaymentsPage] = useState(1)
  const [paymentMethod, setPaymentMethod] =
    useState<ReceivablePaymentMethod>('cash')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')

  const accountsQuery = useQuery({
    queryKey: ['account-receivables'],
    queryFn: getAccountReceivables,
    enabled: true,
  })

  const accountDetailsQuery = useQuery({
    queryKey: ['account-receivable-details', selectedAccountId],
    queryFn: () => getAccountReceivableDetails(selectedAccountId ?? 0),
    enabled: selectedAccountId !== null,
  })

  const paymentsQuery = useQuery({
    queryKey: ['receivable-payments', selectedAccountId],
    queryFn: () => getReceivablePayments(selectedAccountId ?? 0),
    enabled: selectedAccountId !== null,
  })

  const paymentMutation = useMutation({
    mutationFn: () =>
      registerReceivablePayment(
        selectedAccountId ?? 0,
        Number(paymentAmount),
        paymentMethod,
        toNullableText(paymentNotes),
      ),
    onSuccess: () => {
      setPaymentAmount('')
      setPaymentNotes('')
      void queryClient.invalidateQueries({ queryKey: ['account-receivables'] })
      void queryClient.invalidateQueries({
        queryKey: ['account-receivable-details', selectedAccountId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['receivable-payments', selectedAccountId],
      })
    },
  })

  useEffect(() => {
    if (!paymentMutation.isError && !paymentMutation.isSuccess) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => paymentMutation.reset(), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [paymentMutation])

  const accounts = accountsQuery.data ?? emptyAccounts
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId)
  const accountDetails = accountDetailsQuery.data ?? []
  const payments = paymentsQuery.data ?? []

  const filteredAccounts = useMemo(() => {
    const normalized = search.trim().toLowerCase()

    return accounts.filter((account) => {
      const matchesSearch =
        !normalized ||
        `${account.first_names} ${account.last_names} ${account.consumer_type_name}`
          .toLowerCase()
          .includes(normalized)
      const matchesStatus =
        statusFilter === 'ALL' || account.status === statusFilter
      const matchesType =
        typeFilter === 'ALL' || account.consumer_type_code === typeFilter
      const matchesPeriod =
        !periodFilter ||
        toPeriodValue(account.period_year, account.period_month) === periodFilter

      return matchesSearch && matchesStatus && matchesType && matchesPeriod
    })
  }, [accounts, periodFilter, search, statusFilter, typeFilter])

  const totalPendingBalance = filteredAccounts.reduce(
    (sum, account) => sum + account.balance,
    0,
  )

  const pageCount = Math.max(1, Math.ceil(filteredAccounts.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const paginatedAccounts = filteredAccounts.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  )
  const detailsPageCount = Math.max(1, Math.ceil(accountDetails.length / pageSize))
  const safeDetailsPage = Math.min(detailsPage, detailsPageCount)
  const paginatedAccountDetails = accountDetails.slice(
    (safeDetailsPage - 1) * pageSize,
    safeDetailsPage * pageSize,
  )
  const paymentsPageCount = Math.max(1, Math.ceil(payments.length / pageSize))
  const safePaymentsPage = Math.min(paymentsPage, paymentsPageCount)
  const paginatedPayments = payments.slice(
    (safePaymentsPage - 1) * pageSize,
    safePaymentsPage * pageSize,
  )

  const canRegisterPayment =
    selectedAccount !== undefined &&
    selectedAccount.status !== 'PAID' &&
    paymentAmount.trim().length > 0 &&
    Number(paymentAmount) > 0 &&
    Number(paymentAmount) <= selectedAccount.balance

  const openAccountDetail = (accountId: number) => {
    setDetailsPage(1)
    setPaymentsPage(1)
    setSelectedAccountId(accountId)
  }

  return (
    <section className="page-grid" aria-labelledby="debts-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Cobranza</p>
          <h1 id="debts-title">Crédito mensual</h1>
        </div>
      </div>

      {!canOperate ? (
        <p className="permission-banner">
          Puedes revisar tus consumos y saldo pendiente. El registro de pagos solo
          está disponible para administración y ventas.
        </p>
      ) : null}

      <div className="metrics-grid">
        <article className="metric-card">
          <span className="metric-icon">
            <Wallet size={22} />
          </span>
          <div>
            <p>Cuentas visibles</p>
            <strong>{filteredAccounts.length}</strong>
          </div>
        </article>
        <article className="metric-card warning">
          <span className="metric-icon">
            <ReceiptText size={22} />
          </span>
          <div>
            <p>Saldo pendiente</p>
            <strong>{formatCurrency(totalPendingBalance)}</strong>
          </div>
        </article>
      </div>

      <section className="panel" aria-labelledby="debts-list-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Listado</p>
            <h2 id="debts-list-title">Cuentas por cobrar</h2>
          </div>
        </div>

        <div className="list-toolbar">
          <label className="search-box">
            <Search size={18} aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Buscar consumidor"
            />
          </label>

          <label className="search-box date-search">
            <CalendarDays size={18} aria-hidden="true" />
            <input
              type="month"
              value={periodFilter}
              onChange={(event) => {
                setPeriodFilter(event.target.value)
                setPage(1)
              }}
              aria-label="Filtrar por período"
            />
          </label>

          <label className="field inline-filter">
            <span className="sr-only">Filtrar por tipo</span>
            <select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value as 'ALL' | 'STUDENT' | 'TEACHER')
                setPage(1)
              }}
            >
              <option value="ALL">Todos los tipos</option>
              <option value="STUDENT">Alumno</option>
              <option value="TEACHER">Profesor</option>
            </select>
          </label>

          <label className="field inline-filter">
            <span className="sr-only">Filtrar por estado</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(
                  event.target.value as 'ALL' | AccountReceivableStatus,
                )
                setPage(1)
              }}
            >
              <option value="ALL">Todos los estados</option>
              <option value="OPEN">Abierta</option>
              <option value="PARTIAL">Parcial</option>
              <option value="PAID">Pagada</option>
            </select>
          </label>
        </div>

        {accountsQuery.isLoading ? (
          <p className="muted">Cargando cuentas por cobrar...</p>
        ) : filteredAccounts.length === 0 ? (
          <p className="empty-state">
            No hay cuentas que coincidan con los filtros seleccionados.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Consumidor</th>
                  <th>Tipo</th>
                  <th>Período</th>
                  <th>Total</th>
                  <th>Pagado</th>
                  <th>Saldo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAccounts.map((account) => (
                  <tr
                    className="clickable-row"
                    key={account.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openAccountDetail(account.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openAccountDetail(account.id)
                      }
                    }}
                  >
                    <td>
                      {account.first_names} {account.last_names}
                    </td>
                    <td>{account.consumer_type_name}</td>
                    <td>{toPeriodValue(account.period_year, account.period_month)}</td>
                    <td>{formatCurrency(account.total_amount)}</td>
                    <td>{formatCurrency(account.paid_amount)}</td>
                    <td>{formatCurrency(account.balance)}</td>
                    <td>
                      <span className={`status ${account.status.toLowerCase()}`}>
                        {receivableStatusLabels[account.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination-bar">
              <span>
                Página {safePage} de {pageCount}
              </span>
              <button
                className="ghost-button"
                type="button"
                disabled={safePage === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={safePage === pageCount}
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </section>

      {selectedAccount ? (
        <Modal
          eyebrow="Detalle"
          title={`${selectedAccount.first_names} ${selectedAccount.last_names}`}
          onClose={() => setSelectedAccountId(null)}
        >
          <div className="order-detail-summary">
            <span className={`status ${selectedAccount.status.toLowerCase()}`}>
              {receivableStatusLabels[selectedAccount.status]}
            </span>
            <strong>{formatCurrency(selectedAccount.balance)}</strong>
            <span>
              {toPeriodValue(selectedAccount.period_year, selectedAccount.period_month)}
            </span>
          </div>

          <section className="panel flat-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Pedidos asociados</p>
                <h2>Consumos del período</h2>
              </div>
            </div>

            {accountDetailsQuery.isLoading ? (
              <p className="muted">Cargando pedidos asociados...</p>
            ) : accountDetails.length === 0 ? (
              <p className="empty-state">
                Todavía no hay consumos registrados en este período.
              </p>
            ) : (
              <>
                <div className="list-stack">
                  {paginatedAccountDetails.map((detail) => (
                    <article className="list-row" key={detail.id}>
                      <div>
                        <strong>Pedido #{detail.order_id}</strong>
                        <span>
                          {orderPaymentTypeLabels[detail.payment_type]} ·{' '}
                          {formatDateTime(detail.order_created_at)}
                        </span>
                      </div>
                      <span>{formatCurrency(detail.amount)}</span>
                    </article>
                  ))}
                </div>
                <div className="pagination-bar">
                  <span>
                    Página {safeDetailsPage} de {detailsPageCount}
                  </span>
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={safeDetailsPage === 1}
                    onClick={() =>
                      setDetailsPage((current) => Math.max(1, current - 1))
                    }
                  >
                    Anterior
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={safeDetailsPage === detailsPageCount}
                    onClick={() =>
                      setDetailsPage((current) =>
                        Math.min(detailsPageCount, current + 1),
                      )
                    }
                  >
                    Siguiente
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="panel flat-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Pagos</p>
                <h2>Historial de abonos</h2>
              </div>
            </div>

            {paymentsQuery.isLoading ? (
              <p className="muted">Cargando pagos...</p>
            ) : payments.length === 0 ? (
              <p className="empty-state">
                Todavía no hay pagos registrados para esta cuenta.
              </p>
            ) : (
              <>
                <div className="list-stack">
                  {paginatedPayments.map((payment) => (
                    <article className="list-row" key={payment.id}>
                      <div>
                        <strong>{formatCurrency(payment.amount)}</strong>
                        <span>{formatDateTime(payment.created_at)}</span>
                      </div>
                      <span className="soft-pill">
                        {paymentMethodLabels[payment.payment_method]}
                      </span>
                    </article>
                  ))}
                </div>
                <div className="pagination-bar">
                  <span>
                    Página {safePaymentsPage} de {paymentsPageCount}
                  </span>
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={safePaymentsPage === 1}
                    onClick={() =>
                      setPaymentsPage((current) => Math.max(1, current - 1))
                    }
                  >
                    Anterior
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={safePaymentsPage === paymentsPageCount}
                    onClick={() =>
                      setPaymentsPage((current) =>
                        Math.min(paymentsPageCount, current + 1),
                      )
                    }
                  >
                    Siguiente
                  </button>
                </div>
              </>
            )}
          </section>

          {canOperate && selectedAccount.status !== 'PAID' ? (
            <section className="panel flat-panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Cobranza</p>
                  <h2>Registrar pago</h2>
                </div>
              </div>

              <div className="payment-group" aria-label="Método de pago">
                {receivablePaymentMethods.map((method) => (
                  <button
                    className={method === paymentMethod ? 'segment active' : 'segment'}
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                  >
                    {paymentMethodLabels[method]}
                  </button>
                ))}
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>Monto</span>
                  <input
                    min="0.1"
                    step="0.1"
                    type="number"
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                    placeholder="0.00"
                  />
                </label>

                <label className="field">
                  <span>Saldo pendiente</span>
                  <input value={formatCurrency(selectedAccount.balance)} disabled />
                </label>

                <label className="field wide">
                  <span>Notas</span>
                  <input
                    value={paymentNotes}
                    onChange={(event) => setPaymentNotes(event.target.value)}
                    placeholder="Observación del pago"
                  />
                </label>
              </div>

              {paymentMutation.isError ? (
                <p className="error-message" role="alert">
                  No se pudo registrar el pago.
                  {paymentMutation.error instanceof Error
                    ? ` ${paymentMutation.error.message}`
                    : ''}
                </p>
              ) : null}

              {paymentMutation.isSuccess ? (
                <p className="success-message" role="status">
                  Pago registrado correctamente.
                </p>
              ) : null}

              <div className="modal-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={!canRegisterPayment || paymentMutation.isPending}
                  onClick={() => paymentMutation.mutate()}
                >
                  {paymentMutation.isPending ? 'Registrando...' : 'Guardar pago'}
                </button>
              </div>
            </section>
          ) : null}
        </Modal>
      ) : null}
    </section>
  )
}
