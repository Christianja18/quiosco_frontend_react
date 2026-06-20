import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Minus,
  Plus,
  Search,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../shared/components/Modal'
import type {
  CartItem,
  Category,
  Consumer,
  ConsumerType,
  OrderStatusCode,
  OrderPaymentType,
  OrderWithDetails,
  PaymentMethod,
  Product,
  Profile,
} from '../../shared/types/domain'
import {
  formatCurrency,
  formatDateTime,
  orderPaymentTypeLabels,
  paymentMethodLabels,
} from '../../shared/utils/format'
import { getCategories, getProducts } from '../products/api'
import {
  cancelOrder,
  completeOrder,
  createOrder,
  getConsumers,
  getConsumerTypes,
  getMyOrders,
  getOrderDetails,
  getOrders,
  reserveOrder,
  updateOrderPaymentType,
} from './api'

const emptyProducts: ReadonlyArray<Product> = []
const emptyCategories: ReadonlyArray<Category> = []
const emptyConsumers: ReadonlyArray<Consumer> = []
const emptyConsumerTypes: ReadonlyArray<ConsumerType> = []
const emptyOrders: ReadonlyArray<OrderWithDetails> = []
const pageSize = 5

const paymentMethods: ReadonlyArray<PaymentMethod> = ['cash', 'yape', 'plin']
const orderPaymentTypes: ReadonlyArray<OrderPaymentType> = [
  'IMMEDIATE',
  'END_OF_MONTH',
]

const statusLabels: Record<OrderStatusCode, string> = {
  PENDING: 'Pendiente',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
}

type OrdersPageProps = {
  readonly profile: Profile
  readonly userEmail: string | null
}

const toNullableText = (value: string): string | null => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const toggleProductInCart = (
  cart: ReadonlyArray<CartItem>,
  product: Product,
): ReadonlyArray<CartItem> => {
  const existing = cart.find((item) => item.product.id === product.id)

  if (existing) {
    return cart.filter((item) => item.product.id !== product.id)
  }

  if (product.available_stock <= 0) {
    return cart
  }

  return [...cart, { product, quantity: 1 }]
}

const increaseCartItemQuantity = (
  cart: ReadonlyArray<CartItem>,
  product: Product,
): ReadonlyArray<CartItem> =>
  cart.map((item) =>
    item.product.id === product.id
      ? {
          ...item,
          quantity: Math.min(item.quantity + 1, product.available_stock),
        }
      : item,
  )

export const OrdersPage = ({ profile, userEmail }: OrdersPageProps) => {
  const queryClient = useQueryClient()
  const isSelfService = profile.role === 'profesor' || profile.role === 'alumno'
  const canOperate = profile.role === 'admin' || profile.role === 'seller'

  const [orderSearch, setOrderSearch] = useState('')
  const [orderDateSearch, setOrderDateSearch] = useState('')
  const [orderPage, setOrderPage] = useState(1)
  const [consumerSearch, setConsumerSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [selectedConsumerId, setSelectedConsumerId] = useState<number | null>(null)
  const [cart, setCart] = useState<ReadonlyArray<CartItem>>([])
  const [notes, setNotes] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [orderPaymentType, setOrderPaymentType] =
    useState<OrderPaymentType>('IMMEDIATE')
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)

  const consumersQuery = useQuery({
    queryKey: ['consumers'],
    queryFn: getConsumers,
    enabled: canOperate,
  })

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const consumerTypesQuery = useQuery({
    queryKey: ['consumer-types'],
    queryFn: getConsumerTypes,
    enabled: canOperate,
  })

  const ordersQuery = useQuery({
    queryKey: ['orders', isSelfService ? 'mine' : 'all', profile.id],
    queryFn: () => (isSelfService ? getMyOrders() : getOrders()),
  })

  const orderDetailsQuery = useQuery({
    queryKey: ['order-details', selectedOrderId],
    queryFn: () => getOrderDetails(selectedOrderId ?? 0),
    enabled: selectedOrderId !== null,
  })

  const consumers = consumersQuery.data ?? emptyConsumers
  const products = productsQuery.data ?? emptyProducts
  const categories = categoriesQuery.data ?? emptyCategories
  const consumerTypes = consumerTypesQuery.data ?? emptyConsumerTypes
  const orders = ordersQuery.data ?? emptyOrders
  const normalizedUserEmail = userEmail?.toLowerCase() ?? null

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )

  const consumerTypeById = useMemo(
    () => new Map(consumerTypes.map((consumerType) => [consumerType.id, consumerType])),
    [consumerTypes],
  )

  const visibleOrders = useMemo(() => {
    const normalized = orderSearch.trim().toLowerCase()
    const selectedDate = orderDateSearch.trim()

    return orders.filter((order) => {
      const matchesText =
        !normalized ||
        `${order.first_names} ${order.last_names} ${order.status_name} ${order.notes ?? ''}`
          .toLowerCase()
          .includes(normalized)

      const matchesDate =
        !selectedDate || order.created_at.slice(0, 10) === selectedDate

      return matchesText && matchesDate
    })
  }, [orderDateSearch, orderSearch, orders])

  const orderPageCount = Math.max(1, Math.ceil(visibleOrders.length / pageSize))
  const safeOrderPage = Math.min(orderPage, orderPageCount)
  const paginatedOrders = visibleOrders.slice(
    (safeOrderPage - 1) * pageSize,
    safeOrderPage * pageSize,
  )

  const filteredConsumers = useMemo(() => {
    const normalized = consumerSearch.trim().toLowerCase()

    if (!normalized) {
      return consumers.slice(0, 12)
    }

    return consumers.filter((consumer) =>
      `${consumer.first_names} ${consumer.last_names} ${consumer.grade_section ?? ''}`
        .toLowerCase()
        .includes(normalized),
    )
  }, [consumerSearch, consumers])

  const filteredProducts = useMemo(() => {
    const normalized = productSearch.trim().toLowerCase()
    const selectionOrder = new Map(
      cart.map((item, index) => [item.product.id, index]),
    )

    return products
      .filter((product) => {
        if (!product.is_active) {
          return false
        }

        if (!normalized) {
          return true
        }

        const categoryName = categoryById.get(product.category_id ?? 0) ?? ''
        return `${product.name} ${categoryName}`.toLowerCase().includes(normalized)
      })
      .sort((left, right) => {
        const leftSelectionIndex = selectionOrder.get(left.id)
        const rightSelectionIndex = selectionOrder.get(right.id)

        if (
          leftSelectionIndex !== undefined &&
          rightSelectionIndex !== undefined
        ) {
          return leftSelectionIndex - rightSelectionIndex
        }

        if (leftSelectionIndex !== undefined) {
          return -1
        }

        if (rightSelectionIndex !== undefined) {
          return 1
        }

        return left.name.localeCompare(right.name, 'es')
      })
  }, [cart, categoryById, productSearch, products])

  const selectedConsumer = isSelfService
    ? undefined
    : consumers.find((consumer) => consumer.id === selectedConsumerId)
  const selectedConsumerType = selectedConsumer
    ? consumerTypeById.get(selectedConsumer.consumer_type_id)
    : undefined
  const selfServiceCanUseEndOfMonth =
    profile.role === 'profesor' || profile.role === 'alumno'
  const canUseEndOfMonth =
    isSelfService
      ? selfServiceCanUseEndOfMonth
      : selectedConsumerType?.code === 'STUDENT' || selectedConsumerType?.code === 'TEACHER'
  const effectiveOrderPaymentType: OrderPaymentType =
    canUseEndOfMonth ? orderPaymentType : 'IMMEDIATE'

  const selectedOrder = visibleOrders.find((order) => order.id === selectedOrderId)

  const orderTotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.product.price,
    0,
  )

  const resetOrderForm = () => {
    setCart([])
    setNotes('')
    setProductSearch('')
    setOrderPaymentType('IMMEDIATE')
    if (!isSelfService) {
      setSelectedConsumerId(null)
    }
  }

  const orderMutation = useMutation({
    mutationFn: () =>
      isSelfService
        ? reserveOrder(
            cart.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
            })),
            toNullableText(notes),
            effectiveOrderPaymentType,
          )
        : createOrder(
            selectedConsumerId ?? 0,
            cart.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
            })),
            toNullableText(notes),
            effectiveOrderPaymentType,
          ),
    onSuccess: () => {
      resetOrderForm()
      setIsOrderModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['consumers'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['low-stock-products'] })
    },
  })

  const completeMutation = useMutation({
    mutationFn: (orderId: number) =>
      completeOrder(
        orderId,
        selectedOrder?.payment_type === 'END_OF_MONTH' ? null : paymentMethod,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-today'] })
      void queryClient.invalidateQueries({ queryKey: ['recent-sales'] })
      void queryClient.invalidateQueries({ queryKey: ['low-stock-products'] })
      void queryClient.invalidateQueries({ queryKey: ['account-receivables'] })
    },
  })

  const updatePaymentTypeMutation = useMutation({
    mutationFn: ({
      orderId,
      paymentType,
    }: {
      readonly orderId: number
      readonly paymentType: OrderPaymentType
    }) => updateOrderPaymentType(orderId, paymentType),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['account-receivables'] })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['low-stock-products'] })
    },
  })

  useEffect(() => {
    if (!orderMutation.isError) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => orderMutation.reset(), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [orderMutation])

  useEffect(() => {
    if (!completeMutation.isError) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => completeMutation.reset(), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [completeMutation])

  useEffect(() => {
    if (!cancelMutation.isError) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => cancelMutation.reset(), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [cancelMutation])

  useEffect(() => {
    if (!updatePaymentTypeMutation.isError) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => updatePaymentTypeMutation.reset(), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [updatePaymentTypeMutation])

  const canCreateOrder =
    (isSelfService || selectedConsumerId !== null) && cart.length > 0

  const selectOrder = (orderId: number) => setSelectedOrderId(orderId)

  return (
    <section className="page-grid" aria-labelledby="orders-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Pedidos</p>
          <h1 id="orders-title">
            {isSelfService ? 'Mis pedidos' : 'Pedidos de alumnos y profesores'}
          </h1>
        </div>
        <div className="page-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() => setIsOrderModalOpen(true)}
          >
            <ClipboardList size={18} />
            {isSelfService ? 'Reservar pedido' : 'Registrar pedido'}
          </button>
        </div>
      </div>

      <section className="panel" aria-labelledby="orders-list-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Listado</p>
            <h2 id="orders-list-title">Pedidos registrados</h2>
          </div>
        </div>

        <div className="list-toolbar">
          <label className="search-box">
            <Search size={18} aria-hidden="true" />
            <input
              value={orderSearch}
              onChange={(event) => {
                setOrderSearch(event.target.value)
                setOrderPage(1)
              }}
              placeholder="Buscar pedido"
            />
          </label>
          <label className="search-box date-search">
            <CalendarDays size={18} aria-hidden="true" />
            <input
              type="date"
              value={orderDateSearch}
              onChange={(event) => {
                setOrderDateSearch(event.target.value)
                setOrderPage(1)
              }}
              aria-label="Buscar pedidos por fecha"
            />
          </label>
        </div>

        {ordersQuery.isLoading ? (
          <p className="muted">Cargando pedidos...</p>
        ) : visibleOrders.length === 0 ? (
          <p className="empty-state">No hay pedidos para mostrar.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Persona</th>
                  <th>Tipo</th>
                  <th>Pago</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => (
                  <tr
                    className="clickable-row"
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectOrder(order.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        selectOrder(order.id)
                      }
                    }}
                  >
                    <td className="order-id-cell">#{order.id}</td>
                    <td>
                      {order.first_names} {order.last_names}
                    </td>
                    <td>{order.consumer_type_name}</td>
                    <td>{orderPaymentTypeLabels[order.payment_type]}</td>
                    <td>{formatDateTime(order.created_at)}</td>
                    <td>{formatCurrency(order.total)}</td>
                    <td>
                      <span className={`status ${order.status_code.toLowerCase()}`}>
                        {statusLabels[order.status_code]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination-bar">
              <span>
                Página {safeOrderPage} de {orderPageCount}
              </span>
              <button
                className="ghost-button"
                type="button"
                disabled={safeOrderPage === 1}
                onClick={() => setOrderPage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={safeOrderPage === orderPageCount}
                onClick={() =>
                  setOrderPage((current) => Math.min(orderPageCount, current + 1))
                }
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </section>

      {selectedOrder ? (
        <Modal
          eyebrow="Detalle"
          title={`Pedido #${selectedOrder.id}`}
          onClose={() => setSelectedOrderId(null)}
        >
          <div className="order-detail-summary">
            <span className={`status ${selectedOrder.status_code.toLowerCase()}`}>
              {statusLabels[selectedOrder.status_code]}
            </span>
            <strong>{formatCurrency(selectedOrder.total)}</strong>
            <span>
              {selectedOrder.first_names} {selectedOrder.last_names} -{' '}
              {orderPaymentTypeLabels[selectedOrder.payment_type]} -{' '}
              {formatDateTime(selectedOrder.created_at)}
            </span>
          </div>

          {orderDetailsQuery.isLoading ? (
            <p className="muted">Cargando detalle...</p>
          ) : (
            <div className="list-stack">
              {(orderDetailsQuery.data ?? []).map((detail) => {
                const product = detail.product_id
                  ? productById.get(detail.product_id)
                  : undefined

                return (
                  <article className="list-row" key={detail.id}>
                    <div>
                      <strong>{product?.name ?? 'Producto no disponible'}</strong>
                      <span>
                        {detail.quantity} x {formatCurrency(detail.unit_price)}
                      </span>
                    </div>
                    <span>{formatCurrency(detail.subtotal)}</span>
                  </article>
                )
              })}
            </div>
          )}

          {canOperate ? (
            <div className="order-actions" aria-label="Acciones del pedido">
              {selectedOrder.status_code === 'PENDING' ? (
                <div className="payment-group" aria-label="Tipo de pago del pedido">
                  {orderPaymentTypes.map((type) => {
                    const supportsEndOfMonth =
                      selectedOrder.consumer_type_code === 'STUDENT' ||
                      selectedOrder.consumer_type_code === 'TEACHER'
                    const disabled =
                      updatePaymentTypeMutation.isPending ||
                      (type === 'END_OF_MONTH' && !supportsEndOfMonth)

                    return (
                      <button
                        className={
                          type === selectedOrder.payment_type ? 'segment active' : 'segment'
                        }
                        key={type}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (type === selectedOrder.payment_type) {
                            return
                          }

                          updatePaymentTypeMutation.mutate({
                            orderId: selectedOrder.id,
                            paymentType: type,
                          })
                        }}
                      >
                        {orderPaymentTypeLabels[type]}
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {selectedOrder.status_code === 'PENDING' &&
              selectedOrder.payment_type === 'IMMEDIATE' ? (
                <div className="payment-group" aria-label="Método de pago">
                  {paymentMethods.map((method) => (
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
              ) : null}

              {selectedOrder.status_code === 'PENDING' ? (
                <div className="action-grid">
                  <button
                    className="primary-button"
                    type="button"
                    disabled={completeMutation.isPending}
                    onClick={() => completeMutation.mutate(selectedOrder.id)}
                  >
                    <CheckCircle2 size={18} />
                    {selectedOrder.payment_type === 'END_OF_MONTH'
                      ? 'Completar y cargar deuda'
                      : 'Completar venta'}
                  </button>
                  <button
                    className="ghost-button danger"
                    type="button"
                    disabled={cancelMutation.isPending}
                    onClick={() => cancelMutation.mutate(selectedOrder.id)}
                  >
                    <XCircle size={18} />
                    Cancelar pedido
                  </button>
                </div>
              ) : (
                <p className="empty-state">Este pedido ya no está pendiente.</p>
              )}

              {completeMutation.isError || cancelMutation.isError ? (
                <p className="error-message" role="alert">
                  No se pudo actualizar el pedido. Revisa stock o estado.
                </p>
              ) : null}

              {updatePaymentTypeMutation.isError ? (
                <p className="error-message" role="alert">
                  No se pudo cambiar el tipo de pago.
                  {updatePaymentTypeMutation.error instanceof Error
                    ? ` ${updatePaymentTypeMutation.error.message}`
                    : ''}
                </p>
              ) : null}
            </div>
          ) : null}
        </Modal>
      ) : null}

      {isOrderModalOpen ? (
        <Modal
          eyebrow="Registro"
          title={isSelfService ? 'Nueva reserva' : 'Nuevo pedido'}
          onClose={() => setIsOrderModalOpen(false)}
        >
          <div className="order-modal-grid">
            {!isSelfService ? (
              <section className="panel flat-panel" aria-labelledby="consumer-title">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Persona</p>
                    <h2 id="consumer-title">Seleccionar consumidor</h2>
                  </div>
                </div>

                <label className="search-box">
                  <Search size={18} aria-hidden="true" />
                  <input
                    value={consumerSearch}
                    onChange={(event) => setConsumerSearch(event.target.value)}
                    placeholder="Buscar consumidor"
                  />
                </label>

                <div className="consumer-list">
                  {filteredConsumers.length === 0 ? (
                    <p className="empty-state">
                      No hay consumidores con ese nombre. Regístralos desde Usuarios.
                    </p>
                  ) : (
                    filteredConsumers.map((consumer) => (
                      <button
                        className={
                          consumer.id === selectedConsumerId
                            ? 'consumer-option active'
                            : 'consumer-option'
                        }
                        type="button"
                        key={consumer.id}
                        onClick={() => {
                          const consumerType = consumerTypeById.get(
                            consumer.consumer_type_id,
                          )
                          const supportsEndOfMonth =
                            consumerType?.code === 'STUDENT' ||
                            consumerType?.code === 'TEACHER'

                          setSelectedConsumerId(consumer.id)
                          if (!supportsEndOfMonth) {
                            setOrderPaymentType('IMMEDIATE')
                          }
                        }}
                      >
                        <strong>
                          {consumer.last_names}, {consumer.first_names}
                        </strong>
                      <span>{consumer.grade_section ?? 'Sin grado/sección'}</span>
                      </button>
                    ))
                  )}
                </div>
              </section>
            ) : (
              <>
                <p className="selected-consumer">
                  Reserva para {profile.full_name}
                  {normalizedUserEmail ? ` (${normalizedUserEmail})` : ''}
                </p>
                <div className="payment-group" aria-label="Tipo de pago del pedido">
                  {orderPaymentTypes.map((type) => (
                    <button
                      className={
                        type === effectiveOrderPaymentType
                          ? 'segment active'
                          : 'segment'
                      }
                      key={type}
                      type="button"
                      onClick={() => setOrderPaymentType(type)}
                    >
                      {orderPaymentTypeLabels[type]}
                    </button>
                  ))}
                </div>
              </>
            )}

            <section className="panel flat-panel" aria-labelledby="products-order-title">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Productos</p>
                  <h2 id="products-order-title">Armar pedido</h2>
                </div>
              </div>

              {!isSelfService && selectedConsumer ? (
                <>
                  <p className="selected-consumer">
                    Para {selectedConsumer.first_names} {selectedConsumer.last_names}
                  </p>
                  <div className="payment-group" aria-label="Tipo de pago del pedido">
                    {orderPaymentTypes.map((type) => {
                      const disabled = type === 'END_OF_MONTH' && !canUseEndOfMonth

                      return (
                        <button
                          className={
                            type === effectiveOrderPaymentType
                              ? 'segment active'
                              : 'segment'
                          }
                          key={type}
                          type="button"
                          disabled={disabled}
                          onClick={() => setOrderPaymentType(type)}
                        >
                          {orderPaymentTypeLabels[type]}
                        </button>
                      )
                    })}
                  </div>
                  {!canUseEndOfMonth ? (
                    <p className="permission-banner">
                      El crédito mensual solo aplica a alumnos y profesores.
                    </p>
                  ) : null}
                </>
              ) : null}

              {!isSelfService && !selectedConsumer ? (
                <p className="permission-banner">
                  Selecciona un consumidor registrado en Usuarios.
                </p>
              ) : null}

              <label className="search-box">
                <Search size={18} aria-hidden="true" />
                <input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Buscar producto"
                />
              </label>

              <div className="product-grid compact">
                {filteredProducts.map((product) => {
                  const cartItem = cart.find((item) => item.product.id === product.id)
                  const isSelected = cartItem !== undefined
                  const isOutOfStock = product.available_stock <= 0

                  return (
                    <button
                      className={isSelected ? 'product-tile active' : 'product-tile'}
                      type="button"
                      key={product.id}
                      disabled={isOutOfStock}
                      onClick={() =>
                        setCart((current) => toggleProductInCart(current, product))
                      }
                    >
                      <span>{product.name}</span>
                      <strong>{formatCurrency(product.price)}</strong>
                      <small>
                        {categoryById.get(product.category_id ?? 0) ?? 'Sin categoría'} -{' '}
                        {product.available_stock} disp.
                        {isSelected ? ` · ${cartItem.quantity} en pedido` : ''}
                      </small>
                    </button>
                  )
                })}
              </div>
            </section>
          </div>

          <div className="cart-list">
            {cart.length === 0 ? (
              <p className="empty-state">Agrega productos al pedido.</p>
            ) : (
              cart.map((item) => (
                <article className="cart-row" key={item.product.id}>
                  <div>
                    <strong>{item.product.name}</strong>
                    <span>{formatCurrency(item.product.price)} c/u</span>
                  </div>

                  <div className="quantity-control">
                    <button
                      className="icon-button small"
                      type="button"
                      aria-label={`Restar ${item.product.name}`}
                      onClick={() =>
                        setCart((current) =>
                          current
                            .map((cartItem) =>
                              cartItem.product.id === item.product.id
                                ? { ...cartItem, quantity: cartItem.quantity - 1 }
                                : cartItem,
                            )
                            .filter((cartItem) => cartItem.quantity > 0),
                        )
                      }
                    >
                      <Minus size={16} />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      className="icon-button small"
                      type="button"
                      aria-label={`Sumar ${item.product.name}`}
                      disabled={item.quantity >= item.product.available_stock}
                      onClick={() =>
                        setCart((current) =>
                          increaseCartItemQuantity(current, item.product),
                        )
                      }
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <strong>{formatCurrency(item.quantity * item.product.price)}</strong>
                </article>
              ))
            )}
          </div>

          <label className="field">
            <span>Observaciones</span>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ej. entregar en recreo"
            />
          </label>

          {orderMutation.isError ? (
            <p className="error-message" role="alert">
              No se pudo crear el pedido.
              {orderMutation.error instanceof Error
                ? ` ${orderMutation.error.message}`
                : ''}
            </p>
          ) : null}

          <div className="cart-total">
            <span>Total del pedido</span>
            <strong>{formatCurrency(orderTotal)}</strong>
          </div>

          <div className="modal-actions">
            <button
              className="ghost-button"
              type="button"
              onClick={() => setIsOrderModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={!canCreateOrder || orderMutation.isPending}
              onClick={() => orderMutation.mutate()}
            >
              {orderMutation.isPending
                ? 'Registrando...'
                : isSelfService
                  ? 'Reservar pedido'
                  : 'Registrar pedido'}
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  )
}
