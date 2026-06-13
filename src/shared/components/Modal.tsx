import type { ReactNode } from 'react'
import { X } from 'lucide-react'

type ModalProps = {
  readonly title: string
  readonly eyebrow?: string
  readonly children: ReactNode
  readonly onClose: () => void
}

export const Modal = ({ title, eyebrow, children, onClose }: ModalProps) => (
  <div className="modal-backdrop" role="presentation">
    <section
      className="modal-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-header">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2 id="modal-title">{title}</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Cerrar modal"
          title="Cerrar modal"
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </div>

      <div className="modal-body">{children}</div>
    </section>
  </div>
)
