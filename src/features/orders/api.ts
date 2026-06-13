import { supabase } from '../../shared/lib/supabase'
import type { Json } from '../../shared/types/database'
import type {
  Consumer,
  ConsumerInsert,
  ConsumerType,
  OrderDetail,
  OrderWithDetails,
  PaymentMethod,
  SaleItemInput,
} from '../../shared/types/domain'

export const getConsumerTypes = async (): Promise<
  ReadonlyArray<ConsumerType>
> => {
  const { data, error } = await supabase
    .from('consumer_types')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const getConsumers = async (): Promise<ReadonlyArray<Consumer>> => {
  const { data, error } = await supabase
    .from('consumers')
    .select('*')
    .eq('is_active', true)
    .order('last_names', { ascending: true })
    .order('first_names', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const createConsumer = async (
  consumer: ConsumerInsert,
): Promise<Consumer> => {
  const { data, error } = await supabase
    .from('consumers')
    .insert(consumer)
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const getOrders = async (): Promise<ReadonlyArray<OrderWithDetails>> => {
  const { data, error } = await supabase
    .from('orders_with_details')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const getMyOrders = async (): Promise<ReadonlyArray<OrderWithDetails>> => {
  const { data, error } = await supabase.rpc('my_orders_with_details')

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const getOrderDetails = async (
  orderId: number,
): Promise<ReadonlyArray<OrderDetail>> => {
  const { data, error } = await supabase
    .from('order_details')
    .select('*')
    .eq('order_id', orderId)

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const createOrder = async (
  consumerId: number,
  items: ReadonlyArray<SaleItemInput>,
  notes: string | null,
): Promise<number> => {
  const payload: Json = items.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
  }))

  const { data, error } = await supabase.rpc('create_order', {
    p_consumer_id: consumerId,
    p_items: payload,
    p_notes: notes,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const reserveOrder = async (
  items: ReadonlyArray<SaleItemInput>,
  notes: string | null,
): Promise<number> => {
  const payload: Json = items.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
  }))

  const { data, error } = await supabase.rpc('reserve_order', {
    p_items: payload,
    p_notes: notes,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const completeOrder = async (
  orderId: number,
  paymentMethod: PaymentMethod,
): Promise<number> => {
  const { data, error } = await supabase.rpc('complete_order', {
    p_order_id: orderId,
    p_payment_method: paymentMethod,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const cancelOrder = async (orderId: number): Promise<void> => {
  const { error } = await supabase.rpc('cancel_order', {
    p_order_id: orderId,
  })

  if (error) {
    throw new Error(error.message)
  }
}
