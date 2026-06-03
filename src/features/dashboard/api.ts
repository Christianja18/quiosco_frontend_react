import { supabase } from '../../shared/lib/supabase'
import type {
  DashboardToday,
  LowStockProduct,
  Sale,
} from '../../shared/types/domain'

export const getDashboardToday = async (): Promise<DashboardToday> => {
  const { data, error } = await supabase
    .from('dashboard_today')
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const getLowStockProducts = async (): Promise<
  ReadonlyArray<LowStockProduct>
> => {
  const { data, error } = await supabase
    .from('low_stock_products')
    .select('*')
    .order('stock', { ascending: true })
    .limit(8)

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const getRecentSales = async (): Promise<ReadonlyArray<Sale>> => {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(8)

  if (error) {
    throw new Error(error.message)
  }

  return data
}
