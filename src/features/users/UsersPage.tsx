import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Search, UserPlus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../../shared/components/Modal'
import type { Profile, UserRole } from '../../shared/types/domain'
import { formatDateTime } from '../../shared/utils/format'
import { createAuthUser, getProfiles, setProfileRole } from './api'

const emptyProfiles: ReadonlyArray<Profile> = []

const roleOptions: ReadonlyArray<{
  readonly value: UserRole
  readonly label: string
}> = [
  { value: 'admin', label: 'Administrador' },
  { value: 'seller', label: 'Vendedor' },
  { value: 'profesor', label: 'Profesor' },
  { value: 'alumno', label: 'Alumno' },
]

type UserFormState = {
  readonly fullName: string
  readonly email: string
  readonly password: string
  readonly role: UserRole
}

const initialUserForm: UserFormState = {
  fullName: '',
  email: '',
  password: '',
  role: 'seller',
}

type UsersPageProps = {
  readonly profile: Profile
}

export const UsersPage = ({ profile }: UsersPageProps) => {
  const queryClient = useQueryClient()
  const isAdmin = profile.role === 'admin'
  const [userSearch, setUserSearch] = useState('')
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [userForm, setUserForm] = useState<UserFormState>(initialUserForm)

  const profilesQuery = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfiles,
    enabled: isAdmin,
  })

  const roleMutation = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      readonly userId: string
      readonly role: UserRole
    }) => setProfileRole(userId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profiles'] })
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  const createUserMutation = useMutation({
    mutationFn: () =>
      createAuthUser({
        email: userForm.email.trim(),
        password: userForm.password,
        fullName: userForm.fullName.trim(),
        role: userForm.role,
      }),
    onSuccess: () => {
      setUserForm(initialUserForm)
      setIsUserModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
  })

  const profiles = profilesQuery.data ?? emptyProfiles

  const filteredProfiles = useMemo(() => {
    const normalized = userSearch.trim().toLowerCase()

    if (!normalized) {
      return profiles
    }

    return profiles.filter((userProfile) =>
      `${userProfile.full_name} ${userProfile.role}`
        .toLowerCase()
        .includes(normalized),
    )
  }, [profiles, userSearch])

  const canCreateUser =
    isAdmin &&
    userForm.fullName.trim().length >= 2 &&
    userForm.email.trim().length >= 5 &&
    userForm.password.length >= 6

  return (
    <section className="page-grid" aria-labelledby="users-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Acceso</p>
          <h1 id="users-title">Usuarios y roles</h1>
        </div>
        {isAdmin ? (
          <div className="page-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => setIsUserModalOpen(true)}
            >
              <UserPlus size={18} />
              Registrar usuario
            </button>
          </div>
        ) : null}
      </div>

      {!isAdmin ? (
        <p className="permission-banner">
          Solo administradores pueden consultar usuarios y cambiar roles.
        </p>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Listado</p>
            <h2>Perfiles registrados</h2>
          </div>
          <Users size={20} />
        </div>

        <div className="list-toolbar">
          <label className="search-box">
            <Search size={18} aria-hidden="true" />
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Buscar usuario"
              disabled={!isAdmin}
            />
          </label>
        </div>

        {profilesQuery.isLoading ? (
          <p className="muted">Cargando usuarios...</p>
        ) : filteredProfiles.length === 0 ? (
          <p className="empty-state">No hay perfiles visibles para tu rol.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Creado</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map((userProfile) => (
                  <tr key={userProfile.id}>
                    <td>{userProfile.full_name}</td>
                    <td>
                      <span className="role-badge">{userProfile.role}</span>
                    </td>
                    <td>{formatDateTime(userProfile.created_at)}</td>
                    <td>
                      <label className="table-select-label">
                        <span className="sr-only">Cambiar rol</span>
                        <select
                          className="table-select"
                          value={userProfile.role}
                          disabled={
                            roleMutation.isPending || userProfile.id === profile.id
                          }
                          onChange={(event) => {
                            const selectedRole = roleOptions.find(
                              (option) => option.value === event.target.value,
                            )?.value

                            if (!selectedRole) {
                              return
                            }

                            roleMutation.mutate({
                              userId: userProfile.id,
                              role: selectedRole,
                            })
                          }}
                        >
                          {roleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isUserModalOpen ? (
        <Modal
          eyebrow="Registro"
          title="Nuevo usuario"
          onClose={() => setIsUserModalOpen(false)}
        >
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault()
              if (canCreateUser) {
                createUserMutation.mutate()
              }
            }}
          >
            <label className="field wide">
              <span>Nombre completo</span>
              <input
                value={userForm.fullName}
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                placeholder="Nombre y apellido"
              />
            </label>

            <label className="field">
              <span>Correo</span>
              <input
                autoComplete="off"
                inputMode="email"
                type="email"
                value={userForm.email}
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="usuario@correo.com"
              />
            </label>

            <label className="field">
              <span>Contrasena inicial</span>
              <input
                autoComplete="new-password"
                type="password"
                value={userForm.password}
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder="Minimo 6 caracteres"
              />
            </label>

            <label className="field wide">
              <span>Rol</span>
              <select
                value={userForm.role}
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    role: event.target.value as UserRole,
                  }))
                }
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {createUserMutation.isError ? (
              <p className="error-message wide" role="alert">
                No se pudo registrar el usuario. Verifica el correo o la
                configuracion de Auth.
              </p>
            ) : null}

            <div className="modal-actions wide">
              <button
                className="ghost-button"
                type="button"
                onClick={() => setIsUserModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={!canCreateUser || createUserMutation.isPending}
              >
                <Save size={18} />
                {createUserMutation.isPending ? 'Registrando...' : 'Guardar usuario'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  )
}
