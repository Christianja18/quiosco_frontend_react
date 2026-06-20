import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { useId, useState, type InputHTMLAttributes } from 'react'

type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  readonly label: string
  readonly wide?: boolean
}

export const PasswordField = ({
  label,
  wide = false,
  className,
  id,
  ...inputProps
}: PasswordFieldProps) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const [isVisible, setIsVisible] = useState(false)

  return (
    <label className={wide ? 'field wide' : 'field'} htmlFor={inputId}>
      <span>{label}</span>
      <span className="input-icon password-input">
        <LockKeyhole size={18} aria-hidden="true" />
        <input
          {...inputProps}
          id={inputId}
          className={className}
          type={isVisible ? 'text' : 'password'}
        />
        <button
          className="password-toggle"
          type="button"
          aria-label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          title={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          onClick={() => setIsVisible((current) => !current)}
        >
          {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  )
}
