import { useMutation, useQuery } from '@tanstack/react-query'
import { LockKeyhole, Mail, Save, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import tortasGabyLogo from '../../assets/tortas-gaby-logo.svg'
import { Modal } from '../../shared/components/Modal'
import type { ConsumerType } from '../../shared/types/domain'
import { getConsumerTypes } from '../orders/api'
import { registerPublicConsumerAccount, signInWithEmail } from './api'

const emptyConsumerTypes: ReadonlyArray<ConsumerType> = []

type ConsumerFormState = {
  readonly consumerTypeId: string
  readonly firstNames: string
  readonly lastNames: string
  readonly documentNumber: string
  readonly gradeSection: string
  readonly phone: string
  readonly email: string
  readonly password: string
}

const initialConsumerForm: ConsumerFormState = {
  consumerTypeId: '',
  firstNames: '',
  lastNames: '',
  documentNumber: '',
  gradeSection: '',
  phone: '',
  email: '',
  password: '',
}

const toNullableText = (value: string): string | null => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const onlyDigits = (value: string, maxLength: number) =>
  value.replace(/\D/g, '').slice(0, maxLength)

const getRegistrationErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return 'Verifica los campos.'
  }

  const message = error.message.toLowerCase()

  if (message.includes('email rate limit')) {
    return 'Se alcanzó el límite de registros por correo. Espera unos minutos e intenta nuevamente.'
  }

  if (
    message.includes('already registered') ||
    message.includes('already exists') ||
    message.includes('user already registered')
  ) {
    return 'Ya existe una cuenta con ese correo.'
  }

  if (message.includes('duplicate key')) {
    return 'Ya existe un consumidor con ese correo, DNI o cuenta.'
  }

  return error.message
}

export const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [consumerForm, setConsumerForm] =
    useState<ConsumerFormState>(initialConsumerForm)
  const [registerMessage, setRegisterMessage] = useState('')

  const signInMutation = useMutation({
    mutationFn: () => signInWithEmail(email.trim(), password),
  })

  const consumerTypesQuery = useQuery({
    queryKey: ['consumer-types', 'public-register'],
    queryFn: getConsumerTypes,
    enabled: isRegisterModalOpen,
  })

  const createConsumerMutation = useMutation({
    mutationFn: () => {
      const selectedType = consumerTypes.find(
        (type) => type.id === Number(consumerForm.consumerTypeId),
      )
      const role = selectedType?.code === 'TEACHER' ? 'profesor' : 'alumno'
      const fullName = `${consumerForm.firstNames.trim()} ${consumerForm.lastNames.trim()}`

      return registerPublicConsumerAccount({
        consumer: {
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
        },
        password: consumerForm.password,
        fullName,
        role,
      })
    },
    onSuccess: () => {
      setConsumerForm(initialConsumerForm)
      setIsRegisterModalOpen(false)
      setRegisterMessage('Registro enviado correctamente. Ya puedes iniciar sesión.')
    },
  })

  const consumerTypes = consumerTypesQuery.data ?? emptyConsumerTypes
  const selectedConsumerType = useMemo(
    () =>
      consumerTypes.find(
        (type) => type.id === Number(consumerForm.consumerTypeId),
      ),
    [consumerForm.consumerTypeId, consumerTypes],
  )
  const isTeacherConsumer = selectedConsumerType?.code === 'TEACHER'
  const canSubmit = email.trim().length > 3 && password.length >= 6
  const canRegisterConsumer =
    Number(consumerForm.consumerTypeId) > 0 &&
    consumerForm.firstNames.trim().length >= 2 &&
    consumerForm.lastNames.trim().length >= 2 &&
    consumerForm.documentNumber.trim().length === 8 &&
    consumerForm.phone.trim().length === 9 &&
    consumerForm.email.trim().length >= 5 &&
    consumerForm.password.length >= 6

  return (
    <main className="login-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <img className="login-logo" src={tortasGabyLogo} alt="Tortas Gaby" />
        <div>
          <p className="eyebrow">Tortas Gaby</p>
          <h1 id="login-title">Ingreso al sistema</h1>
          <p className="muted">
            Acceso para ventas, pedidos, productos y control del día.
          </p>
        </div>

        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault()
            if (canSubmit) {
              signInMutation.mutate()
            }
          }}
        >
          <label className="field">
            <span>Correo</span>
            <span className="input-icon">
              <Mail size={18} aria-hidden="true" />
              <input
                autoComplete="email"
                inputMode="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="usuario@colegio.com"
              />
            </span>
          </label>

          <label className="field">
            <span>Contraseña</span>
            <span className="input-icon">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Tu contraseña"
              />
            </span>
          </label>

          {signInMutation.isError ? (
            <p className="error-message" role="alert">
              No se pudo iniciar sesión. Verifica el correo y contraseña.
            </p>
          ) : null}

          {registerMessage ? (
            <p className="success-message" role="status">
              {registerMessage}
            </p>
          ) : null}

          <button
            className="primary-button"
            type="submit"
            disabled={!canSubmit || signInMutation.isPending}
          >
            {signInMutation.isPending ? 'Ingresando...' : 'Ingresar'}
          </button>

          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              setRegisterMessage('')
              setIsRegisterModalOpen(true)
            }}
          >
            <UserPlus size={18} />
            Registrarse
          </button>
        </form>
      </section>

      {isRegisterModalOpen ? (
        <Modal
          eyebrow="Registro"
          title="Nuevo consumidor"
          onClose={() => setIsRegisterModalOpen(false)}
        >
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault()
              if (canRegisterConsumer) {
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

            <label className="field wide">
              <span>Contraseña de acceso</span>
              <input
                autoComplete="new-password"
                type="password"
                value={consumerForm.password}
                onChange={(event) =>
                  setConsumerForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder="Mínimo 6 caracteres"
              />
            </label>

            {consumerTypesQuery.isError ? (
              <p className="error-message wide" role="alert">
                No se pudieron cargar los tipos de consumidor.
              </p>
            ) : null}

            {createConsumerMutation.isError ? (
              <p className="error-message wide" role="alert">
                No se pudo registrar el consumidor.{' '}
                {getRegistrationErrorMessage(createConsumerMutation.error)}
              </p>
            ) : null}

            <div className="modal-actions wide">
              <button
                className="ghost-button"
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={
                  !canRegisterConsumer ||
                  createConsumerMutation.isPending ||
                  consumerTypesQuery.isLoading
                }
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
    </main>
  )
}
