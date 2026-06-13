import { useEffect, useState } from 'react'
import type { Category } from '../../lib/worktrack'
import { Field } from '../system/Field'
import { Modal } from '../system/Modal'

export function CategoryDialog({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  initial?: Category
  onSubmit: (category: Category) => Promise<void>
}) {
  const [draft, setDraft] = useState<Category>(
    initial || { categoryId: `cat-${Date.now()}`, name: '', longName: '', development: false, capex: false, active: true },
  )

  useEffect(() => {
    setDraft(initial || { categoryId: `cat-${Date.now()}`, name: '', longName: '', development: false, capex: false, active: true })
  }, [initial, open])

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Category' : 'New Category'}>
      <div className="modal-form">
        <Field label="Name" required>
          <input className="form-input" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        </Field>
        <Field label="Long Name">
          <input className="form-input" value={draft.longName} onChange={(event) => setDraft((current) => ({ ...current, longName: event.target.value }))} />
        </Field>
        <label className="toggle"><input type="checkbox" checked={draft.development} onChange={(event) => setDraft((current) => ({ ...current, development: event.target.checked }))} />Development</label>
        <label className="toggle"><input type="checkbox" checked={draft.capex} onChange={(event) => setDraft((current) => ({ ...current, capex: event.target.checked }))} />CAPEX</label>
        <label className="toggle"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} />Active</label>
        <button type="button" className="primary-button" disabled={!draft.name.trim()} onClick={async () => { await onSubmit(draft); onClose() }}>
          Save
        </button>
      </div>
    </Modal>
  )
}
