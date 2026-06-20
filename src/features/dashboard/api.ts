import { supabase } from '../../shared/lib/supabase'
import type {
  DashboardToday,
  LowStockProduct,
  OrderWithDetails,
  Sale,
  SaleDetail,
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
    .order('available_stock', { ascending: true })
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
    .limit(200)

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export type SaleDetailItem = SaleDetail & {
  readonly product_name: string | null
}

export type SaleDetailSummary = {
  readonly sale: Sale
  readonly order: OrderWithDetails | null
  readonly items: ReadonlyArray<SaleDetailItem>
}

export const getSaleDetail = async (
  saleId: number,
): Promise<SaleDetailSummary> => {
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select('*')
    .eq('id', saleId)
    .single()

  if (saleError) {
    throw new Error(saleError.message)
  }

  const { data: saleDetails, error: detailError } = await supabase
    .from('sale_details')
    .select('id, sale_id, product_id, quantity, unit_price, subtotal, products(name)')
    .eq('sale_id', saleId)
    .order('id', { ascending: true })

  if (detailError) {
    throw new Error(detailError.message)
  }

  let order: OrderWithDetails | null = null

  if (sale.order_id !== null) {
    const { data: orderData, error: orderError } = await supabase
      .from('orders_with_details')
      .select('*')
      .eq('id', sale.order_id)
      .maybeSingle()

    if (orderError) {
      throw new Error(orderError.message)
    }

    order = orderData
  }

  const items: ReadonlyArray<SaleDetailItem> = (saleDetails ?? []).map(
    (detail) => ({
      id: detail.id,
      sale_id: detail.sale_id,
      product_id: detail.product_id,
      quantity: detail.quantity,
      unit_price: detail.unit_price,
      subtotal: detail.subtotal,
      product_name:
        detail.products &&
        typeof detail.products === 'object' &&
        'name' in detail.products
          ? String(detail.products.name)
          : null,
    }),
  )

  return {
    sale,
    order,
    items,
  }
}
