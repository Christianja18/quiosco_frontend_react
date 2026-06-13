import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Clock3, PackageSearch, ReceiptText } from 'lucide-react'
import {
  getDashboardToday,
  getLowStockProducts,
  getRecentSales,
} from './api'
import { formatCurrency, formatDateTime, paymentMethodLabels } from '../../shared/utils/format'

export const DashboardPage = () => {
  const todayQuery = useQuery({
    queryKey: ['dashboard-today'],
    queryFn: getDashboardToday,
  })

  const lowStockQuery = useQuery({
    queryKey: ['low-stock-products'],
    queryFn: getLowStockProducts,
  })

  const recentSalesQuery = useQuery({
    queryKey: ['recent-sales'],
    queryFn: getRecentSales,
  })

  const today = todayQuery.data
  const lowStock = lowStockQuery.data ?? []
  const recentSales = recentSalesQuery.data ?? []

  return (
    <section className="page-grid" aria-labelledby="dashboard-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Operación del día</p>
          <h1 id="dashboard-title">Panel de Tortas Gaby</h1>
        </div>
      </div>

      <div className="metrics-grid">
        <article className="metric-card">
          <span className="metric-icon">
            <ReceiptText size={22} />
          </span>
          <div>
            <p>Ventas de hoy</p>
            <strong>{todayQuery.isLoading ? '...' : today?.sales_count ?? 0}</strong>
          </div>
        </article>

        <article className="metric-card">
          <span className="metric-icon">
            <Clock3 size={22} />
          </span>
          <div>
            <p>Total vendido</p>
            <strong>
              {todayQuery.isLoading
                ? '...'
                : formatCurrency(today?.total_sold ?? 0)}
            </strong>
          </div>
        </article>

        <article className="metric-card warning">
          <span className="metric-icon">
            <AlertTriangle size={22} />
          </span>
          <div>
            <p>Bajo stock</p>
            <strong>{lowStockQuery.isLoading ? '...' : lowStock.length}</strong>
          </div>
        </article>
      </div>

      <div className="content-grid two-columns">
        <section className="panel" aria-labelledby="low-stock-title">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Reposición</p>
              <h2 id="low-stock-title">Productos con bajo stock</h2>
            </div>
            <PackageSearch size={20} />
          </div>

          {lowStockQuery.isLoading ? (
            <p className="muted">Cargando productos...</p>
          ) : lowStock.length === 0 ? (
            <p className="empty-state">No hay productos por debajo del stock mínimo.</p>
          ) : (
            <div className="list-stack">
              {lowStock.map((product) => (
                <article className="list-row" key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.category_name ?? 'Sin categoría'}</span>
                  </div>
                  <span className="stock-pill danger">
                    {product.stock} / {product.min_stock}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel" aria-labelledby="recent-sales-title">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Caja rápida</p>
              <h2 id="recent-sales-title">Últimas ventas</h2>
            </div>
            <ReceiptText size={20} />
          </div>

          {recentSalesQuery.isLoading ? (
            <p className="muted">Cargando ventas...</p>
          ) : recentSales.length === 0 ? (
            <p className="empty-state">Aún no hay ventas registradas.</p>
          ) : (
            <div className="list-stack">
              {recentSales.map((sale) => (
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
