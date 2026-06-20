import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

type UseAppRealtimeOptions = {
  readonly enabled?: boolean
}

export const useAppRealtime = ({
  enabled = true,
}: UseAppRealtimeOptions = {}) => {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    const channel = supabase
      .channel('app-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['orders'] })
          void queryClient.invalidateQueries({ queryKey: ['order-details'] })
          void queryClient.invalidateQueries({ queryKey: ['account-receivables'] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_details' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['orders'] })
          void queryClient.invalidateQueries({ queryKey: ['order-details'] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'consumers' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['consumers'] })
          void queryClient.invalidateQueries({ queryKey: ['orders'] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['profiles'] })
          void queryClient.invalidateQueries({ queryKey: ['profile'] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['dashboard-today'] })
          void queryClient.invalidateQueries({ queryKey: ['recent-sales'] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'account_receivables' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['account-receivables'] })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [enabled, queryClient])
}
