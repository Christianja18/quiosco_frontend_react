import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  ClipboardList,
  Minus,
  Plus,
  Search,
  UserPlus,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../../shared/components/Modal'
import type {
  CartItem,
  Category,
  Consumer,
  ConsumerType,
  OrderStatusCode,
  OrderWithDetails,
  PaymentMethod,
  Product,
  Profile,
} from '../../shared/types/domain'
import {
  formatCurrency,
  formatDateTime,
  paymentMethodLabels,
} from '../../shared/utils/format'
import { getCategories, getProducts } from '../products/api'
import {
  cancelOrder,
  completeOrder,
  createConsumer,
  createOrder,
  getConsumers,
  getConsumerTypes,
  getMyOrders,
  getOrderDetails,
  getOrders,
  reserveOrder,
} from './api'

const emptyProducts: ReadonlyArray<Product> = []
const emptyCategories: ReadonlyArray<Category> = []
const emptyConsumers: ReadonlyArray<Consumer> = []
const emptyConsumerTypes: ReadonlyArray<ConsumerType> = []
const emptyOrders: ReadonlyArray<OrderWithDetails> = []

const paymentMethods: ReadonlyArray<PaymentMethod> = ['cash', 'yape', 'plin']

const statusLabels: Record<OrderStatusCode, string> = {
  PENDING: 'Pendiente',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
}

type ConsumerFormState = {
  readonly consumerTypeId: string
  readonly firstNames: string
  readonly lastNames: string
  readonly documentNumber: string
  readonly gradeSection: string
  readonly phone: string
  readonly email: string
}

const initialConsumerForm: ConsumerFormState = {
  consumerTypeId: '',
  firstNames: '',
  lastNames: '',
  documentNumber: '',
  gradeSection: '',
  phone: '',
  email: '',
}

type OrdersPageProps = {
  readonly profile: Profile
  readonly userEmail: string | null
}

const toNullableText = (value: string): string | null => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const addProductToCart = (
  cart: ReadonlyArray<CartItem>,
  product: Product,
): ReadonlyArray<CartItem> => {
  const existing = cart.find((item) => item.product.id === product.id)

  if (!existing) {
    return [...cart, { product, quantity: 1 }]
  }

  return cart.map((item) =>
    item.product.id === product.id
      ? {
          ...item,
          quantity: item.quantity + 1,
        }
      : item,
  )
}

export const OrdersPage = ({ profile, userEmail }: OrdersPageProps) => {
  const queryClient = useQueryClient()
  const isSelfService = profile.role === 'profesor' || profile.role === 'alumno'
  const canOperate = profile.role === 'admin' || profile.role === 'seller'

  const [orderSearch, setOrderSearch] = useState('')
  const [consumerSearch, setConsumerSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [selectedConsumerId, setSelectedConsumerId] = useState<number | null>(null)
  const [consumerForm, setConsumerForm] =
    useState<ConsumerFormState>(initialConsumerForm)
  const [cart, setCart] = useState<ReadonlyArray<CartItem>>([])
  const [notes, setNotes] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)

  const consumerTypesQuery = useQuery({
    queryKey: ['consumer-types'],
    queryFn: getConsumerTypes,
  })

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

  const ordersQuery = useQuery({
    queryKey: ['orders', isSelfService ? 'mine' : 'all', profile.id],
    queryFn: () => (isSelfService ? getMyOrders() : getOrders()),
  })

  const orderDetailsQuery = useQuery({
    queryKey: ['order-details', selectedOrderId],
    queryFn: () => getOrderDetails(selectedOrderId ?? 0),
    enabled: selectedOrderId !== null,
  })

  const consumerTypes = consumerTypesQuery.data ?? emptyConsumerTypes
  const consumers = consumersQuery.data ?? emptyConsumers
  const products = productsQuery.data ?? emptyProducts
  const categories = categoriesQuery.data ?? emptyCategories
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

  const visibleOrders = useMemo(() => {
    const normalized = orderSearch.trim().toLowerCase()

    if (!normalized) {
      return orders
    }

    return orders.filter((order) =>
      `${order.first_names} ${order.last_names} ${order.status_name} ${order.notes ?? ''}`
        .toLowerCase()
        .includes(normalized),
    )
  }, [orderSearch, orders])

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

    return products.filter((product) => {
      if (!product.is_active) {
        return false
      }

      if (!normalized) {
        return true
      }

      const categoryName = categoryById.get(product.category_id ?? 0) ?? ''
      return `${product.name} ${categoryName}`.toLowerCase().includes(normalized)
    })
  }, [categoryById, productSearch, products])

  const selectedConsumer = isSelfService
    ? undefined
    : consumers.find((consumer) => consumer.id === selectedConsumerId)

  const selectedOrder = visibleOrders.find((order) => order.id === selectedOrderId)

  const orderTotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.product.price,
    0,
  )

  const resetOrderForm = () => {
    setCart([])
    setNotes('')
    setProductSearch('')
    if (!isSelfService) {
      setSelectedConsumerId(null)
    }
  }

  const consumerMutation = useMutation({
    mutationFn: () =>
      createConsumer({
        consumer_type_id: Number(consumerForm.consumerTypeId),
        first_names: consumerForm.firstNames.trim(),
        last_names: consumerForm.lastNames.trim(),
        document_number: toNullableText(consumerForm.documentNumber),
        grade_section: toNullableText(consumerForm.gradeSection),
        phone: toNullableText(consumerForm.phone),
        email: toNullableText(consumerForm.email),
        is_active: true,
      }),
    onSuccess: (consumer) => {
      setConsumerForm(initialConsumerForm)
      setSelectedConsumerId(consumer.id)
      void queryClient.invalidateQueries({ queryKey: ['consumers'] })
    },
  })

  const orderMutation = useMutation({
    mutationFn: () =>
      isSelfService
        ? reserveOrder(
            cart.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
            })),
            toNullableText(notes),
          )
        : createOrder(
            selectedConsumerId ?? 0,
            cart.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
            })),
            toNullableText(notes),
          ),
    onSuccess: () => {
      resetOrderForm()
      setIsOrderModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['consumers'] })
    },
  })

  const completeMutation = useMutation({
    mutationFn: (orderId: number) => completeOrder(orderId, paymentMethod),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-today'] })
      void queryClient.invalidateQueries({ queryKey: ['recent-sales'] })
      void queryClient.invalidateQueries({ queryKey: ['low-stock-products'] })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const canCreateConsumer =
    canOperate &&
    Number(consumerForm.consumerTypeId) > 0 &&
    consumerForm.firstNames.trim().length >= 2 &&
    consumerForm.lastNames.trim().length >= 2

  const canCreateOrder =
    (isSelfService || selectedConsumerId !== null) && cart.length > 0

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
              onChange={(event) => setOrderSearch(event.target.value)}
              placeholder="Buscar pedido"
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
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        #{order.id}
                      </button>
                    </td>
                    <td>
                      {order.first_names} {order.last_names}
                    </td>
                    <td>{order.consumer_type_name}</td>
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
          </div>
        )}
      </section>

      {selectedOrder ? (
        <section className="panel" aria-labelledby="order-detail-title">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Detalle</p>
              <h2 id="order-detail-title">Pedido #{selectedOrder.id}</h2>
            </div>
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
              <div className="payment-group" aria-label="Metodo de pago">
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

              {selectedOrder.status_code === 'PENDING' ? (
                <div className="action-grid">
                  <button
                    className="primary-button"
                    type="button"
                    disabled={completeMutation.isPending}
                    onClick={() => completeMutation.mutate(selectedOrder.id)}
                  >
                    <CheckCircle2 size={18} />
                    Completar venta
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
                <p className="empty-state">Este pedido ya no esta pendiente.</p>
              )}

              {completeMutation.isError || cancelMutation.isError ? (
                <p className="error-message" role="alert">
                  No se pudo actualizar el pedido. Revisa stock o estado.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
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
                    <p className="empty-state">No hay consumidores con ese nombre.</p>
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
                        onClick={() => setSelectedConsumerId(consumer.id)}
                      >
                        <strong>
                          {consumer.last_names}, {consumer.first_names}
                        </strong>
                        <span>{consumer.grade_section ?? 'Sin grado/seccion'}</span>
                      </button>
                    ))
                  )}
                </div>

                <form
                  className="form-grid"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (canCreateConsumer) {
                      consumerMutation.mutate()
                    }
                  }}
                >
                  <label className="field wide">
                    <span>Tipo</span>
                    <select
                      value={consumerForm.consumerTypeId}
                      onChange={(event) =>
                        setConsumerForm((current) => ({
                          ...current,
                          consumerTypeId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Seleccionar</option>
                      {consumerTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Nombres</span>
                    <input
                      value={consumerForm.firstNames}
                      onChange={(event) =>
                        setConsumerForm((current) => ({
                          ...current,
                          firstNames: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Apellidos</span>
                    <input
                      value={consumerForm.lastNames}
                      onChange={(event) =>
                        setConsumerForm((current) => ({
                          ...current,
                          lastNames: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Grado/seccion</span>
                    <input
                      value={consumerForm.gradeSection}
                      onChange={(event) =>
                        setConsumerForm((current) => ({
                          ...current,
                          gradeSection: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Documento</span>
                    <input
                      value={consumerForm.documentNumber}
                      onChange={(event) =>
                        setConsumerForm((current) => ({
                          ...current,
                          documentNumber: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <button
                    className="ghost-button wide"
                    type="submit"
                    disabled={!canCreateConsumer || consumerMutation.isPending}
                  >
                    <UserPlus size={18} />
                    {consumerMutation.isPending ? 'Guardando...' : 'Crear consumidor'}
                  </button>
                </form>
              </section>
            ) : (
              <p className="selected-consumer">
                Reserva para {profile.full_name}
                {normalizedUserEmail ? ` (${normalizedUserEmail})` : ''}
              </p>
            )}

            <section className="panel flat-panel" aria-labelledby="products-order-title">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Productos</p>
                  <h2 id="products-order-title">Armar pedido</h2>
                </div>
              </div>

              {!isSelfService && selectedConsumer ? (
                <p className="selected-consumer">
                  Para {selectedConsumer.first_names} {selectedConsumer.last_names}
                </p>
              ) : null}

              {!isSelfService && !selectedConsumer ? (
                <p className="permission-banner">Selecciona o crea un consumidor.</p>
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
                {filteredProducts.map((product) => (
                  <button
                    className="product-tile"
                    type="button"
                    key={product.id}
                    onClick={() =>
                      setCart((current) => addProductToCart(current, product))
                    }
                  >
                    <span>{product.name}</span>
                    <strong>{formatCurrency(product.price)}</strong>
                    <small>
                      {categoryById.get(product.category_id ?? 0) ?? 'Sin categoria'} -{' '}
                      {product.stock} disp.
                    </small>
                  </button>
                ))}
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
                      onClick={() =>
                        setCart((current) => addProductToCart(current, item.product))
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
