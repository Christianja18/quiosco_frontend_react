import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes, Save } from 'lucide-react'
import { useState } from 'react'
import { getProducts, updateProduct } from '../products/api'
import type { Product } from '../../shared/types/domain'

const emptyProducts: ReadonlyArray<Product> = []

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

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  })

  const products = productsQuery.data ?? emptyProducts

  const selectedProduct = products.find(
    (product) => product.id === Number(stockForm.productId),
  )

  const stockMutation = useMutation({
    mutationFn: () =>
      updateProduct(Number(stockForm.productId), {
        stock: Number(stockForm.stock),
        min_stock: Number(stockForm.minStock),
      }),
    onSuccess: () => {
      setStockForm(initialStockForm)
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
              <span>Producto</span>
              <select
                value={stockForm.productId}
                onChange={(event) => {
                  const product = products.find(
                    (item) => item.id === Number(event.target.value),
                  )

                  setStockForm({
                    productId: event.target.value,
                    stock: product ? String(product.stock) : '',
                    minStock: product ? String(product.min_stock) : '',
                  })
                }}
              >
                <option value="">Seleccionar producto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Stock actual</span>
              <input
                min="1"
                step="1"
                type="number"
                value={stockForm.stock}
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
                min="0"
                step="1"
                type="number"
                value={stockForm.minStock}
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
            <div className="list-stack">
              {products
                .filter((product) => product.stock <= product.min_stock)
                .map((product) => (
                  <article className="list-row" key={product.id}>
                    <div>
                      <strong>{product.name}</strong>
                      <span>Mínimo: {product.min_stock}</span>
                    </div>
                    <span className="stock-pill danger">{product.stock}</span>
                  </article>
                ))}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
