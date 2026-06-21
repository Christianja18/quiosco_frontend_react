import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Save, Search, Trash2, UserPlus, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../shared/components/Modal'
import { PasswordField } from '../../shared/components/PasswordField'
import type {
  Consumer,
  ConsumerType,
  Profile,
  UserRole,
} from '../../shared/types/domain'
import { formatDateTime } from '../../shared/utils/format'
import {
  createConsumer,
  deactivateConsumer,
  getConsumers,
  getConsumerTypes,
  updateConsumer,
} from '../orders/api'
import {
  createAuthUser,
  deleteProfileUser,
  getProfiles,
  updateProfileUser,
} from './api'

const emptyProfiles: ReadonlyArray<Profile> = []
const emptyConsumers: ReadonlyArray<Consumer> = []
const emptyConsumerTypes: ReadonlyArray<ConsumerType> = []
const pageSize = 5
type OperationalRole = Extract<UserRole, 'admin' | 'seller'>

const roleOptions: ReadonlyArray<{
  readonly value: OperationalRole
  readonly label: string
}> = [
  { value: 'admin', label: 'Administrador' },
  { value: 'seller', label: 'Vendedor' },
]

type UserFormState = {
  readonly fullName: string
  readonly email: string
  readonly password: string
  readonly role: OperationalRole
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

type DeleteTarget =
  | {
      readonly kind: 'user'
      readonly id: string
      readonly label: string
    }
  | {
      readonly kind: 'consumer'
      readonly id: number
      readonly label: string
    }

const toNullableText = (value: string): string | null => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const onlyDigits = (value: string, maxLength: number) =>
  value.replace(/\D/g, '').slice(0, maxLength)

const getMutationErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Verifica los datos.'

export const UsersPage = ({ profile }: UsersPageProps) => {
  const queryClient = useQueryClient()
  const isAdmin = profile.role === 'admin'
  const [userSearch, setUserSearch] = useState('')
  const [consumerSearch, setConsumerSearch] = useState('')
  const [profilePage, setProfilePage] = useState(1)
  const [consumerPage, setConsumerPage] = useState(1)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [isConsumerModalOpen, setIsConsumerModalOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingConsumerId, setEditingConsumerId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
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
      setEditingUserId(null)
      setIsUserModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: () => {
      if (editingUserId === null) {
        throw new Error('No hay usuario seleccionado')
      }

      return updateProfileUser({
        userId: editingUserId,
        fullName: userForm.fullName.trim(),
        role: userForm.role,
      })
    },
    onSuccess: () => {
      setUserForm(initialUserForm)
      setEditingUserId(null)
      setIsUserModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['profiles'] })
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: deleteProfileUser,
    onSuccess: () => {
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

  const updateConsumerMutation = useMutation({
    mutationFn: () => {
      if (editingConsumerId === null) {
        throw new Error('No hay consumidor seleccionado')
      }

      const selectedType = consumerTypes.find(
        (type) => type.id === Number(consumerForm.consumerTypeId),
      )

      return updateConsumer(editingConsumerId, {
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
      })
    },
    onSuccess: () => {
      setConsumerForm(initialConsumerForm)
      setEditingConsumerId(null)
      setIsConsumerModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['consumers'] })
    },
  })

  const deactivateConsumerMutation = useMutation({
    mutationFn: deactivateConsumer,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['consumers'] })
    },
  })

  useEffect(() => {
    if (!createUserMutation.isError) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => createUserMutation.reset(), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [createUserMutation])

  useEffect(() => {
    if (!updateUserMutation.isError) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => updateUserMutation.reset(), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [updateUserMutation])

  useEffect(() => {
    if (!deleteUserMutation.isError) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => deleteUserMutation.reset(), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [deleteUserMutation])

  useEffect(() => {
    if (!createConsumerMutation.isError) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => createConsumerMutation.reset(), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [createConsumerMutation])

  useEffect(() => {
    if (!updateConsumerMutation.isError) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => updateConsumerMutation.reset(), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [updateConsumerMutation])

  useEffect(() => {
    if (!deactivateConsumerMutation.isError) {
      return undefined
    }

    const timeoutId = window.setTimeout(
      () => deactivateConsumerMutation.reset(),
      5000,
    )
    return () => window.clearTimeout(timeoutId)
  }, [deactivateConsumerMutation])

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

  const canSaveUser =
    isAdmin &&
    userForm.fullName.trim().length >= 2 &&
    (editingUserId !== null ||
      (userForm.email.trim().length >= 5 && userForm.password.length >= 6))

  const isSavingUser = createUserMutation.isPending || updateUserMutation.isPending

  const hasValidDocument =
    consumerForm.documentNumber.trim().length === 0 ||
    consumerForm.documentNumber.trim().length === 8
  const hasValidPhone =
    consumerForm.phone.trim().length === 0 || consumerForm.phone.trim().length === 9

  const canSaveConsumer =
    isAdmin &&
    Number(consumerForm.consumerTypeId) > 0 &&
    consumerForm.firstNames.trim().length >= 2 &&
    consumerForm.lastNames.trim().length >= 2 &&
    hasValidDocument &&
    hasValidPhone

  const isSavingConsumer =
    createConsumerMutation.isPending || updateConsumerMutation.isPending

  const openNewUserModal = () => {
    setEditingUserId(null)
    setUserForm(initialUserForm)
    createUserMutation.reset()
    updateUserMutation.reset()
    setIsUserModalOpen(true)
  }

  const openEditUserModal = (userProfile: Profile) => {
    setEditingUserId(userProfile.id)
    setUserForm({
      fullName: userProfile.full_name,
      email: '',
      password: '',
      role: userProfile.role === 'admin' ? 'admin' : 'seller',
    })
    createUserMutation.reset()
    updateUserMutation.reset()
    setIsUserModalOpen(true)
  }

  const closeUserModal = () => {
    setIsUserModalOpen(false)
    setEditingUserId(null)
    setUserForm(initialUserForm)
    createUserMutation.reset()
    updateUserMutation.reset()
  }

  const requestDeleteUser = (userProfile: Profile) => {
    if (userProfile.id === profile.id) {
      return
    }

    setDeleteTarget({
      kind: 'user',
      id: userProfile.id,
      label: userProfile.full_name,
    })
  }

  const openNewConsumerModal = () => {
    setEditingConsumerId(null)
    setConsumerForm(initialConsumerForm)
    createConsumerMutation.reset()
    updateConsumerMutation.reset()
    setIsConsumerModalOpen(true)
  }

  const openEditConsumerModal = (consumer: Consumer) => {
    setEditingConsumerId(consumer.id)
    setConsumerForm({
      consumerTypeId: String(consumer.consumer_type_id),
      firstNames: consumer.first_names,
      lastNames: consumer.last_names,
      documentNumber: consumer.document_number ?? '',
      gradeSection: consumer.grade_section ?? '',
      phone: consumer.phone ?? '',
      email: consumer.email ?? '',
    })
    createConsumerMutation.reset()
    updateConsumerMutation.reset()
    setIsConsumerModalOpen(true)
  }

  const closeConsumerModal = () => {
    setIsConsumerModalOpen(false)
    setEditingConsumerId(null)
    setConsumerForm(initialConsumerForm)
    createConsumerMutation.reset()
    updateConsumerMutation.reset()
  }

  const requestDeactivateConsumer = (consumer: Consumer) => {
    const consumerName = `${consumer.first_names} ${consumer.last_names}`.trim()

    setDeleteTarget({
      kind: 'consumer',
      id: consumer.id,
      label: consumerName,
    })
  }

  const closeDeleteModal = () => {
    setDeleteTarget(null)
  }

  const confirmDelete = () => {
    if (deleteTarget === null) {
      return
    }

    if (deleteTarget.kind === 'user') {
      deleteUserMutation.mutate(deleteTarget.id, {
        onSuccess: () => {
          closeDeleteModal()
        },
      })
      return
    }

    deactivateConsumerMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        closeDeleteModal()
      },
    })
  }

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
              onClick={openNewConsumerModal}
            >
              <Users size={18} />
              Registrar consumidor
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={openNewUserModal}
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
            <p className="eyebrow">Usuarios</p>
            <h2>Administradores y vendedores registrados</h2>
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

        {deleteUserMutation.isError ? (
          <p className="error-message" role="alert">
            No se pudo eliminar el usuario.
          </p>
        ) : null}

        {profilesQuery.isLoading ? (
          <p className="muted">Cargando usuarios...</p>
        ) : filteredProfiles.length === 0 ? (
          <p className="empty-state">No hay usuarios operativos registrados.</p>
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
                      <div className="table-actions">
                        <button
                          aria-label="Editar usuario"
                          className="icon-button small"
                          title="Editar usuario"
                          type="button"
                          disabled={isSavingUser || deleteUserMutation.isPending}
                          onClick={() => openEditUserModal(userProfile)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          aria-label="Eliminar usuario"
                          className="icon-button small danger"
                          title="Eliminar usuario"
                          type="button"
                          disabled={
                            deleteUserMutation.isPending ||
                            userProfile.id === profile.id
                          }
                          onClick={() => requestDeleteUser(userProfile)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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

        {deactivateConsumerMutation.isError ? (
          <p className="error-message" role="alert">
            No se pudo eliminar el consumidor. Verifica si tiene movimientos
            activos.
          </p>
        ) : null}

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
                  <th>Acción</th>
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
                    <td>
                      <div className="table-actions">
                        <button
                          aria-label="Editar consumidor"
                          className="icon-button small"
                          title="Editar consumidor"
                          type="button"
                          disabled={
                            isSavingConsumer || deactivateConsumerMutation.isPending
                          }
                          onClick={() => openEditConsumerModal(consumer)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          aria-label="Eliminar consumidor"
                          className="icon-button small danger"
                          title="Eliminar consumidor"
                          type="button"
                          disabled={deactivateConsumerMutation.isPending}
                          onClick={() => requestDeactivateConsumer(consumer)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
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
          eyebrow={editingUserId === null ? 'Registro' : 'Edición'}
          title={editingUserId === null ? 'Nuevo usuario' : 'Editar usuario'}
          onClose={closeUserModal}
        >
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault()

              if (!canSaveUser) {
                return
              }

              if (editingUserId === null) {
                createUserMutation.mutate()
              } else {
                updateUserMutation.mutate()
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

            {editingUserId === null ? (
              <>
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

            <PasswordField
              label="Contraseña inicial"
              autoComplete="new-password"
              value={userForm.password}
              onChange={(event) =>
                setUserForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder="Mínimo 6 caracteres"
            />

              </>
            ) : null}

            <label className="field wide">
              <span>Rol</span>
              <select
                value={userForm.role}
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    role: event.target.value as OperationalRole,
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

            {createUserMutation.isError || updateUserMutation.isError ? (
              <p className="error-message wide" role="alert">
                No se pudo registrar el usuario. Verifica el correo o la
                configuración de Auth.
              </p>
            ) : null}

            {createUserMutation.isError || updateUserMutation.isError ? (
              <p className="error-message wide" role="alert">
                Detalle: {getMutationErrorMessage(
                  updateUserMutation.error ?? createUserMutation.error,
                )}
              </p>
            ) : null}

            <div className="modal-actions wide">
              <button
                className="ghost-button"
                type="button"
                onClick={closeUserModal}
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={!canSaveUser || isSavingUser}
              >
                <Save size={18} />
                {isSavingUser
                  ? 'Guardando...'
                  : editingUserId === null
                    ? 'Guardar usuario'
                    : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {isConsumerModalOpen ? (
        <Modal
          eyebrow={editingConsumerId === null ? 'Registro' : 'Edición'}
          title={editingConsumerId === null ? 'Nuevo consumidor' : 'Editar consumidor'}
          onClose={closeConsumerModal}
        >
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault()
              if (!canSaveConsumer) {
                return
              }

              if (editingConsumerId === null) {
                createConsumerMutation.mutate()
              } else {
                updateConsumerMutation.mutate()
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

            {createConsumerMutation.isError || updateConsumerMutation.isError ? (
              <p className="error-message wide" role="alert">
                No se pudo guardar el consumidor. Verifica los campos.
              </p>
            ) : null}

            <div className="modal-actions wide">
              <button
                className="ghost-button"
                type="button"
                onClick={closeConsumerModal}
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={!canSaveConsumer || isSavingConsumer}
              >
                <Save size={18} />
                {isSavingConsumer
                  ? 'Guardando...'
                  : editingConsumerId === null
                    ? 'Guardar consumidor'
                    : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleteTarget !== null ? (
        <Modal
          eyebrow="Confirmación"
          title={
            deleteTarget.kind === 'user'
              ? 'Eliminar usuario'
              : 'Eliminar consumidor'
          }
          onClose={closeDeleteModal}
        >
          <div className="confirm-dialog">
            <p>
              {deleteTarget.kind === 'user'
                ? `Se eliminará el usuario ${deleteTarget.label}.`
                : `Se eliminará el consumidor ${deleteTarget.label}.`}
            </p>
            <p className="muted">Esta acción no se puede deshacer.</p>

            <div className="modal-actions">
              <button
                className="ghost-button"
                type="button"
                onClick={closeDeleteModal}
              >
                Cancelar
              </button>
              <button
                className="ghost-button danger"
                type="button"
                disabled={
                  deleteUserMutation.isPending || deactivateConsumerMutation.isPending
                }
                onClick={confirmDelete}
              >
                <Trash2 size={18} />
                {deleteUserMutation.isPending || deactivateConsumerMutation.isPending
                  ? 'Eliminando...'
                  : 'Eliminar'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  )
}
