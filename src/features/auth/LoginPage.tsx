import { useMutation } from '@tanstack/react-query'
import { LockKeyhole, Mail } from 'lucide-react'
import { useState } from 'react'
import tortasGabyLogo from '../../assets/tortas-gaby-logo.svg'
import { signInWithEmail } from './api'

export const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const signInMutation = useMutation({
    mutationFn: () => signInWithEmail(email.trim(), password),
  })

  const canSubmit = email.trim().length > 3 && password.length >= 6

  return (
    <main className="login-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <img className="login-logo" src={tortasGabyLogo} alt="Tortas Gaby" />
        <div>
          <p className="eyebrow">Tortas Gaby</p>
          <h1 id="login-title">Ingreso al sistema</h1>
          <p className="muted">
            Acceso para ventas, pedidos, productos y control del dia.
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

          <button
            className="primary-button"
            type="submit"
            disabled={!canSubmit || signInMutation.isPending}
          >
            {signInMutation.isPending ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  )
}
