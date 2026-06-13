import { useEffect, useState } from 'react'
import { Tags } from 'lucide-react'
import {
  type Category,
  useCategoryMutations,
} from '../lib/worktrack'
import {
  Field,
  Modal,
  PageHeader,
} from '../lib/ui'
import { useReferenceData } from '../app/shared'

function CategoryEditor({
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

export function CategoriesPage() {
  const { categories } = useReferenceData()
  const mutations = useCategoryMutations()
  const [editing, setEditing] = useState<Category | null>(null)
  const [open, setOpen] = useState(false)

  return (
    <div className="page">
      <PageHeader icon={<Tags size={24} />} title="Categories" subtitle="Maintain category flags used throughout WorkTrack." actions={<button type="button" className="primary-button" onClick={() => setOpen(true)}>New Category</button>} />
      <section className="card-grid">
        {categories.map((category) => (
          <article key={category.categoryId} className="card">
            <h2>{category.name}</h2>
            <p>{category.longName}</p>
            <div className="row gap wrap">
              {category.development ? <span className="badge badge-fresh">Development</span> : null}
              {category.capex ? <span className="badge badge-plum">CAPEX</span> : null}
              <span className={category.active ? 'badge badge-leaf' : 'badge badge-neutral'}>{category.active ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="row gap">
              <button type="button" className="secondary-button" onClick={() => setEditing(category)}>
                Edit
              </button>
              <button type="button" className="secondary-button" onClick={async () => window.confirm(`Delete ${category.name}?`) && mutations.remove.mutateAsync(category.categoryId)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>
      <CategoryEditor
        open={open || !!editing}
        onClose={() => {
          setOpen(false)
          setEditing(null)
        }}
        initial={editing || undefined}
        onSubmit={async (category) => {
          if (editing) {
            await mutations.update.mutateAsync(category)
          } else {
            await mutations.create.mutateAsync(category)
          }
          setOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
