import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import {
  blockerBadgeStatus,
  computeNextValidation,
  computePriorStatus,
  formatDisplayDate,
  todayString,
  touchLastChanged,
  useBlockerMutations,
  useWorkItemMutations,
} from '../lib/worktrack'
import {
  EmptyState,
  PageHeader,
  PeopleChip,
  ValidationBadge,
  WorkItemLink,
} from '../components'
import { groupBy, useReferenceData } from '../app/shared'
import { NewBlockerDialog } from '../components/blockers/NewBlockerDialog'

export function BlockersPage() {
  const { blockerTypes, blockers, workItems, people } = useReferenceData()
  const [activeOnly, setActiveOnly] = useState(true)
  const [open, setOpen] = useState(false)
  const blockerMutations = useBlockerMutations()
  const workItemMutations = useWorkItemMutations()

  const filtered = blockers.filter((blocker) => (activeOnly ? blocker.blockerActive : true))
  const grouped = groupBy(filtered, (blocker) => blocker.workItemId)

  return (
    <div className="page">
      <PageHeader
        icon={<ShieldAlert size={24} />}
        title="Blockers"
        subtitle="Group blockers by work item and keep validation dates current."
        actions={
          <button type="button" className="primary-button" onClick={() => setOpen(true)}>
            New Blocker
          </button>
        }
      />
      <div className="row gap wrap">
        <label className="toggle">
          <input type="checkbox" checked={activeOnly} onChange={(event) => setActiveOnly(event.target.checked)} />
          Show only active
        </label>
        <span>{filtered.length} blockers</span>
      </div>

      {filtered.length ? (
        Object.entries(grouped).map(([workItemId, items]) => {
          const workItem = workItems.find((entry) => entry.workItemId === workItemId)
          return (
            <article key={workItemId} className="card">
              <div className="group-header surface-plum">
                {workItem ? <WorkItemLink to={`/work-items/${workItemId}`} title={workItem.title} subtitle={workItemId} /> : <h2>{workItemId}</h2>}
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Blocker</th>
                    <th>Type</th>
                    <th>Assigned</th>
                    <th>Next Validation</th>
                    <th>Expected Resolution</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((blocker) => (
                    <tr key={blocker.blockerId}>
                      <td>{blocker.title}</td>
                      <td>{blockerTypes.find((entry) => entry.blockerTypeId === blocker.blockerTypeId)?.name || '—'}</td>
                      <td>
                        <PeopleChip person={people.find((entry) => entry.id === blocker.assignedToId)} />
                      </td>
                      <td>{formatDisplayDate(blocker.nextValidation)}</td>
                      <td>{formatDisplayDate(blocker.expectedResolution)}</td>
                      <td>
                        <ValidationBadge status={blockerBadgeStatus(blocker.blockerActive, blocker.nextValidation)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          )
        })
      ) : (
        <EmptyState icon={<ShieldAlert size={28} />} title="No blockers" description="Everything is clear right now." />
      )}

      <NewBlockerDialog
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={async (draft, workItemId) => {
          if (!workItemId) {
            return
          }
          const blockerType = blockerTypes.find((entry) => entry.blockerTypeId === draft.blockerTypeId)
          const workItem = workItems.find((entry) => entry.workItemId === workItemId)
          if (!blockerType || !workItem) {
            return
          }
          const today = todayString()
          await blockerMutations.create.mutateAsync({
            blockerId: `blk-${Date.now()}`,
            title: draft.title,
            workItemId,
            blockerTypeId: draft.blockerTypeId,
            logged: today,
            assignedToId: draft.assignedToId,
            lastValidated: today,
            blockerActive: true,
            expectedResolution: draft.expectedResolution,
            nextValidation: computeNextValidation(today, blockerType.days),
            priorStatus: computePriorStatus(workItem, blockers.filter((blocker) => blocker.workItemId === workItemId && blocker.blockerActive)),
          })
          if (workItem.status !== 'Blocked') {
            await workItemMutations.update.mutateAsync({ ...workItem, status: 'Blocked' })
            touchLastChanged(workItem.workItemId)
          }
          setOpen(false)
        }}
      />
    </div>
  )
}
