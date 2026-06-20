import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

type UseProductsRealtimeOptions = {
  readonly enabled?: boolean
}

export const useProductsRealtime = ({
  enabled = true,
}: UseProductsRealtimeOptions = {}) => {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    const channel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['products'] })
          void queryClient.invalidateQueries({ queryKey: ['low-stock-products'] })
          void queryClient.invalidateQueries({ queryKey: ['report-products'] })
          void queryClient.invalidateQueries({ queryKey: ['report-low-stock'] })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [enabled, queryClient])
}
