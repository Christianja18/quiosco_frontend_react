import type { OrderPaymentType, PaymentMethod } from '../types/domain'

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(value)

export const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  yape: 'Yape',
  plin: 'Plin',
  credit: 'Crédito mensual',
}

export const orderPaymentTypeLabels: Record<OrderPaymentType, string> = {
  IMMEDIATE: 'Pago inmediato',
  END_OF_MONTH: 'Fin de mes',
}


