import { supabase } from '../../shared/lib/supabase'
import type {
  AccountReceivableDetailWithOrder,
  AccountReceivableWithConsumer,
  ReceivablePayment,
  ReceivablePaymentMethod,
} from '../../shared/types/domain'

export const getAccountReceivables = async (): Promise<
  ReadonlyArray<AccountReceivableWithConsumer>
> => {
  const { data, error } = await supabase
    .from('account_receivables_with_consumer')
    .select('*')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })
    .order('last_names', { ascending: true })
    .order('first_names', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const getAccountReceivableDetails = async (
  accountReceivableId: number,
): Promise<ReadonlyArray<AccountReceivableDetailWithOrder>> => {
  const { data, error } = await supabase
    .from('account_receivable_details_with_order')
    .select('*')
    .eq('account_receivable_id', accountReceivableId)
    .order('order_created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const getReceivablePayments = async (
  accountReceivableId: number,
): Promise<ReadonlyArray<ReceivablePayment>> => {
  const { data, error } = await supabase
    .from('receivable_payments')
    .select('*')
    .eq('account_receivable_id', accountReceivableId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const registerReceivablePayment = async (
  accountReceivableId: number,
  amount: number,
  paymentMethod: ReceivablePaymentMethod,
  notes: string | null,
): Promise<number> => {
  const { data, error } = await supabase.rpc('register_receivable_payment', {
    p_account_receivable_id: accountReceivableId,
    p_amount: amount,
    p_payment_method: paymentMethod,
    p_notes: notes,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
