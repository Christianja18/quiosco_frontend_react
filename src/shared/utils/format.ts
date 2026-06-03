import type { PaymentMethod } from '../types/domain'

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
  card: 'Tarjeta',
  yape: 'Yape',
  plin: 'Plin',
  transfer: 'Transferencia',
}
