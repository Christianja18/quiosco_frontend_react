import { supabase } from '../../shared/lib/supabase'
import type {
  Category,
  Product,
  ProductInsert,
  ProductRecord,
  ProductUpdate,
} from '../../shared/types/domain'

export const getCategories = async (): Promise<ReadonlyArray<Category>> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const createCategory = async (name: string): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: name.trim() })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const deleteCategory = async (categoryId: number): Promise<void> => {
  const { error } = await supabase.from('categories').delete().eq('id', categoryId)

  if (error) {
    throw new Error(error.message)
  }
}

export const getProducts = async (): Promise<ReadonlyArray<Product>> => {
  const { data, error } = await supabase
    .from('products_available')
    .select('*')
    .order('is_active', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const createProduct = async (
  product: ProductInsert,
): Promise<ProductRecord> => {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const updateProduct = async (
  productId: number,
  product: ProductUpdate,
): Promise<ProductRecord> => {
  const { data, error } = await supabase
    .from('products')
    .update(product)
    .eq('id', productId)
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
