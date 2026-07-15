import { createPortal } from 'react-dom'
import VisibilityToggleIcon from './VisibilityToggleIcon'
import type { DataItemTone } from './jsonToneShared'
import './CompactReferenceAdditionToast.css'

export type CompactReferenceAdditionNotice = {
  id: number
  label: string
  value: string
  tone: DataItemTone
  isVisible: boolean
}

type CompactReferenceAdditionToastProps = {
  notice: CompactReferenceAdditionNotice | null
}

function CompactReferenceAdditionToast({
  notice,
}: CompactReferenceAdditionToastProps) {
  if (!notice) {
    return null
  }

  return createPortal(
    <aside
      className={`compact-reference-addition-toast ${
        notice.isVisible
          ? ''
          : 'compact-reference-addition-toast--hidden'
      }`}
      role="status"
      aria-live="polite"
    >
      <VisibilityToggleIcon
        isVisible={notice.isVisible}
        className="compact-reference-addition-toast__icon"
      />
      <div className="compact-reference-addition-toast__content">
        <strong>
          {notice.isVisible ? 'Propiedad agregada' : 'Propiedad ocultada'}
        </strong>
        <span>
          {notice.isVisible
            ? 'Visible en referencia compacta'
            : 'Oculta de referencia compacta'}
        </span>
        <p>
          <b className={`compact-reference-addition-toast__property compact-reference-addition-toast__property--${notice.tone}`}>
            {notice.label}
          </b>
          <span aria-hidden="true"> · </span>
          {notice.value || 'Valor vacío'}
        </p>
      </div>
    </aside>,
    document.body,
    String(notice.id),
  )
}

export default CompactReferenceAdditionToast
