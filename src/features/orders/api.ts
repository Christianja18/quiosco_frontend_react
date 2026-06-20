import { supabase } from '../../shared/lib/supabase'
import type { Json } from '../../shared/types/database'
import type {
  Consumer,
  ConsumerInsert,
  ConsumerType,
  ConsumerUpdate,
  OrderDetail,
  OrderPaymentType,
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

export const updateConsumer = async (
  consumerId: number,
  consumer: ConsumerUpdate,
): Promise<Consumer> => {
  const { data, error } = await supabase
    .from('consumers')
    .update(consumer)
    .eq('id', consumerId)
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const deactivateConsumer = async (consumerId: number): Promise<void> => {
  const { error } = await supabase
    .from('consumers')
    .update({
      is_active: false,
      user_id: null,
      document_number: null,
      phone: null,
      email: null,
    })
    .eq('id', consumerId)

  if (error) {
    throw new Error(error.message)
  }
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
  paymentType: OrderPaymentType,
): Promise<number> => {
  const payload: Json = items.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
  }))

  const { data, error } = await supabase.rpc('create_order', {
    p_consumer_id: consumerId,
    p_items: payload,
    p_notes: notes,
    p_payment_type: paymentType,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const reserveOrder = async (
  items: ReadonlyArray<SaleItemInput>,
  notes: string | null,
  paymentType: OrderPaymentType,
): Promise<number> => {
  const payload: Json = items.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
  }))

  const { data, error } = await supabase.rpc('reserve_order', {
    p_items: payload,
    p_notes: notes,
    p_payment_type: paymentType,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const completeOrder = async (
  orderId: number,
  paymentMethod: PaymentMethod | null,
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

export const updateOrderPaymentType = async (
  orderId: number,
  paymentType: OrderPaymentType,
): Promise<void> => {
  const { error } = await supabase.rpc('update_order_payment_type', {
    p_order_id: orderId,
    p_payment_type: paymentType,
  })

  if (error) {
    throw new Error(error.message)
  }
}
