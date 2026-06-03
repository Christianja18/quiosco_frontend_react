import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../shared/lib/supabase'

type AuthState =
  | { readonly status: 'loading'; readonly session: null }
  | { readonly status: 'authenticated'; readonly session: Session }
  | { readonly status: 'anonymous'; readonly session: null }

export const useAuth = (): AuthState => {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    session: null,
  })

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return
      }

      setState(
        data.session
          ? { status: 'authenticated', session: data.session }
          : { status: 'anonymous', session: null },
      )
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(
        session
          ? { status: 'authenticated', session }
          : { status: 'anonymous', session: null },
      )
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  return state
}
