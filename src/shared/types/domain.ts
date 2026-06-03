import type { Database, PaymentMethod } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']
export type Sale = Database['public']['Tables']['sales']['Row']
export type DashboardToday = Database['public']['Views']['dashboard_today']['Row']
export type LowStockProduct = Database['public']['Views']['low_stock_products']['Row']
export type UserRole = Profile['role']

export type CartItem = {
  readonly product: Product
  readonly quantity: number
}

export type SaleItemInput = {
  readonly productId: number
  readonly quantity: number
}

export type { PaymentMethod }
