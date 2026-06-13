import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, ListTodo } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  STATUS_OPTIONS,
  blockerBadgeStatus,
  buildLinkUrl,
  computeNextValidation,
  computePriorStatus,
  daysRemaining,
  formatDisplayDate,
  getLastChanged,
  sizeColor,
  todayString,
  touchLastChanged,
  type Blocker,
  type Status,
  useBlockerMutations,
  useLinkMutations,
  useWorkItemMutations,
} from '../lib/worktrack'
import {
  EmptyState,
  Field,
  PageHeader,
  PeopleChip,
  ReleaseBadge,
  ValidationBadge,
  WorkItemLink,
} from '../lib/ui'
import {
  BlockerEditor,
  LinkEditor,
  WorkItemEditor,
  remainingText,
  useReferenceData,
} from '../app/shared'

export function WorkItemDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { categories, blockerTypes, workItems, people, releases, blockers, links } = useReferenceData()
  const item = workItems.find((entry) => entry.workItemId === id)
  const workItemMutations = useWorkItemMutations()
  const blockerMutations = useBlockerMutations()
  const linkMutations = useLinkMutations()

  const [editOpen, setEditOpen] = useState(false)
  const [blockerOpen, setBlockerOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [subtaskOpen, setSubtaskOpen] = useState(false)
  const [draftStatus, setDraftStatus] = useState<Status | ''>(item?.status || '')
  const [saveState, setSaveState] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    setDraftStatus(item?.status || '')
  }, [item?.status])

  useEffect(() => {
    if (!item || !draftStatus || draftStatus === item.status) {
      return
    }
    setSaveState('pending')
    const handle = window.setTimeout(async () => {
      try {
        setSaveState('saving')
        await workItemMutations.update.mutateAsync({
          ...item,
          status: draftStatus,
          complete: draftStatus === 'Complete',
        })
        touchLastChanged(item.workItemId)
        setSaveState('saved')
      } catch {
        setDraftStatus(item.status)
        setSaveState('error')
      }
    }, 1200)
    return () => window.clearTimeout(handle)
  }, [draftStatus, item, workItemMutations.update])

  if (!item) {
    return (
      <div className="page">
        <EmptyState
          icon={<AlertTriangle size={28} />}
          title="Work item not found"
          description="The requested work item could not be found."
          action={
            <Link className="primary-button" to="/work-items">
              Back to work items
            </Link>
          }
        />
      </div>
    )
  }

  const activeBlockers = blockers.filter((blocker) => blocker.workItemId === item.workItemId && blocker.blockerActive)
  const itemLinks = links.filter((link) => link.workItemId === item.workItemId)
  const children = workItems.filter((entry) => entry.parentItemId === item.workItemId)
  const category = categories.find((entry) => entry.categoryId === item.categoryId)
  const assignee = people.find((entry) => entry.id === item.assignedToId)
  const release = releases.find((entry) => entry.id === item.releaseId)

  const logBlocker = async (draft: { title: string; blockerTypeId: string; expectedResolution: string; assignedToId: string | null }) => {
    const blockerType = blockerTypes.find((entry) => entry.blockerTypeId === draft.blockerTypeId)
    if (!blockerType) {
      return
    }
    const today = todayString()
    await blockerMutations.create.mutateAsync({
      blockerId: `blk-${Date.now()}`,
      title: draft.title,
      workItemId: item.workItemId,
      blockerTypeId: blockerType.blockerTypeId,
      logged: today,
      assignedToId: draft.assignedToId,
      lastValidated: today,
      blockerActive: true,
      expectedResolution: draft.expectedResolution,
      nextValidation: computeNextValidation(today, blockerType.days),
      priorStatus: computePriorStatus(item, activeBlockers),
    })
    if (item.status !== 'Blocked') {
      await workItemMutations.update.mutateAsync({ ...item, status: 'Blocked' })
      touchLastChanged(item.workItemId)
    }
    setBlockerOpen(false)
  }

  return (
    <div className="page">
      <button type="button" className="back-link" onClick={() => navigate('/work-items')}>
        <ArrowLeft size={16} /> Back to work items
      </button>
      <PageHeader
        icon={<ListTodo size={24} />}
        title={item.title}
        subtitle={category ? category.name : 'No category'}
        actions={
          <button type="button" className="primary-button" onClick={() => setEditOpen(true)}>
            Edit
          </button>
        }
      />
      <div className="row gap wrap">
        <span className={sizeColor(item.size)}>{item.size}</span>
        {item.brf ? <span className="badge badge-grain">BRF</span> : null}
        {category?.development ? <span className="badge badge-fresh">Development</span> : null}
        {category?.capex ? <span className="badge badge-plum">CAPEX</span> : null}
        {item.complete ? <span className="badge badge-leaf">Complete</span> : null}
      </div>

      <section className="detail-grid">
        <article className="card">
          <h2>Details</h2>
          <div className="stack">
            <Field label="Status">
              <select
                className="form-input"
                value={draftStatus}
                onChange={(event) => setDraftStatus(event.target.value as Status)}
                disabled={item.status === 'Blocked'}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
            <small>Status autosave: {saveState}</small>
            <div className="detail-line">
              <strong>Assigned To</strong>
              <div>
                <PeopleChip person={assignee} />
                {item.assignedDate ? <small>Since {formatDisplayDate(item.assignedDate)}</small> : null}
              </div>
            </div>
            <div className="detail-line">
              <strong>Goal Date</strong>
              <span className={daysRemaining(item.goalDate) < 0 ? 'danger-text' : ''}>
                {formatDisplayDate(item.goalDate)} · {remainingText(item.goalDate)}
              </span>
            </div>
            <div className="detail-line">
              <strong>Release</strong>
              <div>
                {release ? (
                  <>
                    <span>{release.title}</span>
                    <div className="row gap wrap">
                      <ReleaseBadge type={release.releaseType} />
                      <span>{formatDisplayDate(release.date)}</span>
                    </div>
                  </>
                ) : (
                  <span>No release</span>
                )}
              </div>
            </div>
            <div className="detail-line">
              <strong>Parent</strong>
              {item.parentItemId ? <WorkItemLink to={`/work-items/${item.parentItemId}`} title={workItems.find((entry) => entry.workItemId === item.parentItemId)?.title || item.parentItemId} /> : <span>None</span>}
            </div>
            <div className="detail-line">
              <strong>Last Changed</strong>
              <span>{getLastChanged(item.workItemId)}</span>
            </div>
          </div>
        </article>
        <article className="card">
          <h2>Description</h2>
          <p>{item.description || 'No description provided.'}</p>
        </article>
      </section>

      <section className="detail-grid">
        <article className="card">
          <div className="card-header">
            <h2>Blockers</h2>
            <button type="button" className="primary-button" onClick={() => setBlockerOpen(true)}>
              Log a Blocker
            </button>
          </div>
          <div className="stack">
            {blockers.filter((blocker) => blocker.workItemId === item.workItemId).map((blocker) => {
              const blockerType = blockerTypes.find((entry) => entry.blockerTypeId === blocker.blockerTypeId)
              const status = blockerBadgeStatus(blocker.blockerActive, blocker.nextValidation)
              return (
                <div key={blocker.blockerId} className="list-row static">
                  <div>
                    <strong>{blocker.title}</strong>
                    <small>
                      {blockerType?.name} · Logged {formatDisplayDate(blocker.logged)}
                    </small>
                  </div>
                  <div className="row gap wrap">
                    <ValidationBadge status={status} />
                    {status === 'revalidate' ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={async () => {
                          const expectedResolution = window.prompt('Expected resolution (yyyy-mm-dd)', blocker.expectedResolution)
                          if (!expectedResolution || daysRemaining(expectedResolution) <= 0) {
                            return
                          }
                          const blockerTypeDays = blockerType?.days || 1
                          await blockerMutations.update.mutateAsync({
                            ...blocker,
                            lastValidated: todayString(),
                            expectedResolution,
                            nextValidation: computeNextValidation(todayString(), blockerTypeDays),
                          })
                        }}
                      >
                        Revalidate
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={!blocker.blockerActive}
                      onClick={async () => {
                        const cleared: Blocker = { ...blocker, blockerActive: false, lastValidated: todayString() }
                        await blockerMutations.update.mutateAsync(cleared)
                        const remaining = activeBlockers.filter((entry) => entry.blockerId !== blocker.blockerId)
                        if (!remaining.length) {
                          const restoredStatus =
                            blocker.priorStatus && blocker.priorStatus !== 'Blocked' ? (blocker.priorStatus as Status) : 'Execution'
                          await workItemMutations.update.mutateAsync({ ...item, status: restoredStatus })
                          touchLastChanged(item.workItemId)
                        }
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </article>
        <article className="card">
          <div className="card-header">
            <h2>Links</h2>
            <button type="button" className="primary-button" onClick={() => setLinkOpen(true)}>
              Document Link
            </button>
          </div>
          <div className="stack">
            {itemLinks.map((link) => (
              <div key={link.linkId} className="list-row static">
                <a href={buildLinkUrl(link.linkType, link.number)} target="_blank" rel="noreferrer">
                  {link.name}
                </a>
                <span className="badge badge-neutral">{link.linkType}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <article className="card">
        <div className="card-header">
          <h2>Sub-tasks</h2>
          <button type="button" className="primary-button" onClick={() => setSubtaskOpen(true)}>
            Create Subtask
          </button>
        </div>
        <div className="stack">
          {children.length ? children.map((child) => <WorkItemLink key={child.workItemId} to={`/work-items/${child.workItemId}`} title={child.title} subtitle={child.workItemId} />) : <p>No sub-tasks yet.</p>}
        </div>
      </article>

      <WorkItemEditor open={editOpen} onClose={() => setEditOpen(false)} initial={item} />
      <BlockerEditor open={blockerOpen} onClose={() => setBlockerOpen(false)} workItem={item} onSubmit={logBlocker} />
      <LinkEditor
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        workItemId={item.workItemId}
        existingLinks={links}
        onSubmit={async (draft) => {
          await linkMutations.create.mutateAsync(draft)
          setLinkOpen(false)
        }}
      />
      <WorkItemEditor open={subtaskOpen} onClose={() => setSubtaskOpen(false)} prefill={{ parentItemId: item.workItemId, categoryId: item.categoryId, status: 'Upcoming' }} />
    </div>
  )
}
