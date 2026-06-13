import { useState } from 'react'
import { FolderKanban } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  daysRemaining,
  matchesWorkItemSearch,
  parseLocalDate,
  sizeColor,
  touchLastChanged,
  type Status,
  useWorkItemMutations,
} from '../lib/worktrack'
import {
  EmptyState,
  Field,
  PageHeader,
  PeopleChip,
  ReleaseBadge,
} from '../lib/ui'
import {
  WorkItemEditor,
  type WorkItemDraft,
  remainingText,
  updateParam,
  useReferenceData,
} from '../app/shared'

const planningColumns = [
  { key: 'Not Started', statuses: ['Upcoming', 'Assigned'] as Status[] },
  { key: 'In Progress', statuses: ['Execution', 'Testing'] as Status[] },
  { key: 'Blocked', statuses: ['Blocked'] as Status[] },
  { key: 'Ready for Release', statuses: ['Await Deploy', 'Hypercare', 'Descoped'] as Status[] },
] as const

export function PlanningPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { categories, blockers, people, releases, workItems } = useReferenceData()
  const workItemMutations = useWorkItemMutations()
  const [open, setOpen] = useState(false)
  const [prefill, setPrefill] = useState<Partial<WorkItemDraft> | undefined>()

  const windowDays = Number(params.get('window') || '14')
  const lanes = (params.get('lanes') || 'none') as 'none' | 'assignee' | 'release'
  const includeNoGoal = params.get('noGoal') === '1'
  const search = params.get('q') || ''

  const scopedItems = workItems.filter((item) => {
    if (item.complete || item.status === 'Complete') {
      return false
    }
    const dueSoon = item.goalDate ? daysRemaining(item.goalDate) <= windowDays : false
    const inScope = item.assignedToId === null || dueSoon || (includeNoGoal && !item.goalDate)
    return inScope && matchesWorkItemSearch(item, people, search)
  })

  const laneKeys =
    lanes === 'assignee'
      ? ['unassigned', ...people.filter((person) => person.active).map((person) => person.id)]
      : lanes === 'release'
        ? ['none', ...[...releases].sort((left, right) => parseLocalDate(left.date).getTime() - parseLocalDate(right.date).getTime()).map((release) => release.id)]
        : ['all']

  return (
    <div className="page">
      <PageHeader
        icon={<FolderKanban size={24} />}
        title="Planning"
        subtitle="Kanban-style planning for unassigned or upcoming work."
        actions={
          <button type="button" className="primary-button" onClick={() => setOpen(true)}>
            New Work Item
          </button>
        }
      />
      <section className="card">
        <div className="filters-grid">
          <Field label="Window">
            <select className="form-input" value={String(windowDays)} onChange={(event) => updateParam(params, setParams, 'window', event.target.value)}>
              {[7, 14, 30].map((value) => (
                <option key={value} value={value}>
                  {value} days
                </option>
              ))}
            </select>
          </Field>
          <Field label="Swimlanes">
            <select className="form-input" value={lanes} onChange={(event) => updateParam(params, setParams, 'lanes', event.target.value)}>
              <option value="none">None</option>
              <option value="assignee">Assignee</option>
              <option value="release">Release</option>
            </select>
          </Field>
          <Field label="Search">
            <input className="form-input" value={search} onChange={(event) => updateParam(params, setParams, 'q', event.target.value)} />
          </Field>
          <label className="toggle">
            <input type="checkbox" checked={includeNoGoal} onChange={(event) => updateParam(params, setParams, 'noGoal', event.target.checked ? '1' : '')} />
            Include items without goal date
          </label>
        </div>
      </section>

      {scopedItems.length ? (
        <section className="planning-board">
          {planningColumns.map((column) => (
            <article key={column.key} className="planning-column">
              <div className="planning-column__header">
                <strong>{column.key}</strong>
                <span className="badge badge-neutral">
                  {scopedItems.filter((item) => column.statuses.includes(item.status)).length}
                </span>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setPrefill({ status: column.statuses[0] })
                    setOpen(true)
                  }}
                >
                  Add
                </button>
              </div>
              <div className="planning-lanes">
                {laneKeys.map((laneKey) => {
                  const laneItems = scopedItems
                    .filter((item) => column.statuses.includes(item.status))
                    .filter((item) => {
                      if (lanes === 'assignee') {
                        return laneKey === 'unassigned' ? item.assignedToId === null : item.assignedToId === laneKey
                      }
                      if (lanes === 'release') {
                        return laneKey === 'none' ? item.releaseId === null : item.releaseId === laneKey
                      }
                      return true
                    })
                  const laneLabel =
                    lanes === 'assignee'
                      ? laneKey === 'unassigned'
                        ? 'Unassigned'
                        : people.find((person) => person.id === laneKey)?.title || laneKey
                      : lanes === 'release'
                        ? laneKey === 'none'
                          ? 'No Release'
                          : releases.find((release) => release.id === laneKey)?.title || laneKey
                        : ''
                  return (
                    <div key={laneKey} className="planning-lane">
                      {lanes !== 'none' ? <h3>{laneLabel}</h3> : null}
                      {laneItems.length ? (
                        laneItems.map((item) => {
                          const activeBlockers = blockers.filter((blocker) => blocker.workItemId === item.workItemId && blocker.blockerActive)
                          return (
                            <button
                              key={item.workItemId}
                              type="button"
                              className="planning-card"
                              draggable
                              onDragStart={(event) => event.dataTransfer.setData('text/plain', item.workItemId)}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={async (event) => {
                                event.preventDefault()
                                const draggedId = event.dataTransfer.getData('text/plain')
                                const dragged = workItems.find((entry) => entry.workItemId === draggedId)
                                if (!dragged) {
                                  return
                                }
                                const nextStatus = column.statuses[0]
                                if (dragged.status === 'Blocked' && nextStatus !== 'Blocked' && activeBlockers.length) {
                                  window.alert('Open detail first: blocked items cannot leave Blocked until active blockers are cleared.')
                                  return
                                }
                                await workItemMutations.update.mutateAsync({
                                  ...dragged,
                                  status: nextStatus,
                                  assignedToId: lanes === 'assignee' ? (laneKey === 'unassigned' ? null : laneKey) : dragged.assignedToId,
                                  releaseId: lanes === 'release' ? (laneKey === 'none' ? null : laneKey) : dragged.releaseId,
                                })
                                touchLastChanged(dragged.workItemId)
                              }}
                              onClick={() => navigate(`/work-items/${item.workItemId}`)}
                            >
                              <strong>{item.title}</strong>
                              <small>{item.workItemId}</small>
                              <div className="row gap wrap">
                                {item.categoryId ? <span className="badge badge-fresh">{categories.find((category) => category.categoryId === item.categoryId)?.name}</span> : null}
                                <span className={sizeColor(item.size)}>{item.size}</span>
                              </div>
                              <PeopleChip person={people.find((person) => person.id === item.assignedToId)} />
                              <div className="row gap wrap">
                                {item.goalDate ? <span className={daysRemaining(item.goalDate) <= 0 ? 'badge badge-paprika' : 'badge badge-grain'}>{remainingText(item.goalDate)}</span> : null}
                                {item.releaseId ? <ReleaseBadge type={releases.find((release) => release.id === item.releaseId)?.releaseType || 'Other'} /> : null}
                                {activeBlockers.length ? <span className="badge badge-paprika">● {activeBlockers.length}</span> : null}
                              </div>
                            </button>
                          )
                        })
                      ) : (
                        <p className="muted-panel">No items in this lane.</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState icon={<FolderKanban size={28} />} title="No planning candidates" description="Nothing matches the current planning window and filters." />
      )}
      <WorkItemEditor open={open} onClose={() => setOpen(false)} prefill={prefill} />
    </div>
  )
}
