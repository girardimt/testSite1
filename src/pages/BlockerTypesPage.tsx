import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import {
  useBlockerTypeMutations,
  sortBlockerTypesForDialog,
  loadDb,
} from '../lib/worktrack'
import {
  Field,
  Modal,
  PageHeader,
} from '../lib/ui'
import { useReferenceData } from '../app/shared'

function BlockerTypeEditor({
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

export function BlockerTypesPage() {
  const { blockerTypes } = useReferenceData()
  const mutations = useBlockerTypeMutations()
  const [editing, setEditing] = useState<(typeof blockerTypes)[number] | null>(null)
  const [open, setOpen] = useState(false)

  return (
    <div className="page">
      <PageHeader icon={<ShieldAlert size={24} />} title="Blocker Types" subtitle="Define cadence rules for blocker re-validation." actions={<button type="button" className="primary-button" onClick={() => setOpen(true)}>New Type</button>} />
      <section className="card-grid">
        {sortBlockerTypesForDialog(blockerTypes).map((type) => (
          <article key={type.blockerTypeId} className="card">
            <h2>{type.name}</h2>
            <p>Re-validate every {type.days} day{type.days === 1 ? '' : 's'}.</p>
            <div className="row gap">
              <button type="button" className="secondary-button" onClick={() => setEditing(type)}>
                Edit
              </button>
              <button type="button" className="secondary-button" onClick={async () => window.confirm(`Delete ${type.name}?`) && mutations.remove.mutateAsync(type.blockerTypeId)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>
      <BlockerTypeEditor
        open={open || !!editing}
        onClose={() => {
          setOpen(false)
          setEditing(null)
        }}
        initial={editing || undefined}
        onSubmit={async (type) => {
          if (editing) {
            await mutations.update.mutateAsync(type)
          } else {
            await mutations.create.mutateAsync(type)
          }
          setOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
