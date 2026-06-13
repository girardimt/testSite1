import { useEffect, useState } from 'react'
import type { Person } from '../../lib/worktrack'
import { Field } from '../system/Field'
import { Modal } from '../system/Modal'

export function PersonDialog({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  initial?: Person
  onSubmit: (person: Person) => Promise<void>
}) {
  const [draft, setDraft] = useState(
    initial || { id: `per-${Date.now()}`, title: '', email: '', role: '', active: true } satisfies Person,
  )

  useEffect(() => {
    setDraft(initial || { id: `per-${Date.now()}`, title: '', email: '', role: '', active: true })
  }, [initial, open])

  return (
    <Modal open={open} onClose={onClose} title="Edit Person">
      <div className="modal-form">
        <Field label="Name">
          <input className="form-input" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
        </Field>
        <Field label="Email" required>
          <input className="form-input" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
        </Field>
        <Field label="Role">
          <input className="form-input" value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))} />
        </Field>
        <label className="toggle"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} />Active</label>
        <button
          type="button"
          className="primary-button"
          disabled={!draft.email.trim() || !/^[^@\s]+@pepsico\.com$/i.test(draft.email)}
          onClick={async () => {
            await onSubmit({ ...draft, email: draft.email.toLowerCase() })
            onClose()
          }}
        >
          Save
        </button>
      </div>
    </Modal>
  )
}
