import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Search, UserPlus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../../shared/components/Modal'
import type {
  Consumer,
  ConsumerType,
  Profile,
  UserRole,
} from '../../shared/types/domain'
import { formatDateTime } from '../../shared/utils/format'
import { createConsumer, getConsumers, getConsumerTypes } from '../orders/api'
import { createAuthUser, getProfiles, setProfileRole } from './api'

const emptyProfiles: ReadonlyArray<Profile> = []
const emptyConsumers: ReadonlyArray<Consumer> = []
const emptyConsumerTypes: ReadonlyArray<ConsumerType> = []
const pageSize = 5

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

type ConsumerFormState = {
  readonly consumerTypeId: string
  readonly firstNames: string
  readonly lastNames: string
  readonly documentNumber: string
  readonly gradeSection: string
  readonly phone: string
  readonly email: string
}

const initialConsumerForm: ConsumerFormState = {
  consumerTypeId: '',
  firstNames: '',
  lastNames: '',
  documentNumber: '',
  gradeSection: '',
  phone: '',
  email: '',
}

type UsersPageProps = {
  readonly profile: Profile
}

const toNullableText = (value: string): string | null => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const onlyDigits = (value: string, maxLength: number) =>
  value.replace(/\D/g, '').slice(0, maxLength)

export const UsersPage = ({ profile }: UsersPageProps) => {
  const queryClient = useQueryClient()
  const isAdmin = profile.role === 'admin'
  const [userSearch, setUserSearch] = useState('')
  const [consumerSearch, setConsumerSearch] = useState('')
  const [profilePage, setProfilePage] = useState(1)
  const [consumerPage, setConsumerPage] = useState(1)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [isConsumerModalOpen, setIsConsumerModalOpen] = useState(false)
  const [userForm, setUserForm] = useState<UserFormState>(initialUserForm)
  const [consumerForm, setConsumerForm] =
    useState<ConsumerFormState>(initialConsumerForm)

  const profilesQuery = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfiles,
    enabled: isAdmin,
  })

  const consumersQuery = useQuery({
    queryKey: ['consumers'],
    queryFn: getConsumers,
    enabled: isAdmin,
  })

  const consumerTypesQuery = useQuery({
    queryKey: ['consumer-types'],
    queryFn: getConsumerTypes,
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

  const createConsumerMutation = useMutation({
    mutationFn: () => {
      const selectedType = consumerTypes.find(
        (type) => type.id === Number(consumerForm.consumerTypeId),
      )

      return createConsumer({
        consumer_type_id: Number(consumerForm.consumerTypeId),
        first_names: consumerForm.firstNames.trim(),
        last_names: consumerForm.lastNames.trim(),
        document_number: toNullableText(consumerForm.documentNumber),
        grade_section:
          selectedType?.code === 'TEACHER'
            ? null
            : toNullableText(consumerForm.gradeSection),
        phone: toNullableText(consumerForm.phone),
        email: toNullableText(consumerForm.email),
        is_active: true,
      })
    },
    onSuccess: () => {
      setConsumerForm(initialConsumerForm)
      setIsConsumerModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['consumers'] })
    },
  })

  const profiles = profilesQuery.data ?? emptyProfiles
  const consumers = consumersQuery.data ?? emptyConsumers
  const consumerTypes = consumerTypesQuery.data ?? emptyConsumerTypes

  const consumerTypeById = useMemo(
    () => new Map(consumerTypes.map((type) => [type.id, type.name])),
    [consumerTypes],
  )

  const selectedConsumerType = useMemo(
    () =>
      consumerTypes.find(
        (type) => type.id === Number(consumerForm.consumerTypeId),
      ),
    [consumerForm.consumerTypeId, consumerTypes],
  )
  const isTeacherConsumer = selectedConsumerType?.code === 'TEACHER'

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

  const filteredConsumers = useMemo(() => {
    const normalized = consumerSearch.trim().toLowerCase()

    if (!normalized) {
      return consumers
    }

    return consumers.filter((consumer) =>
      `${consumer.first_names} ${consumer.last_names} ${
        consumer.grade_section ?? ''
      } ${consumer.document_number ?? ''} ${consumer.email ?? ''}`
        .toLowerCase()
        .includes(normalized),
    )
  }, [consumerSearch, consumers])

  const profilePageCount = Math.max(1, Math.ceil(filteredProfiles.length / pageSize))
  const consumerPageCount = Math.max(1, Math.ceil(filteredConsumers.length / pageSize))
  const safeProfilePage = Math.min(profilePage, profilePageCount)
  const safeConsumerPage = Math.min(consumerPage, consumerPageCount)
  const paginatedProfiles = filteredProfiles.slice(
    (safeProfilePage - 1) * pageSize,
    safeProfilePage * pageSize,
  )
  const paginatedConsumers = filteredConsumers.slice(
    (safeConsumerPage - 1) * pageSize,
    safeConsumerPage * pageSize,
  )

  const canCreateUser =
    isAdmin &&
    userForm.fullName.trim().length >= 2 &&
    userForm.email.trim().length >= 5 &&
    userForm.password.length >= 6

  const canCreateConsumer =
    isAdmin &&
    Number(consumerForm.consumerTypeId) > 0 &&
    consumerForm.firstNames.trim().length >= 2 &&
    consumerForm.lastNames.trim().length >= 2 &&
    consumerForm.documentNumber.trim().length === 8 &&
    consumerForm.phone.trim().length === 9

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
              className="ghost-button"
              type="button"
              onClick={() => setIsConsumerModalOpen(true)}
            >
              <Users size={18} />
              Registrar consumidor
            </button>
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
              onChange={(event) => {
                setUserSearch(event.target.value)
                setProfilePage(1)
              }}
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
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProfiles.map((userProfile) => (
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
            <div className="pagination-bar">
              <span>
                Página {safeProfilePage} de {profilePageCount}
              </span>
              <button
                className="ghost-button"
                type="button"
                disabled={safeProfilePage === 1}
                onClick={() => setProfilePage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={safeProfilePage === profilePageCount}
                onClick={() =>
                  setProfilePage((current) =>
                    Math.min(profilePageCount, current + 1),
                  )
                }
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Consumidores</p>
            <h2>Alumnos y profesores registrados</h2>
          </div>
          <Users size={20} />
        </div>

        <div className="list-toolbar">
          <label className="search-box">
            <Search size={18} aria-hidden="true" />
            <input
              value={consumerSearch}
              onChange={(event) => {
                setConsumerSearch(event.target.value)
                setConsumerPage(1)
              }}
              placeholder="Buscar consumidor"
              disabled={!isAdmin}
            />
          </label>
        </div>

        {consumersQuery.isLoading ? (
          <p className="muted">Cargando consumidores...</p>
        ) : filteredConsumers.length === 0 ? (
          <p className="empty-state">No hay consumidores registrados.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Grado/sección</th>
                  <th>Documento</th>
                  <th>Contacto</th>
                </tr>
              </thead>
              <tbody>
                {paginatedConsumers.map((consumer) => (
                  <tr key={consumer.id}>
                    <td>
                      {consumer.first_names} {consumer.last_names}
                    </td>
                    <td>
                      {consumerTypeById.get(consumer.consumer_type_id) ??
                        'Sin tipo'}
                    </td>
                    <td>{consumer.grade_section ?? 'Sin grado/sección'}</td>
                    <td>{consumer.document_number ?? '-'}</td>
                    <td>{consumer.email ?? consumer.phone ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination-bar">
              <span>
                Página {safeConsumerPage} de {consumerPageCount}
              </span>
              <button
                className="ghost-button"
                type="button"
                disabled={safeConsumerPage === 1}
                onClick={() => setConsumerPage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={safeConsumerPage === consumerPageCount}
                onClick={() =>
                  setConsumerPage((current) =>
                    Math.min(consumerPageCount, current + 1),
                  )
                }
              >
                Siguiente
              </button>
            </div>
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
              <span>Contraseña inicial</span>
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
                placeholder="Mínimo 6 caracteres"
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
                configuración de Auth.
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

      {isConsumerModalOpen ? (
        <Modal
          eyebrow="Registro"
          title="Nuevo consumidor"
          onClose={() => setIsConsumerModalOpen(false)}
        >
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault()
              if (canCreateConsumer) {
                createConsumerMutation.mutate()
              }
            }}
          >
            <label className="field wide">
              <span>Tipo</span>
              <select
                value={consumerForm.consumerTypeId}
                onChange={(event) =>
                  setConsumerForm((current) => ({
                    ...current,
                    consumerTypeId: event.target.value,
                    gradeSection: '',
                  }))
                }
              >
                <option value="">Seleccionar</option>
                {consumerTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Nombres</span>
              <input
                value={consumerForm.firstNames}
                onChange={(event) =>
                  setConsumerForm((current) => ({
                    ...current,
                    firstNames: event.target.value,
                  }))
                }
                placeholder="Nombres"
              />
            </label>

            <label className="field">
              <span>Apellidos</span>
              <input
                value={consumerForm.lastNames}
                onChange={(event) =>
                  setConsumerForm((current) => ({
                    ...current,
                    lastNames: event.target.value,
                  }))
                }
                placeholder="Apellidos"
              />
            </label>

            {!isTeacherConsumer ? (
              <label className="field">
                <span>Grado/sección</span>
                <input
                  value={consumerForm.gradeSection}
                  onChange={(event) =>
                    setConsumerForm((current) => ({
                      ...current,
                      gradeSection: event.target.value,
                    }))
                  }
                  placeholder="Ej. 3ro A"
                />
              </label>
            ) : null}

            <label className="field">
              <span>DNI</span>
              <input
                inputMode="numeric"
                maxLength={8}
                value={consumerForm.documentNumber}
                onChange={(event) =>
                  setConsumerForm((current) => ({
                    ...current,
                    documentNumber: onlyDigits(event.target.value, 8),
                  }))
                }
                placeholder="8 dígitos"
              />
            </label>

            <label className="field">
              <span>Teléfono</span>
              <input
                inputMode="numeric"
                maxLength={9}
                value={consumerForm.phone}
                onChange={(event) =>
                  setConsumerForm((current) => ({
                    ...current,
                    phone: onlyDigits(event.target.value, 9),
                  }))
                }
                placeholder="9 dígitos"
              />
            </label>

            <label className="field">
              <span>Correo</span>
              <input
                inputMode="email"
                type="email"
                value={consumerForm.email}
                onChange={(event) =>
                  setConsumerForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="correo@dominio.com"
              />
            </label>

            {createConsumerMutation.isError ? (
              <p className="error-message wide" role="alert">
                No se pudo registrar el consumidor. Verifica los campos.
              </p>
            ) : null}

            <div className="modal-actions wide">
              <button
                className="ghost-button"
                type="button"
                onClick={() => setIsConsumerModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={!canCreateConsumer || createConsumerMutation.isPending}
              >
                <Save size={18} />
                {createConsumerMutation.isPending
                  ? 'Registrando...'
                  : 'Guardar consumidor'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  )
}
