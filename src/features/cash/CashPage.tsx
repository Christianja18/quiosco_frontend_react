import { useQuery } from '@tanstack/react-query'
import { Banknote, CircleDollarSign } from 'lucide-react'
import { getReportSales } from '../reports/api'
import type { PaymentMethod, Sale } from '../../shared/types/domain'
import {
  formatCurrency,
  formatDateTime,
  paymentMethodLabels,
} from '../../shared/utils/format'

const emptySales: ReadonlyArray<Sale> = []
const paymentMethods: ReadonlyArray<PaymentMethod> = [
  'cash',
  'yape',
  'plin',
]

const isToday = (value: string): boolean => {
  const date = new Date(value)
  const today = new Date()

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

export const CashPage = () => {
  const salesQuery = useQuery({
    queryKey: ['report-sales'],
    queryFn: getReportSales,
  })

  const sales = salesQuery.data ?? emptySales
  const todaySales = sales.filter((sale) => isToday(sale.created_at))
  const total = todaySales.reduce((sum, sale) => sum + sale.total, 0)

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
        calcula el cuadre del día usando las ventas registradas.
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
            <strong>{todaySales.length}</strong>
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
              const methodTotal = todaySales
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
              <h2>Últimas ventas de hoy</h2>
            </div>
          </div>

          {salesQuery.isLoading ? (
            <p className="muted">Cargando ventas...</p>
          ) : todaySales.length === 0 ? (
            <p className="empty-state">Aún no hay ventas hoy.</p>
          ) : (
            <div className="list-stack">
              {todaySales.slice(0, 12).map((sale) => (
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
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
