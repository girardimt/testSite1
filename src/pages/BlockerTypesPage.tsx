import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import {
  sortBlockerTypesForDialog,
  useBlockerTypeMutations,
} from '../lib/worktrack'
import { PageHeader } from '../components'
import { useReferenceData } from '../app/shared'
import { BlockerTypeDialog } from '../components/blocker-types/BlockerTypeDialog'

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
      <BlockerTypeDialog
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
