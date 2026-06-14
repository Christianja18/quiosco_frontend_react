import { useQuery } from '@tanstack/react-query'
import { BarChart3, ClipboardList, PackageSearch, ReceiptText } from 'lucide-react'
import { useState } from 'react'
import {
  getReportLowStock,
  getReportOrders,
  getReportProducts,
  getReportSales,
} from './api'
import { formatCurrency, formatDateTime, paymentMethodLabels } from '../../shared/utils/format'

const pageSize = 5

export const ReportsPage = () => {
  const [stockPage, setStockPage] = useState(1)
  const [ordersPage, setOrdersPage] = useState(1)
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
  const stockPageCount = Math.max(1, Math.ceil(products.length / pageSize))
  const ordersPageCount = Math.max(1, Math.ceil(orders.length / pageSize))
  const safeStockPage = Math.min(stockPage, stockPageCount)
  const safeOrdersPage = Math.min(ordersPage, ordersPageCount)
  const paginatedProducts = products.slice(
    (safeStockPage - 1) * pageSize,
    safeStockPage * pageSize,
  )
  const paginatedOrders = orders.slice(
    (safeOrdersPage - 1) * pageSize,
    safeOrdersPage * pageSize,
  )

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
            {paginatedProducts.map((product) => (
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
            <div className="pagination-bar">
              <span>
                Página {safeStockPage} de {stockPageCount}
              </span>
              <button
                className="ghost-button"
                type="button"
                disabled={safeStockPage === 1}
                onClick={() => setStockPage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={safeStockPage === stockPageCount}
                onClick={() =>
                  setStockPage((current) => Math.min(stockPageCount, current + 1))
                }
              >
                Siguiente
              </button>
            </div>
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
              {paginatedOrders.map((order) => (
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
          <div className="pagination-bar">
            <span>
              Página {safeOrdersPage} de {ordersPageCount}
            </span>
            <button
              className="ghost-button"
              type="button"
              disabled={safeOrdersPage === 1}
              onClick={() => setOrdersPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </button>
            <button
              className="ghost-button"
              type="button"
              disabled={safeOrdersPage === ordersPageCount}
              onClick={() =>
                setOrdersPage((current) => Math.min(ordersPageCount, current + 1))
              }
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
    </section>
  )
}
