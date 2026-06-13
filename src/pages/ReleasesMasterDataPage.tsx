import { useEffect, useState } from 'react'
import { Milestone } from 'lucide-react'
import {
  type Release,
  type ReleaseType,
  RELEASE_TYPE_OPTIONS,
  releaseSequence,
  releaseTypeColor,
  formatDisplayDate,
  todayString,
  useReleaseMutations,
  useWorkItemMutations,
} from '../lib/worktrack'
import {
  Field,
  Modal,
  PageHeader,
} from '../lib/ui'
import { useReferenceData } from '../app/shared'

function ReleaseEditor({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  initial?: Release
  onSubmit: (release: Release) => Promise<void>
}) {
  const { releases } = useReferenceData()
  const [draft, setDraft] = useState<Release>(
    initial || { id: releaseSequence(releases), title: '', date: todayString(), releaseType: 'Other', active: true, notes: '' },
  )
  useEffect(() => {
    setDraft(initial || { id: releaseSequence(releases), title: '', date: todayString(), releaseType: 'Other', active: true, notes: '' })
  }, [initial, open, releases])
  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Release' : 'New Release'}>
      <div className="modal-form">
        <Field label="Title">
          <input className="form-input" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
        </Field>
        <Field label="Date">
          <input className="form-input" type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} />
        </Field>
        <Field label="Release Type">
          <select className="form-input" value={draft.releaseType} onChange={(event) => setDraft((current) => ({ ...current, releaseType: event.target.value as ReleaseType }))}>
            {RELEASE_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes">
          <textarea className="form-input" rows={4} value={draft.notes || ''} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
        </Field>
        <label className="toggle"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} />Active</label>
        <button type="button" className="primary-button" disabled={!draft.title.trim()} onClick={async () => { await onSubmit(draft); onClose() }}>
          Save
        </button>
      </div>
    </Modal>
  )
}

export function ReleasesMasterDataPage() {
  const { releases, workItems } = useReferenceData()
  const releaseMutations = useReleaseMutations()
  const workItemMutations = useWorkItemMutations()
  const [editing, setEditing] = useState<Release | null>(null)
  const [open, setOpen] = useState(false)

  const activeCount = releases.filter((release) => release.active).length

  return (
    <div className="page">
      <PageHeader
        icon={<Milestone size={24} />}
        title="Releases"
        subtitle={`Maintain release master data. ${activeCount} active / ${releases.length - activeCount} inactive.`}
        actions={<button type="button" className="primary-button" onClick={() => setOpen(true)}>New Release</button>}
      />
      <section className="card-grid">
        {releases.map((release) => {
          const count = workItems.filter((item) => item.releaseId === release.id).length
          return (
            <article key={release.id} className="card">
              <div className="row gap wrap">
                <h2>{release.title}</h2>
                <span className={releaseTypeColor(release.releaseType)}>{release.releaseType}</span>
              </div>
              <p>{formatDisplayDate(release.date)}</p>
              <p>{release.notes || 'No notes.'}</p>
              <div className="row gap wrap">
                <span className={release.active ? 'badge badge-leaf' : 'badge badge-neutral'}>{release.active ? 'Active' : 'Inactive'}</span>
                <span>{count} linked items</span>
              </div>
              <div className="row gap">
                <button type="button" className="secondary-button" onClick={() => setEditing(release)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={async () => {
                    const linked = workItems.filter((item) => item.releaseId === release.id)
                    if (linked.length) {
                      if (!window.confirm(`${linked.length} work items reference ${release.title}. Unlink and delete?`)) {
                        return
                      }
                      for (const item of linked) {
                        await workItemMutations.update.mutateAsync({ ...item, releaseId: null })
                      }
                    } else if (!window.confirm(`Delete ${release.title}?`)) {
                      return
                    }
                    await releaseMutations.remove.mutateAsync(release.id)
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          )
        })}
      </section>
      <ReleaseEditor
        open={open || !!editing}
        onClose={() => {
          setOpen(false)
          setEditing(null)
        }}
        initial={editing || undefined}
        onSubmit={async (release) => {
          if (editing) {
            await releaseMutations.update.mutateAsync(release)
          } else {
            await releaseMutations.create.mutateAsync(release)
          }
          setOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
