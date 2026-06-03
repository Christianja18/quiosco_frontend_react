import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, CirclePlus, Package, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  createCategory,
  createProduct,
  getCategories,
  getProducts,
  updateProduct,
} from './api'
import { formatCurrency } from '../../shared/utils/format'
import type { Category, Product, Profile } from '../../shared/types/domain'

type ProductFormState = {
  readonly name: string
  readonly categoryId: string
  readonly price: string
  readonly stock: string
  readonly minStock: string
}

const initialProductForm: ProductFormState = {
  name: '',
  categoryId: '',
  price: '',
  stock: '0',
  minStock: '5',
}

const emptyCategories: ReadonlyArray<Category> = []
const emptyProducts: ReadonlyArray<Product> = []

type ProductsPageProps = {
  readonly profile: Profile
}

export const ProductsPage = ({ profile }: ProductsPageProps) => {
  const queryClient = useQueryClient()
  const isAdmin = profile.role === 'admin'
  const [categoryName, setCategoryName] = useState('')
  const [productForm, setProductForm] = useState<ProductFormState>(initialProductForm)

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  })

  const categories = categoriesQuery.data ?? emptyCategories
  const products = productsQuery.data ?? emptyProducts

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  const categoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      setCategoryName('')
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const productMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      setProductForm(initialProductForm)
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['low-stock-products'] })
    },
  })

  const productUpdateMutation = useMutation({
    mutationFn: ({
      productId,
      isActive,
    }: {
      readonly productId: number
      readonly isActive: boolean
    }) => updateProduct(productId, { is_active: isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const canCreateCategory = isAdmin && categoryName.trim().length >= 2
  const canCreateProduct =
    isAdmin &&
    productForm.name.trim().length >= 2 &&
    Number(productForm.price) > 0 &&
    Number(productForm.stock) >= 0 &&
    Number(productForm.minStock) >= 0

  return (
    <section className="page-grid" aria-labelledby="products-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h1 id="products-title">Productos y categorías</h1>
        </div>
      </div>

      {!isAdmin ? (
        <p className="permission-banner">
          Tu rol permite consultar productos. La creación y edición está reservada
          para administradores.
        </p>
      ) : null}

      <div className="content-grid two-columns">
        <section className="panel" aria-labelledby="new-product-title">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Nuevo registro</p>
              <h2 id="new-product-title">Crear producto</h2>
            </div>
            <Package size={20} />
          </div>

          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault()
              if (!canCreateProduct) {
                return
              }

              productMutation.mutate({
                name: productForm.name.trim(),
                category_id: productForm.categoryId
                  ? Number(productForm.categoryId)
                  : null,
                price: Number(productForm.price),
                stock: Number(productForm.stock),
                min_stock: Number(productForm.minStock),
                is_active: true,
              })
            }}
          >
            <label className="field wide">
              <span>Nombre</span>
              <input
                value={productForm.name}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Empanada de pollo"
                disabled={!isAdmin}
              />
            </label>

            <label className="field wide">
              <span>Categoría</span>
              <select
                value={productForm.categoryId}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
                disabled={!isAdmin}
              >
                <option value="">Sin categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Precio S/</span>
              <input
                min="0.1"
                step="0.1"
                type="number"
                value={productForm.price}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
                disabled={!isAdmin}
              />
            </label>

            <label className="field">
              <span>Stock</span>
              <input
                min="0"
                step="1"
                type="number"
                value={productForm.stock}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    stock: event.target.value,
                  }))
                }
                disabled={!isAdmin}
              />
            </label>

            <label className="field">
              <span>Stock mínimo</span>
              <input
                min="0"
                step="1"
                type="number"
                value={productForm.minStock}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    minStock: event.target.value,
                  }))
                }
                disabled={!isAdmin}
              />
            </label>

            <button
              className="primary-button wide"
              type="submit"
              disabled={!canCreateProduct || productMutation.isPending}
            >
              <Save size={18} />
              {productMutation.isPending ? 'Guardando...' : 'Guardar producto'}
            </button>
          </form>
        </section>

        <section className="panel" aria-labelledby="new-category-title">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Agrupación</p>
              <h2 id="new-category-title">Crear categoría</h2>
            </div>
            <Archive size={20} />
          </div>

          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault()
              if (canCreateCategory) {
                categoryMutation.mutate(categoryName)
              }
            }}
          >
            <label className="field">
              <span>Nombre</span>
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Bebidas"
                disabled={!isAdmin}
              />
            </label>
            <button
              className="icon-button"
              type="submit"
              disabled={!canCreateCategory || categoryMutation.isPending}
              aria-label="Crear categoría"
              title="Crear categoría"
            >
              <CirclePlus size={20} />
            </button>
          </form>

          <div className="chip-list" aria-label="Categorías registradas">
            {categories.map((category) => (
              <span className="soft-pill" key={category.id}>
                {category.name}
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className="panel" aria-labelledby="products-list-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Inventario simple</p>
            <h2 id="products-list-title">Listado de productos</h2>
          </div>
        </div>

        {productsQuery.isLoading ? (
          <p className="muted">Cargando productos...</p>
        ) : products.length === 0 ? (
          <p className="empty-state">Crea tus primeros productos para vender.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{categoryById.get(product.category_id ?? 0) ?? 'Sin categoría'}</td>
                    <td>{formatCurrency(product.price)}</td>
                    <td>
                      <span
                        className={
                          product.stock <= product.min_stock
                            ? 'stock-pill danger'
                            : 'stock-pill'
                        }
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td>
                      <span className={product.is_active ? 'status ok' : 'status off'}>
                        {product.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        type="button"
                        disabled={!isAdmin || productUpdateMutation.isPending}
                        onClick={() =>
                          productUpdateMutation.mutate({
                            productId: product.id,
                            isActive: !product.is_active,
                          })
                        }
                      >
                        {product.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}
