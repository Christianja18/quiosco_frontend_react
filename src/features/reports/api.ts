import { supabase } from '../../shared/lib/supabase'
import type {
  LowStockProduct,
  OrderWithDetails,
  Product,
  Sale,
} from '../../shared/types/domain'

export const getReportSales = async (): Promise<ReadonlyArray<Sale>> => {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const getReportProducts = async (): Promise<ReadonlyArray<Product>> => {
  const { data, error } = await supabase
    .from('products_available')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const getReportLowStock = async (): Promise<
  ReadonlyArray<LowStockProduct>
> => {
  const { data, error } = await supabase
    .from('low_stock_products')
    .select('*')
    .order('available_stock', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const getReportOrders = async (): Promise<
  ReadonlyArray<OrderWithDetails>
> => {
  const { data, error } = await supabase
    .from('orders_with_details')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    throw new Error(error.message)
  }

  return data
}
