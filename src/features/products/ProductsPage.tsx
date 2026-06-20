import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, CirclePlus, Package, Pencil, Power, Save, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../../shared/components/Modal'
import type { Category, Product, Profile } from '../../shared/types/domain'
import { formatCurrency } from '../../shared/utils/format'
import {
  createCategory,
  createProduct,
  getCategories,
  getProducts,
  updateProduct,
} from './api'

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
  minStock: '1',
}

const emptyCategories: ReadonlyArray<Category> = []
const emptyProducts: ReadonlyArray<Product> = []
const pageSize = 5

type ProductsPageProps = {
  readonly profile: Profile
}

export const ProductsPage = ({ profile }: ProductsPageProps) => {
  const queryClient = useQueryClient()
  const isAdmin = profile.role === 'admin'
  const [categoryName, setCategoryName] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [productPage, setProductPage] = useState(1)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
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

  const filteredProducts = useMemo(() => {
    const normalized = productSearch.trim().toLowerCase()

    if (!normalized) {
      return products
    }

    return products.filter((product) => {
      const categoryName = categoryById.get(product.category_id ?? 0) ?? ''
      return `${product.name} ${categoryName}`.toLowerCase().includes(normalized)
    })
  }, [categoryById, productSearch, products])

  const productPageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const safeProductPage = Math.min(productPage, productPageCount)
  const paginatedProducts = filteredProducts.slice(
    (safeProductPage - 1) * pageSize,
    safeProductPage * pageSize,
  )

  const categoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      setCategoryName('')
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const saveProductMutation = useMutation({
    mutationFn: () => {
      if (editingProductId === null) {
        return createProduct({
          name: productForm.name.trim(),
          category_id: productForm.categoryId
            ? Number(productForm.categoryId)
            : null,
          price: Number(productForm.price),
          stock: Number(productForm.stock),
          min_stock: Number(productForm.minStock),
          is_active: true,
        })
      }

      return updateProduct(editingProductId, {
        name: productForm.name.trim(),
        category_id: productForm.categoryId
          ? Number(productForm.categoryId)
          : null,
        price: Number(productForm.price),
        stock: Number(productForm.stock),
        min_stock: Number(productForm.minStock),
      })
    },
    onSuccess: () => {
      setProductForm(initialProductForm)
      setEditingProductId(null)
      setIsProductModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['low-stock-products'] })
    },
  })

  const productStatusMutation = useMutation({
    mutationFn: ({
      productId,
      isActive,
    }: {
      readonly productId: number
      readonly isActive: boolean
    }) => updateProduct(productId, { is_active: isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['low-stock-products'] })
    },
  })

  const openNewProductModal = () => {
    setEditingProductId(null)
    setProductForm(initialProductForm)
    saveProductMutation.reset()
    setIsProductModalOpen(true)
  }

  const openEditProductModal = (product: Product) => {
    setEditingProductId(product.id)
    setProductForm({
      name: product.name,
      categoryId: product.category_id ? String(product.category_id) : '',
      price: String(product.price),
      stock: String(product.stock),
      minStock: String(product.min_stock),
    })
    saveProductMutation.reset()
    setIsProductModalOpen(true)
  }

  const closeProductModal = () => {
    setIsProductModalOpen(false)
    setEditingProductId(null)
    setProductForm(initialProductForm)
    saveProductMutation.reset()
  }

  const canCreateCategory = isAdmin && categoryName.trim().length >= 2
  const canCreateProduct =
    isAdmin &&
    productForm.name.trim().length >= 2 &&
    Number(productForm.price) > 0 &&
    Number(productForm.stock) >= 0 &&
    Number(productForm.minStock) >= 1

  return (
    <section className="page-grid" aria-labelledby="products-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h1 id="products-title">Productos y categorías</h1>
        </div>
        {isAdmin ? (
          <div className="page-actions">
            <button
              className="primary-button"
              type="button"
              onClick={openNewProductModal}
            >
              <Package size={18} />
              Registrar producto
            </button>
          </div>
        ) : null}
      </div>

      {!isAdmin ? (
        <p className="permission-banner">
          Tu rol permite consultar productos. La creación y edición está reservada
          para administradores.
        </p>
      ) : null}

      <section className="panel" aria-labelledby="products-list-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Listado</p>
            <h2 id="products-list-title">Productos registrados</h2>
          </div>
        </div>

        <div className="list-toolbar">
          <label className="search-box">
            <Search size={18} aria-hidden="true" />
            <input
              value={productSearch}
              onChange={(event) => {
                setProductSearch(event.target.value)
                setProductPage(1)
              }}
              placeholder="Buscar producto"
            />
          </label>
        </div>

        {productsQuery.isLoading ? (
          <p className="muted">Cargando productos...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="empty-state">No hay productos para mostrar.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Disponible</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{categoryById.get(product.category_id ?? 0) ?? 'Sin categoría'}</td>
                    <td>{formatCurrency(product.price)}</td>
                    <td>
                      <span
                        className={
                          product.available_stock <= product.min_stock
                            ? 'stock-pill danger'
                            : 'stock-pill'
                        }
                      >
                        {product.available_stock}
                      </span>
                    </td>
                    <td>
                      <span className={product.is_active ? 'status ok' : 'status off'}>
                        {product.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          aria-label="Editar producto"
                          className="icon-button small"
                          title="Editar producto"
                          type="button"
                          disabled={!isAdmin || saveProductMutation.isPending}
                          onClick={() => openEditProductModal(product)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          aria-label={
                            product.is_active ? 'Desactivar producto' : 'Activar producto'
                          }
                          className="icon-button small danger"
                          title={product.is_active ? 'Desactivar producto' : 'Activar producto'}
                          type="button"
                          disabled={!isAdmin || productStatusMutation.isPending}
                          onClick={() =>
                            productStatusMutation.mutate({
                              productId: product.id,
                              isActive: !product.is_active,
                            })
                          }
                        >
                          <Power size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination-bar">
              <span>
                Página {safeProductPage} de {productPageCount}
              </span>
              <button
                className="ghost-button"
                type="button"
                disabled={safeProductPage === 1}
                onClick={() => setProductPage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={safeProductPage === productPageCount}
                onClick={() =>
                  setProductPage((current) =>
                    Math.min(productPageCount, current + 1),
                  )
                }
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </section>

      {isProductModalOpen ? (
        <Modal
          eyebrow={editingProductId === null ? 'Registro' : 'Edición'}
          title={editingProductId === null ? 'Nuevo producto' : 'Editar producto'}
          onClose={closeProductModal}
        >
          <div className="content-grid two-columns">
            <section className="panel flat-panel" aria-labelledby="new-product-title">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Producto</p>
                  <h2 id="new-product-title">Datos del producto</h2>
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

                  saveProductMutation.mutate()
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
                    placeholder="Cupcake de vainilla"
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
                  />
                </label>

                <label className="field">
                  <span>Stock mínimo</span>
                  <input
                    min="1"
                    step="1"
                    type="number"
                    value={productForm.minStock}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        minStock: event.target.value,
                      }))
                    }
                  />
                </label>

                <button
                  className="primary-button wide"
                  type="submit"
                  disabled={!canCreateProduct || saveProductMutation.isPending}
                >
                  <Save size={18} />
                  {saveProductMutation.isPending
                    ? 'Guardando...'
                    : editingProductId === null
                      ? 'Guardar producto'
                      : 'Guardar cambios'}
                </button>
              </form>
            </section>

            <section className="panel flat-panel" aria-labelledby="new-category-title">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Agrupación</p>
                  <h2 id="new-category-title">Categoría nueva</h2>
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
                    placeholder="Dulces"
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
        </Modal>
      ) : null}
    </section>
  )
}
