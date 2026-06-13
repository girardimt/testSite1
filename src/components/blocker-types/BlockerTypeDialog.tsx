import { useEffect, useState } from 'react'
import { loadDb } from '../../lib/worktrack'
import { Field } from '../system/Field'
import { Modal } from '../system/Modal'

export function BlockerTypeDialog({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  initial?: ReturnType<typeof loadDb>['blockerTypes'][number]
  onSubmit: (type: ReturnType<typeof loadDb>['blockerTypes'][number]) => Promise<void>
}) {
  const [draft, setDraft] = useState(initial || { blockerTypeId: `bt-${Date.now()}`, name: '', days: 1 })

  useEffect(() => {
    setDraft(initial || { blockerTypeId: `bt-${Date.now()}`, name: '', days: 1 })
  }, [initial, open])

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Blocker Type' : 'New Blocker Type'}>
      <div className="modal-form">
        <Field label="Name" required>
          <input className="form-input" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        </Field>
        <Field label="Days">
          <input className="form-input" type="number" min={1} value={draft.days} onChange={(event) => setDraft((current) => ({ ...current, days: Number(event.target.value) || 1 }))} />
        </Field>
        <button type="button" className="primary-button" disabled={!draft.name.trim()} onClick={async () => { await onSubmit(draft); onClose() }}>
          Save
        </button>
      </div>
    </Modal>
  )
}
