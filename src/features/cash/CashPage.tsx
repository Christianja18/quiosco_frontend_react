import { useQuery } from '@tanstack/react-query'
import { Banknote, CalendarDays, CircleDollarSign } from 'lucide-react'
import { useState } from 'react'
import { getReportSales } from '../reports/api'
import type { PaymentMethod, Sale } from '../../shared/types/domain'
import {
  formatCurrency,
  formatDateTime,
  paymentMethodLabels,
} from '../../shared/utils/format'

const emptySales: ReadonlyArray<Sale> = []
const pageSize = 5
const paymentMethods: ReadonlyArray<PaymentMethod> = ['cash', 'yape', 'plin']

const getLocalDateInputValue = (value: Date): string => {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

export const CashPage = () => {
  const [salesPage, setSalesPage] = useState(1)
  const [salesDateSearch, setSalesDateSearch] = useState(() =>
    getLocalDateInputValue(new Date()),
  )

  const salesQuery = useQuery({
    queryKey: ['report-sales'],
    queryFn: getReportSales,
  })

  const sales = salesQuery.data ?? emptySales
  const filteredSales = sales.filter(
    (sale) => !salesDateSearch || sale.created_at.slice(0, 10) === salesDateSearch,
  )
  const total = filteredSales.reduce((sum, sale) => sum + sale.total, 0)
  const salesPageCount = Math.max(1, Math.ceil(filteredSales.length / pageSize))
  const safeSalesPage = Math.min(salesPage, salesPageCount)
  const paginatedSales = filteredSales.slice(
    (safeSalesPage - 1) * pageSize,
    safeSalesPage * pageSize,
  )

  return (
    <section className="page-grid" aria-labelledby="cash-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Caja</p>
          <h1 id="cash-title">Cuadre diario</h1>
        </div>
      </div>

      <p className="permission-banner">
        La base actual no tiene apertura/cierre persistente de caja. Este módulo
        calcula el cuadre según el día seleccionado usando las ventas registradas.
      </p>

      <div className="metrics-grid">
        <article className="metric-card">
          <span className="metric-icon">
            <CircleDollarSign size={22} />
          </span>
          <div>
            <p>Total del día</p>
            <strong>{formatCurrency(total)}</strong>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon">
            <Banknote size={22} />
          </span>
          <div>
            <p>Operaciones</p>
            <strong>{filteredSales.length}</strong>
          </div>
        </article>
      </div>

      <div className="content-grid two-columns">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Métodos de pago</p>
              <h2>Resumen</h2>
            </div>
          </div>

          <div className="list-stack">
            {paymentMethods.map((method) => {
              const methodTotal = filteredSales
                .filter((sale) => sale.payment_method === method)
                .reduce((sum, sale) => sum + sale.total, 0)

              return (
                <article className="list-row" key={method}>
                  <div>
                    <strong>{paymentMethodLabels[method]}</strong>
                    <span>Ventas del día</span>
                  </div>
                  <span>{formatCurrency(methodTotal)}</span>
                </article>
              )
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Historial</p>
              <h2>Ventas por día</h2>
            </div>
          </div>

          <div className="list-toolbar">
            <label className="search-box date-search">
              <CalendarDays size={18} aria-hidden="true" />
              <input
                type="date"
                value={salesDateSearch}
                onChange={(event) => {
                  setSalesDateSearch(event.target.value)
                  setSalesPage(1)
                }}
                aria-label="Buscar ventas por día"
              />
            </label>
          </div>

          {salesQuery.isLoading ? (
            <p className="muted">Cargando ventas...</p>
          ) : filteredSales.length === 0 ? (
            <p className="empty-state">No hay ventas para el día seleccionado.</p>
          ) : (
            <div className="list-stack">
              {paginatedSales.map((sale) => (
                <article className="list-row" key={sale.id}>
                  <div>
                    <strong>{formatCurrency(sale.total)}</strong>
                    <span>{formatDateTime(sale.created_at)}</span>
                  </div>
                  <span className="soft-pill">
                    {paymentMethodLabels[sale.payment_method]}
                  </span>
                </article>
              ))}
              <div className="pagination-bar">
                <span>
                  Página {safeSalesPage} de {salesPageCount}
                </span>
                <button
                  className="ghost-button"
                  type="button"
                  disabled={safeSalesPage === 1}
                  onClick={() => setSalesPage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  disabled={safeSalesPage === salesPageCount}
                  onClick={() =>
                    setSalesPage((current) => Math.min(salesPageCount, current + 1))
                  }
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

