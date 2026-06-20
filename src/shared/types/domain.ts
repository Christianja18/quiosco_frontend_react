import type {
  AccountReceivableStatus,
  ConsumerTypeCode,
  Database,
  OrderStatusCode,
  OrderPaymentType,
  PaymentMethod,
  ReceivablePaymentMethod,
  UserRole,
} from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type Category = Database['public']['Tables']['categories']['Row']
export type Product = Database['public']['Views']['products_available']['Row']
export type ProductRecord = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']
export type Sale = Database['public']['Tables']['sales']['Row']
export type SaleDetail = Database['public']['Tables']['sale_details']['Row']
export type ConsumerType = Database['public']['Tables']['consumer_types']['Row']
export type Consumer = Database['public']['Tables']['consumers']['Row']
export type ConsumerInsert = Database['public']['Tables']['consumers']['Insert']
export type ConsumerUpdate = Database['public']['Tables']['consumers']['Update']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderDetail = Database['public']['Tables']['order_details']['Row']
export type AccountReceivable =
  Database['public']['Tables']['account_receivables']['Row']
export type AccountReceivableDetail =
  Database['public']['Tables']['account_receivable_details']['Row']
export type ReceivablePayment =
  Database['public']['Tables']['receivable_payments']['Row']
export type OrderWithDetails = Database['public']['Views']['orders_with_details']['Row']
export type DashboardToday = Database['public']['Views']['dashboard_today']['Row']
export type LowStockProduct = Database['public']['Views']['low_stock_products']['Row']
export type AccountReceivableWithConsumer =
  Database['public']['Views']['account_receivables_with_consumer']['Row']
export type AccountReceivableDetailWithOrder =
  Database['public']['Views']['account_receivable_details_with_order']['Row']

export type CartItem = {
  readonly product: Product
  readonly quantity: number
}

export type SaleItemInput = {
  readonly productId: number
  readonly quantity: number
}

export type {
  AccountReceivableStatus,
  ConsumerTypeCode,
  OrderPaymentType,
  OrderStatusCode,
  PaymentMethod,
  ReceivablePaymentMethod,
  UserRole,
}
