import type {
  ConsumerTypeCode,
  Database,
  OrderStatusCode,
  PaymentMethod,
  UserRole,
} from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type Category = Database['public']['Tables']['categories']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']
export type Sale = Database['public']['Tables']['sales']['Row']
export type ConsumerType = Database['public']['Tables']['consumer_types']['Row']
export type Consumer = Database['public']['Tables']['consumers']['Row']
export type ConsumerInsert = Database['public']['Tables']['consumers']['Insert']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderDetail = Database['public']['Tables']['order_details']['Row']
export type OrderWithDetails = Database['public']['Views']['orders_with_details']['Row']
export type DashboardToday = Database['public']['Views']['dashboard_today']['Row']
export type LowStockProduct = Database['public']['Views']['low_stock_products']['Row']

export type CartItem = {
  readonly product: Product
  readonly quantity: number
}

export type SaleItemInput = {
  readonly productId: number
  readonly quantity: number
}

export type { ConsumerTypeCode, OrderStatusCode, PaymentMethod, UserRole }
