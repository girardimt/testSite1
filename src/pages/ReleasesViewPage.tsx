import { useState } from 'react'
import { Rocket } from 'lucide-react'
import {
  formatDisplayDate,
  parseLocalDate,
  daysRemaining,
} from '../lib/worktrack'
import {
  PageHeader,
  PeopleChip,
  ReleaseBadge,
} from '../lib/ui'
import { WorkItemEditor, remainingText, useReferenceData } from '../app/shared'
import { useNavigate } from 'react-router-dom'
import {
  sizeColor,
  statusColor,
} from '../lib/worktrack'

export function ReleasesViewPage() {
  const { workItems, people, releases } = useReferenceData()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [prefillReleaseId, setPrefillReleaseId] = useState<string | null>(null)
  const activeReleases = [...releases].filter((release) => release.active).sort((left, right) => parseLocalDate(left.date).getTime() - parseLocalDate(right.date).getTime())
  const unreleased = workItems.filter((item) => !item.releaseId)

  return (
    <div className="page">
      <PageHeader icon={<Rocket size={24} />} title="Releases" subtitle="Work items grouped by active release." />
      <section className="stack">
        {activeReleases.map((release) => {
          const items = workItems.filter((item) => item.releaseId === release.id)
          return (
            <article key={release.id} className="card">
              <div className="group-header surface-plum">
                <div>
                  <h2>{release.title}</h2>
                  <div className="row gap wrap">
                    <span>{formatDisplayDate(release.date)}</span>
                    <ReleaseBadge type={release.releaseType} />
                    <span>{items.length} items</span>
                  </div>
                </div>
              </div>
              {items.length ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Title</th>
                      <th>Assignee</th>
                      <th>Size</th>
                      <th>Goal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.workItemId}
                        tabIndex={0}
                        onClick={() => navigate(`/work-items/${item.workItemId}`)}
                        onKeyDown={(event) => event.key === 'Enter' && navigate(`/work-items/${item.workItemId}`)}
                      >
                        <td>
                          <span className={statusColor(item.status)}>{item.status}</span>
                        </td>
                        <td>{item.title}</td>
                        <td>
                          <PeopleChip person={people.find((entry) => entry.id === item.assignedToId)} />
                        </td>
                        <td>
                          <span className={sizeColor(item.size)}>{item.size}</span>
                        </td>
                        <td className={daysRemaining(item.goalDate) < 0 ? 'danger-text' : ''}>{remainingText(item.goalDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="muted-panel">
                  <p>No work items are assigned to this release yet.</p>
                  <button type="button" className="secondary-button" onClick={() => { setPrefillReleaseId(release.id); setOpen(true) }}>
                    Add work item
                  </button>
                </div>
              )}
            </article>
          )
        })}
        {unreleased.length ? (
          <article className="card">
            <div className="group-header surface-plum">
              <h2>No Release</h2>
            </div>
            <div className="muted-panel">
              <p>{unreleased.length} items do not have a release assignment.</p>
              <button type="button" className="secondary-button" onClick={() => { setPrefillReleaseId(null); setOpen(true) }}>
                Add work item
              </button>
            </div>
          </article>
        ) : null}
      </section>
      <WorkItemEditor open={open} onClose={() => setOpen(false)} prefill={{ releaseId: prefillReleaseId }} />
    </div>
  )
}
