import { useQuery } from '@tanstack/react-query'
import { BarChart3, ClipboardList, PackageSearch, ReceiptText } from 'lucide-react'
import {
  getReportLowStock,
  getReportOrders,
  getReportProducts,
  getReportSales,
} from './api'
import { formatCurrency, formatDateTime, paymentMethodLabels } from '../../shared/utils/format'

export const ReportsPage = () => {
  const salesQuery = useQuery({
    queryKey: ['report-sales'],
    queryFn: getReportSales,
  })
  const productsQuery = useQuery({
    queryKey: ['report-products'],
    queryFn: getReportProducts,
  })
  const lowStockQuery = useQuery({
    queryKey: ['report-low-stock'],
    queryFn: getReportLowStock,
  })
  const ordersQuery = useQuery({
    queryKey: ['report-orders'],
    queryFn: getReportOrders,
  })

  const sales = salesQuery.data ?? []
  const products = productsQuery.data ?? []
  const lowStock = lowStockQuery.data ?? []
  const orders = ordersQuery.data ?? []
  const totalSold = sales.reduce((sum, sale) => sum + sale.total, 0)

  return (
    <section className="page-grid" aria-labelledby="reports-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Reportes</p>
          <h1 id="reports-title">Resumen operativo</h1>
        </div>
      </div>

      <div className="metrics-grid">
        <article className="metric-card">
          <span className="metric-icon">
            <ReceiptText size={22} />
          </span>
          <div>
            <p>Ventas consultadas</p>
            <strong>{sales.length}</strong>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon">
            <BarChart3 size={22} />
          </span>
          <div>
            <p>Total vendido</p>
            <strong>{formatCurrency(totalSold)}</strong>
          </div>
        </article>
        <article className="metric-card warning">
          <span className="metric-icon">
            <PackageSearch size={22} />
          </span>
          <div>
            <p>Bajo stock</p>
            <strong>{lowStock.length}</strong>
          </div>
        </article>
      </div>

      <div className="content-grid two-columns">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Ventas</p>
              <h2>Últimas ventas</h2>
            </div>
          </div>
          <div className="list-stack">
            {sales.slice(0, 10).map((sale) => (
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
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Inventario</p>
              <h2>Stock actual</h2>
            </div>
          </div>
          <div className="list-stack">
            {products.slice(0, 10).map((product) => (
              <article className="list-row" key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <span>{formatCurrency(product.price)}</span>
                </div>
                <span
                  className={
                    product.stock <= product.min_stock
                      ? 'stock-pill danger'
                      : 'stock-pill'
                  }
                >
                  {product.stock}
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Pedidos</p>
            <h2>Historial reciente</h2>
          </div>
          <ClipboardList size={20} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Consumidor</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 12).map((order) => (
                <tr key={order.id}>
                  <td>
                    {order.first_names} {order.last_names}
                  </td>
                  <td>
                    <span className={`status ${order.status_code.toLowerCase()}`}>
                      {order.status_name}
                    </span>
                  </td>
                  <td>{formatCurrency(order.total)}</td>
                  <td>{formatDateTime(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
