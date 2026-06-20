import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  PackageSearch,
  ReceiptText,
} from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../shared/components/Modal'
import type { Sale } from '../../shared/types/domain'
import {
  getDashboardToday,
  getLowStockProducts,
  getRecentSales,
  getSaleDetail,
} from './api'
import { formatCurrency, formatDateTime, paymentMethodLabels } from '../../shared/utils/format'

const pageSize = 5

export const DashboardPage = () => {
  const [lowStockPage, setLowStockPage] = useState(1)
  const [recentSalesPage, setRecentSalesPage] = useState(1)
  const [recentSalesDateSearch, setRecentSalesDateSearch] = useState('')
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null)

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

  const saleDetailQuery = useQuery({
    queryKey: ['sale-detail', selectedSaleId],
    queryFn: () => getSaleDetail(selectedSaleId ?? 0),
    enabled: selectedSaleId !== null,
  })

  const today = todayQuery.data
  const lowStock = lowStockQuery.data ?? []
  const recentSales = recentSalesQuery.data ?? []
  const lowStockPageCount = Math.max(1, Math.ceil(lowStock.length / pageSize))
  const safeLowStockPage = Math.min(lowStockPage, lowStockPageCount)
  const paginatedLowStock = lowStock.slice(
    (safeLowStockPage - 1) * pageSize,
    safeLowStockPage * pageSize,
  )
  const filteredRecentSales = recentSales.filter(
    (sale) =>
      !recentSalesDateSearch || sale.created_at.slice(0, 10) === recentSalesDateSearch,
  )
  const recentSalesPageCount = Math.max(
    1,
    Math.ceil(filteredRecentSales.length / pageSize),
  )
  const safeRecentSalesPage = Math.min(recentSalesPage, recentSalesPageCount)
  const paginatedRecentSales = filteredRecentSales.slice(
    (safeRecentSalesPage - 1) * pageSize,
    safeRecentSalesPage * pageSize,
  )
  const selectedSale = recentSales.find((sale) => sale.id === selectedSaleId) ?? null

  const getSaleBuyerLabel = (sale: Sale) =>
    sale.order_id === null ? 'Venta directa' : `Pedido #${sale.order_id}`

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
              {todayQuery.isLoading ? '...' : formatCurrency(today?.total_sold ?? 0)}
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
              {paginatedLowStock.map((product) => (
                <article className="list-row" key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.category_name ?? 'Sin categoría'}</span>
                  </div>
                  <span className="stock-pill danger">
                    {product.available_stock} / {product.min_stock}
                  </span>
                </article>
              ))}
              {lowStock.length > pageSize ? (
                <div className="pagination-bar">
                  <span>
                    Página {safeLowStockPage} de {lowStockPageCount}
                  </span>
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={safeLowStockPage === 1}
                    onClick={() =>
                      setLowStockPage((current) => Math.max(1, current - 1))
                    }
                  >
                    Anterior
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={safeLowStockPage === lowStockPageCount}
                    onClick={() =>
                      setLowStockPage((current) =>
                        Math.min(lowStockPageCount, current + 1),
                      )
                    }
                  >
                    Siguiente
                  </button>
                </div>
              ) : null}
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

          <div className="list-toolbar">
            <label className="search-box date-search">
              <CalendarDays size={18} aria-hidden="true" />
              <input
                type="date"
                value={recentSalesDateSearch}
                onChange={(event) => {
                  setRecentSalesDateSearch(event.target.value)
                  setRecentSalesPage(1)
                }}
                aria-label="Buscar ventas por fecha"
              />
            </label>
          </div>

          {recentSalesQuery.isLoading ? (
            <p className="muted">Cargando ventas...</p>
          ) : filteredRecentSales.length === 0 ? (
            <p className="empty-state">
              {recentSalesDateSearch
                ? 'No hay ventas para la fecha seleccionada.'
                : 'Aún no hay ventas registradas.'}
            </p>
          ) : (
            <div className="list-stack">
              {paginatedRecentSales.map((sale) => (
                <article
                  className="list-row clickable-row"
                  key={sale.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedSaleId(sale.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedSaleId(sale.id)
                    }
                  }}
                >
                  <div>
                    <strong>{formatCurrency(sale.total)}</strong>
                    <span>{formatDateTime(sale.created_at)}</span>
                    <span>{getSaleBuyerLabel(sale)}</span>
                  </div>
                  <span className="soft-pill">
                    {paymentMethodLabels[sale.payment_method]}
                  </span>
                </article>
              ))}
              <div className="pagination-bar">
                <span>
                  Página {safeRecentSalesPage} de {recentSalesPageCount}
                </span>
                <button
                  className="ghost-button"
                  type="button"
                  disabled={safeRecentSalesPage === 1}
                  onClick={() =>
                    setRecentSalesPage((current) => Math.max(1, current - 1))
                  }
                >
                  Anterior
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  disabled={safeRecentSalesPage === recentSalesPageCount}
                  onClick={() =>
                    setRecentSalesPage((current) =>
                      Math.min(recentSalesPageCount, current + 1),
                    )
                  }
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedSale ? (
        <Modal
          eyebrow="Detalle"
          title={`Venta #${selectedSale.id}`}
          onClose={() => setSelectedSaleId(null)}
        >
          {saleDetailQuery.isLoading ? (
            <p className="muted">Cargando detalle...</p>
          ) : saleDetailQuery.data ? (
            <>
              <div className="order-detail-summary">
                <span className="soft-pill">
                  {paymentMethodLabels[saleDetailQuery.data.sale.payment_method]}
                </span>
                <strong>{formatCurrency(saleDetailQuery.data.sale.total)}</strong>
                <span>{formatDateTime(saleDetailQuery.data.sale.created_at)}</span>
              </div>

              <div className="list-stack">
                <article className="list-row">
                  <div>
                    <strong>Comprador</strong>
                    <span>
                      {saleDetailQuery.data.order
                        ? `${saleDetailQuery.data.order.first_names} ${saleDetailQuery.data.order.last_names}`
                        : 'Venta directa'}
                    </span>
                  </div>
                  <span>
                    {saleDetailQuery.data.order?.consumer_type_name ?? 'Mostrador'}
                  </span>
                </article>

                {saleDetailQuery.data.items.map((item) => (
                  <article className="list-row" key={item.id}>
                    <div>
                      <strong>{item.product_name ?? 'Producto no disponible'}</strong>
                      <span>
                        {item.quantity} x {formatCurrency(item.unit_price)}
                      </span>
                    </div>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p className="empty-state">No se encontró el detalle de la venta.</p>
          )}
        </Modal>
      ) : null}
    </section>
  )
}
