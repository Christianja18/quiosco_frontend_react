import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../shared/lib/supabase'
import { env } from '../../shared/config/env'
import type { Database } from '../../shared/types/database'
import type { Profile, UserRole } from '../../shared/types/domain'

type OperationalRole = Extract<UserRole, 'admin' | 'seller'>

export const getProfiles = async (): Promise<ReadonlyArray<Profile>> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['admin', 'seller'])
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const setProfileRole = async (
  userId: string,
  role: OperationalRole,
): Promise<void> => {
  const { error } = await supabase.rpc('set_profile_role', {
    p_user_id: userId,
    p_role: role,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export const updateProfileUser = async ({
  userId,
  fullName,
  role,
}: {
  readonly userId: string
  readonly fullName: string
  readonly role: OperationalRole
}): Promise<void> => {
  const { error } = await supabase.rpc('update_profile_user', {
    p_user_id: userId,
    p_full_name: fullName,
    p_role: role,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export const deleteProfileUser = async (userId: string): Promise<void> => {
  const { error } = await supabase.rpc('delete_profile_user', {
    p_user_id: userId,
  })

  if (error) {
    throw new Error(error.message)
  }
}

type CreateUserInput = {
  readonly email: string
  readonly password: string
  readonly fullName: string
  readonly role: OperationalRole
}

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })

export const createAuthUser = async ({
  email,
  password,
  fullName,
  role,
}: CreateUserInput): Promise<void> => {
  const authClient = createClient<Database>(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
        storageKey: 'tortas-gaby-admin-user-create-auth',
      },
    },
  )

  const { data, error } = await authClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  const userId = data.user?.id

  if (!userId) {
    throw new Error('No se pudo obtener el usuario creado')
  }

  let lastError: unknown

  for (const delay of [0, 350, 800]) {
    if (delay > 0) {
      await wait(delay)
    }

    try {
      await setProfileRole(userId, role)
      return
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('No se pudo asignar el rol del usuario')
}
