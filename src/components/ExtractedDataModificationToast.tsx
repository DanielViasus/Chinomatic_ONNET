import { createPortal } from 'react-dom'
import MessageCircleExclamationIcon from './MessageCircleExclamationIcon'
import type { DataItemTone } from './jsonToneShared'
import './ExtractedDataModificationToast.css'

export type ExtractedDataModificationNotice = {
  id: number
  source: 'blueplanet' | 'Beesion'
  label: string
  value: string
  tone: DataItemTone
}

type ExtractedDataModificationToastProps = {
  notice: ExtractedDataModificationNotice | null
}

function ExtractedDataModificationToast({
  notice,
}: ExtractedDataModificationToastProps) {
  if (!notice) {
    return null
  }

  return createPortal(
    <aside
      className="app-toast extracted-data-modification-toast"
      role="status"
      aria-live="polite"
    >
      <MessageCircleExclamationIcon className="extracted-data-modification-toast__icon" />
      <div className="extracted-data-modification-toast__content">
        <strong>Parámetro modificado</strong>
        <div className="extracted-data-modification-toast__meta">
          <span>{notice.source}</span>
          <span aria-hidden="true">·</span>
          <span
            className={`extracted-data-modification-toast__property extracted-data-modification-toast__property--${notice.tone}`}
          >
            {notice.label}
          </span>
        </div>
        <p>{notice.value || 'Valor vacío'}</p>
      </div>
    </aside>,
    document.body,
    String(notice.id),
  )
}

export default ExtractedDataModificationToast
