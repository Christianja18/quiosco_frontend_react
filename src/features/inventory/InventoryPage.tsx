import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes, Save, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getProducts, updateProduct } from '../products/api'
import type { Product } from '../../shared/types/domain'

const emptyProducts: ReadonlyArray<Product> = []
const pageSize = 5

type StockForm = {
  readonly productId: string
  readonly stock: string
  readonly minStock: string
}

const initialStockForm: StockForm = {
  productId: '',
  stock: '',
  minStock: '',
}

export const InventoryPage = () => {
  const queryClient = useQueryClient()
  const [stockForm, setStockForm] = useState<StockForm>(initialStockForm)
  const [productSearch, setProductSearch] = useState('')
  const [hasSearchedProduct, setHasSearchedProduct] = useState(false)
  const [lowStockPage, setLowStockPage] = useState(1)

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  })

  const products = productsQuery.data ?? emptyProducts

  const selectedProduct = products.find(
    (product) => product.id === Number(stockForm.productId),
  )

  const normalizedProductSearch = productSearch.trim().toLowerCase()

  const searchResults = useMemo(() => {
    if (!hasSearchedProduct || normalizedProductSearch.length === 0) {
      return []
    }

    return products
      .filter((product) =>
        product.name.toLowerCase().includes(normalizedProductSearch),
      )
      .slice(0, 8)
  }, [hasSearchedProduct, normalizedProductSearch, products])

  const lowStockProducts = products.filter(
    (product) => product.available_stock <= product.min_stock,
  )
  const lowStockPageCount = Math.max(
    1,
    Math.ceil(lowStockProducts.length / pageSize),
  )
  const safeLowStockPage = Math.min(lowStockPage, lowStockPageCount)
  const paginatedLowStockProducts = lowStockProducts.slice(
    (safeLowStockPage - 1) * pageSize,
    safeLowStockPage * pageSize,
  )

  const selectProduct = (product: Product) => {
    setStockForm({
      productId: String(product.id),
      stock: String(product.stock),
      minStock: String(product.min_stock),
    })
    setProductSearch(product.name)
    setHasSearchedProduct(false)
  }

  const stockMutation = useMutation({
    mutationFn: () =>
      updateProduct(Number(stockForm.productId), {
        stock: Number(stockForm.stock),
        min_stock: Number(stockForm.minStock),
      }),
    onSuccess: () => {
      setStockForm(initialStockForm)
      setProductSearch('')
      setHasSearchedProduct(false)
      setLowStockPage(1)
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['low-stock-products'] })
    },
  })

  const canSave =
    Number(stockForm.productId) > 0 &&
    Number(stockForm.stock) >= 0 &&
    Number(stockForm.minStock) >= 1

  return (
    <section className="page-grid" aria-labelledby="inventory-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Inventario</p>
          <h1 id="inventory-title">Stock y alertas</h1>
        </div>
      </div>

      <div className="content-grid two-columns">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Ajuste simple</p>
              <h2>Actualizar stock</h2>
            </div>
            <Boxes size={20} />
          </div>

          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault()
              if (canSave) {
                stockMutation.mutate()
              }
            }}
          >
            <label className="field wide">
              <span>Buscar producto</span>
              <span className="input-icon">
                <Search size={18} />
                <input
                  type="search"
                  value={productSearch}
                  placeholder="Escribe el nombre del producto"
                  onChange={(event) => {
                    setProductSearch(event.target.value)
                    setHasSearchedProduct(false)
                    setStockForm(initialStockForm)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      setHasSearchedProduct(true)
                    }
                  }}
                />
                <button
                  aria-label="Buscar producto"
                  className="password-toggle"
                  title="Buscar producto"
                  type="button"
                  onClick={() => setHasSearchedProduct(true)}
                >
                  <Search size={18} />
                </button>
              </span>
            </label>

            {hasSearchedProduct ? (
              <div className="consumer-list wide">
                {searchResults.length > 0 ? (
                  searchResults.map((product) => (
                    <button
                      className="consumer-option"
                      key={product.id}
                      type="button"
                      onClick={() => selectProduct(product)}
                    >
                      <strong>{product.name}</strong>
                      <span>
                        Stock: {product.stock} | Disponible:{' '}
                        {product.available_stock}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="empty-state">No hay productos con ese nombre.</p>
                )}
              </div>
            ) : null}

            <label className="field wide">
              <span>Producto seleccionado</span>
              <input
                readOnly
                value={selectedProduct?.name ?? ''}
                placeholder="Selecciona un producto desde la búsqueda"
              />
            </label>

            <label className="field">
              <span>Stock actual</span>
              <input
                min="0"
                step="1"
                type="number"
                value={stockForm.stock}
                disabled={!selectedProduct}
                onChange={(event) =>
                  setStockForm((current) => ({
                    ...current,
                    stock: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Stock mínimo</span>
              <input
                min="1"
                step="1"
                type="number"
                value={stockForm.minStock}
                disabled={!selectedProduct}
                onChange={(event) =>
                  setStockForm((current) => ({
                    ...current,
                    minStock: event.target.value,
                  }))
                }
              />
            </label>

            {selectedProduct ? (
              <p className="empty-state wide">
                Ajuste para {selectedProduct.name}. La base actual no guarda
                historial de movimientos; solo actualiza el stock vigente.
              </p>
            ) : null}

            <button
              className="primary-button wide"
              type="submit"
              disabled={!canSave || stockMutation.isPending}
            >
              <Save size={18} />
              {stockMutation.isPending ? 'Guardando...' : 'Guardar ajuste'}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Control</p>
              <h2>Productos bajo mínimo</h2>
            </div>
          </div>

          {productsQuery.isLoading ? (
            <p className="muted">Cargando productos...</p>
          ) : (
            <>
              <div className="list-stack">
                {paginatedLowStockProducts.length > 0 ? (
                  paginatedLowStockProducts.map((product) => (
                    <article className="list-row" key={product.id}>
                      <div>
                        <strong>{product.name}</strong>
                        <span>Mínimo: {product.min_stock}</span>
                      </div>
                      <span className="stock-pill danger">
                        {product.available_stock}
                      </span>
                    </article>
                  ))
                ) : (
                  <p className="empty-state">No hay productos bajo mínimo.</p>
                )}
              </div>

              {lowStockProducts.length > pageSize ? (
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
            </>
          )}
        </section>
      </div>
    </section>
  )
}
