import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Minus, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getCategories, getProducts } from '../products/api'
import { registerSale } from './api'
import { formatCurrency, paymentMethodLabels } from '../../shared/utils/format'
import type {
  CartItem,
  Category,
  PaymentMethod,
  Product,
} from '../../shared/types/domain'

const paymentMethods: ReadonlyArray<PaymentMethod> = [
  'cash',
  'yape',
  'plin',
]

const emptyProducts: ReadonlyArray<Product> = []
const emptyCategories: ReadonlyArray<Category> = []

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
          quantity: Math.min(item.quantity + 1, product.stock),
        }
      : item,
  )
}

export const SalesPage = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [cart, setCart] = useState<ReadonlyArray<CartItem>>([])

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const products = productsQuery.data ?? emptyProducts
  const categories = categoriesQuery.data ?? emptyCategories

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  const availableProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return products.filter((product) => {
      if (!product.is_active || product.stock <= 0) {
        return false
      }

      if (normalizedSearch.length === 0) {
        return true
      }

      const categoryName = categoryById.get(product.category_id ?? 0) ?? ''

      return `${product.name} ${categoryName}`
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [categoryById, products, search])

  const total = cart.reduce(
    (sum, item) => sum + item.quantity * item.product.price,
    0,
  )

  const saleMutation = useMutation({
    mutationFn: () =>
      registerSale(
        cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        paymentMethod,
      ),
    onSuccess: () => {
      setCart([])
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-today'] })
      void queryClient.invalidateQueries({ queryKey: ['low-stock-products'] })
      void queryClient.invalidateQueries({ queryKey: ['recent-sales'] })
    },
  })

  useEffect(() => {
    if (!saleMutation.isError && !saleMutation.isSuccess) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => saleMutation.reset(), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [saleMutation])

  return (
    <section className="sales-layout" aria-labelledby="sales-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Punto de venta</p>
          <h1 id="sales-title">Venta rápida</h1>
        </div>
      </div>

      <section className="panel product-picker" aria-labelledby="products-for-sale">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Productos disponibles</p>
            <h2 id="products-for-sale">Seleccionar productos</h2>
          </div>
        </div>

        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por producto o categoría"
          />
        </label>

        {productsQuery.isLoading ? (
          <p className="muted">Cargando productos...</p>
        ) : availableProducts.length === 0 ? (
          <p className="empty-state">No hay productos activos con stock para vender.</p>
        ) : (
          <div className="product-grid">
            {availableProducts.map((product) => (
              <button
                className="product-tile"
                type="button"
                key={product.id}
                onClick={() => setCart((current) => addProductToCart(current, product))}
              >
                <span>{product.name}</span>
                <strong>{formatCurrency(product.price)}</strong>
                <small>
                  {categoryById.get(product.category_id ?? 0) ?? 'Sin categoría'} ·{' '}
                  {product.stock} disp.
                </small>
              </button>
            ))}
          </div>
        )}
      </section>

      <aside className="panel cart-panel" aria-labelledby="cart-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Carrito</p>
            <h2 id="cart-title">Detalle de venta</h2>
          </div>
          <ShoppingCart size={20} />
        </div>

        {cart.length === 0 ? (
          <p className="empty-state">Agrega productos para iniciar una venta.</p>
        ) : (
          <div className="cart-list">
            {cart.map((item) => (
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
                              ? {
                                  ...cartItem,
                                  quantity: cartItem.quantity - 1,
                                }
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
                    disabled={item.quantity >= item.product.stock}
                    onClick={() =>
                      setCart((current) => addProductToCart(current, item.product))
                    }
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <strong>{formatCurrency(item.quantity * item.product.price)}</strong>
              </article>
            ))}
          </div>
        )}

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

        {saleMutation.isError ? (
          <p className="error-message" role="alert">
            No se pudo registrar la venta. Revisa stock y sesión.
          </p>
        ) : null}

        {saleMutation.isSuccess ? (
          <p className="success-message" role="status">
            Venta registrada correctamente.
          </p>
        ) : null}

        <div className="cart-total">
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </div>

        <button
          className="primary-button"
          type="button"
          disabled={cart.length === 0 || saleMutation.isPending}
          onClick={() => saleMutation.mutate()}
        >
          {saleMutation.isPending ? 'Registrando...' : 'Cobrar venta'}
        </button>

        <button
          className="ghost-button"
          type="button"
          disabled={cart.length === 0 || saleMutation.isPending}
          onClick={() => setCart([])}
        >
          <Trash2 size={18} />
          Vaciar carrito
        </button>
      </aside>
    </section>
  )
}
