import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

const variantStyles = {
  danger: { icon: 'text-danger', button: 'danger' as const },
  warning: { icon: 'text-warning', button: 'primary' as const },
  info: { icon: 'text-primary-600', button: 'primary' as const },
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Подтверждение',
  message,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  const styles = variantStyles[variant]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="text-center">
        <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4`}>
          <AlertTriangle className={`h-6 w-6 ${styles.icon}`} />
        </div>
        <div className="text-sm text-gray-600 mb-6">{message}</div>
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {cancelLabel}
          </Button>
          <Button variant={styles.button} onClick={onConfirm} isLoading={isLoading} className="flex-1">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
