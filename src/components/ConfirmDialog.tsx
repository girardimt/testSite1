import { Modal } from '../lib/ui'

/**
 * A lightweight confirmation dialog built on the shared `Modal` component.
 * Presents a message and two action buttons: a cancel and a confirm.
 *
 * @example
 * <ConfirmDialog
 *   open={deleteOpen}
 *   title="Delete item"
 *   message="This cannot be undone. Continue?"
 *   confirmLabel="Delete"
 *   onConfirm={handleDelete}
 *   onCancel={() => setDeleteOpen(false)}
 * />
 */
export const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) => (
  <Modal open={open} title={title} onClose={onCancel}>
    <p>{message}</p>
    <div className="row gap" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
      <button type="button" className="secondary-button" onClick={onCancel}>
        {cancelLabel}
      </button>
      <button type="button" className="primary-button" onClick={onConfirm}>
        {confirmLabel}
      </button>
    </div>
  </Modal>
)
