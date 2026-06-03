import { supabase } from '../../shared/lib/supabase'
import type { Json } from '../../shared/types/database'
import type { PaymentMethod, SaleItemInput } from '../../shared/types/domain'

export const registerSale = async (
  items: ReadonlyArray<SaleItemInput>,
  paymentMethod: PaymentMethod,
): Promise<number> => {
  const payload: Json = items.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
  }))

  const { data, error } = await supabase.rpc('register_sale', {
    p_items: payload,
    p_payment_method: paymentMethod,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
