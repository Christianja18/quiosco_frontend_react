import { createClient } from '@supabase/supabase-js'
import { env } from '../../shared/config/env'
import { supabase } from '../../shared/lib/supabase'
import type { Database } from '../../shared/types/database'
import type { ConsumerInsert, Profile, UserRole } from '../../shared/types/domain'

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

export const registerPublicConsumer = async (
  consumer: ConsumerInsert,
): Promise<void> => {
  const { error } = await supabase.from('consumers').insert(consumer)

  if (error) {
    throw new Error(error.message)
  }
}

type RegisterPublicConsumerAccountInput = {
  readonly consumer: ConsumerInsert
  readonly password: string
  readonly fullName: string
  readonly role: Extract<UserRole, 'profesor' | 'alumno'>
}

export const registerPublicConsumerAccount = async ({
  consumer,
  password,
  fullName,
  role,
}: RegisterPublicConsumerAccountInput): Promise<void> => {
  if (!consumer.email) {
    throw new Error('El correo es obligatorio para crear el acceso')
  }

  const authClient = createClient<Database>(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
        storageKey: 'tortas-gaby-public-register-auth',
      },
    },
  )

  const { data, error: authError } = await authClient.auth.signUp({
    email: consumer.email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
      },
    },
  })

  if (authError) {
    throw new Error(authError.message)
  }

  const userId = data.user?.id

  if (!userId) {
    throw new Error('No se pudo obtener el usuario creado')
  }

  await registerPublicConsumer({
    ...consumer,
    user_id: userId,
  })
}
