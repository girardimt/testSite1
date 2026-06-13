import { useState } from 'react'
import { Milestone } from 'lucide-react'
import {
  type Release,
  formatDisplayDate,
  releaseTypeColor,
  useReleaseMutations,
  useWorkItemMutations,
} from '../lib/worktrack'
import { PageHeader } from '../components'
import { useReferenceData } from '../app/shared'
import { ReleaseDialog } from '../components/releases/ReleaseDialog'

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
      <ReleaseDialog
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
