import { createPortal } from 'react-dom'
import LockIcon from './LockIcon'
import LockSlashIcon from './LockSlashIcon'
import './CommandLockToast.css'

export type CommandLockNotice = {
  id: number
  vendor: 'nokia' | 'huawei'
  title: string
  command: string
  isLocked: boolean
}

type CommandLockToastProps = {
  notice: CommandLockNotice | null
}

function CommandLockToast({ notice }: CommandLockToastProps) {
  if (!notice) {
    return null
  }

  return createPortal(
    <aside
      className={`command-lock-toast command-lock-toast--${notice.vendor} ${
        notice.isLocked ? '' : 'command-lock-toast--unlocked'
      }`}
      role="status"
      aria-live="polite"
    >
      {notice.isLocked ? (
        <LockIcon className="command-lock-toast__icon" />
      ) : (
        <LockSlashIcon className="command-lock-toast__icon" />
      )}
      <div className="command-lock-toast__content">
        <strong>
          {notice.isLocked ? 'Comando bloqueado' : 'Comando desbloqueado'}
        </strong>
        <span>{notice.title}</span>
        <p>{notice.command}</p>
      </div>
    </aside>,
    document.body,
    String(notice.id),
  )
}

export default CommandLockToast
