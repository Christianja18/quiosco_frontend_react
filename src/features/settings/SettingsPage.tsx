import { Save, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  readLocalSettings,
  writeLocalSettings,
  type LocalSettings,
} from './localSettings'

export const SettingsPage = () => {
  const [settings, setSettings] = useState<LocalSettings>(() => readLocalSettings())
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!saved) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setSaved(false), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [saved])

  return (
    <section className="page-grid" aria-labelledby="settings-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Configuración</p>
          <h1 id="settings-title">Preferencias del negocio</h1>
        </div>
      </div>

      <p className="permission-banner">
        La base actual no incluye una tabla de configuración. Estas preferencias
        se guardan localmente en este navegador.
      </p>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Sistema</p>
            <h2>Datos visibles</h2>
          </div>
          <Settings size={20} />
        </div>

        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault()
            writeLocalSettings(settings)
            setSaved(true)
          }}
        >
          <label className="field wide">
            <span>Nombre del negocio</span>
            <input
              value={settings.kioskName}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  kioskName: event.target.value,
                }))
              }
            />
          </label>

          <label className="field wide">
            <span>Mensaje de ticket</span>
            <input
              value={settings.receiptFooter}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  receiptFooter: event.target.value,
                }))
              }
            />
          </label>

          <label className="checkbox-field wide">
            <input
              checked={settings.printerEnabled}
              type="checkbox"
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  printerEnabled: event.target.checked,
                }))
              }
            />
            <span>Activar impresión local de tickets cuando esté disponible</span>
          </label>

          {saved ? (
            <p className="success-message wide" role="status">
              Preferencias guardadas en este navegador.
            </p>
          ) : null}

          <button className="primary-button wide" type="submit">
            <Save size={18} />
            Guardar preferencias
          </button>
        </form>
      </section>
    </section>
  )
}
