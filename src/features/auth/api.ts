import { supabase } from '../../shared/lib/supabase'
import type { Profile } from '../../shared/types/domain'

export const signInWithEmail = async (
  email: string,
  password: string,
): Promise<void> => {
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    throw new Error(error.message)
  }
}

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }
}

export const getProfile = async (userId: string): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
