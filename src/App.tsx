import { Suspense, useEffect, useState } from 'react'
import { QueryClient } from '@tanstack/react-query'
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  FolderKanban,
  LayoutDashboard,
  Link2,
  ListTodo,
  Milestone,
  Rocket,
  ShieldAlert,
  Tags,
  Users,
} from 'lucide-react'
import {
  LINK_TYPE_OPTIONS,
  RELEASE_TYPE_OPTIONS,
  SIZE_OPTIONS,
  STATUS_GROUPS,
  STATUS_OPTIONS,
  blockerBadgeStatus,
  buildLinkUrl,
  computeNextValidation,
  computePriorStatus,
  daysRemaining,
  deriveLinkDisplayName,
  formatDisplayDate,
  getLastChanged,
  loadDb,
  matchesWorkItemSearch,
  normalizeLinkNumber,
  parseLocalDate,
  releaseSequence,
  releaseTypeColor,
  sizeColor,
  sortBlockerTypesForDialog,
  statusColor,
  todayString,
  touchLastChanged,
  type Blocker,
  type Category,
  type Link as WorkLink,
  type LinkType,
  type Person,
  type Release,
  type ReleaseType,
  type Size,
  type Status,
  type WorkItem,
  useBlockerMutations,
  useBlockerTypes,
  useBlockerTypeMutations,
  useBlockers,
  useCategories,
  useCategoryMutations,
  useDeletePersonCascade,
  useLinkMutations,
  useLinks,
  usePersonMutations,
  usePersons,
  useReleaseMutations,
  useReleases,
  useWorkItemMutations,
  useWorkItems,
  validateLinkNumber,
} from './lib/worktrack'
import {
  AppErrorBoundary,
  AppLayout,
  CategoryBar,
  EmptyState,
  Field,
  MetricCard,
  Modal,
  PageHeader,
  PeopleChip,
  PersonPicker,
  ReleaseBadge,
  RowShimmer,
  StatusDonut,
  ValidationBadge,
  WorkItemLink,
  statusGroupCounts,
} from './lib/ui'

export const queryClient = new QueryClient()

type WorkItemDraft = {
  title: string
  description: string
  assignedToId: string | null
  goalDate: string
  brf: boolean
  complete: boolean
  categoryId: string | null
  parentItemId: string | null
  releaseId: string | null
  size: Size
  status: Status
}

const deriveBasename = () => {
  if (import.meta.env.DEV) {
    return undefined
  }
  const firstSegment = window.location.pathname.split('/').filter(Boolean)[0]
  return firstSegment ? `/${firstSegment}` : undefined
}

const Shell = () => (
  <AppLayout>
    <Suspense fallback={<div className="page"><RowShimmer /></div>}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/work-items" element={<WorkItemsPage />} />
        <Route path="/work-items/:id" element={<WorkItemDetailPage />} />
        <Route path="/planning" element={<PlanningPage />} />
        <Route path="/blockers" element={<BlockersPage />} />
        <Route path="/links" element={<LinksPage />} />
        <Route path="/releases" element={<ReleasesViewPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/blocker-types" element={<BlockerTypesPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/releases-md" element={<ReleasesMasterDataPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  </AppLayout>
)

export default function App() {
  return (
    <BrowserRouter basename={deriveBasename()}>
      <AppErrorBoundary>
        <Shell />
      </AppErrorBoundary>
    </BrowserRouter>
  )
}

const useReferenceData = () => {
  const categories = useCategories().data ?? []
  const blockerTypes = useBlockerTypes().data ?? []
  const workItems = useWorkItems().data ?? []
  const links = useLinks().data ?? []
  const blockers = useBlockers().data ?? []
  const people = usePersons().data ?? []
  const releases = useReleases().data ?? []
  return { categories, blockerTypes, workItems, links, blockers, people, releases }
}

const quickCreatePerson = async (email: string, createPerson: ReturnType<typeof usePersonMutations>['create']) => {
  const normalized = email.trim().toLowerCase()
  if (!/^[^@\s]+@pepsico\.com$/i.test(normalized)) {
    window.alert('Please enter a valid pepsico.com email.')
    return null
  }
  const id = `per-${Date.now()}`
  await createPerson.mutateAsync({
    id,
    title: '',
    email: normalized,
    role: '',
    active: true,
    pendingCreatedAt: Date.now(),
  })
  return id
}

const remainingText = (goalDate: string) => {
  const remaining = daysRemaining(goalDate)
  if (!Number.isFinite(remaining)) {
    return 'No goal date'
  }
  if (remaining < 0) {
    return `${Math.abs(remaining)}d overdue`
  }
  if (remaining === 0) {
    return 'Due today'
  }
  return `${remaining}d left`
}

const planningColumns = [
  { key: 'Not Started', statuses: ['Upcoming', 'Assigned'] as Status[] },
  { key: 'In Progress', statuses: ['Execution', 'Testing'] as Status[] },
  { key: 'Blocked', statuses: ['Blocked'] as Status[] },
  { key: 'Ready for Release', statuses: ['Await Deploy', 'Hypercare', 'Descoped'] as Status[] },
] as const

function DashboardPage() {
  const navigate = useNavigate()
  const { categories, workItems, blockers, people, releases } = useReferenceData()

  const incomplete = workItems.filter((item) => !item.complete && item.status !== 'Complete')
  const counts = {
    total: workItems.length,
    progress: workItems.filter((item) => STATUS_GROUPS[item.status] === 'In-Progress').length,
    complete: workItems.filter((item) => item.complete || item.status === 'Complete').length,
    blocked: workItems.filter((item) => item.status === 'Blocked').length,
  }

  const openFiltered = (params: URLSearchParams) => {
    const filtered = applyWorkItemFilters(workItems, people, params)
    if (filtered.length === 1) {
      navigate(`/work-items/${filtered[0].workItemId}`)
      return
    }
    navigate(`/work-items?${params.toString()}`)
  }

  const statusCounts = statusGroupCounts(workItems.map((item) => item.status))
  const categoryRows = categories
    .map((category) => ({
      label: category.name,
      value: workItems.filter((item) => item.categoryId === category.categoryId).length,
    }))
    .filter((row) => row.value > 0)
    .sort((left, right) => right.value - left.value)
    .slice(0, 8)
  const upcoming = [...incomplete]
    .filter((item) => item.goalDate)
    .sort((left, right) => parseLocalDate(left.goalDate).getTime() - parseLocalDate(right.goalDate).getTime())
    .slice(0, 6)
  const activeBlockers = blockers.filter((blocker) => blocker.blockerActive).slice(0, 5)
  const nextRelease = [...releases]
    .filter((release) => release.active)
    .sort((left, right) => parseLocalDate(left.date).getTime() - parseLocalDate(right.date).getTime())[0]
  const nextReleaseCount = nextRelease
    ? workItems.filter((item) => item.releaseId === nextRelease.id).length
    : 0
  const needsPlanningIds = new Set(
    workItems
      .filter((item) => !item.complete && (item.assignedToId === null || (!!item.goalDate && daysRemaining(item.goalDate) <= 14)))
      .map((item) => item.workItemId),
  )

  return (
    <div className="page">
      <PageHeader
        icon={<LayoutDashboard size={24} />}
        title="Dashboard"
        subtitle="Track seeded priorities, upcoming dates, blockers, and releases from one view."
      />

      <section className="metrics-grid">
        <MetricCard label="Total Work Items" value={counts.total} onClick={() => openFiltered(new URLSearchParams())} />
        <MetricCard label="In Progress" value={counts.progress} onClick={() => openFiltered(new URLSearchParams({ statusGroup: 'In-Progress' }))} />
        <MetricCard label="Complete" value={counts.complete} onClick={() => openFiltered(new URLSearchParams({ complete: '1' }))} />
        <MetricCard label="Blocked" value={counts.blocked} onClick={() => openFiltered(new URLSearchParams({ status: 'Blocked' }))} />
        <MetricCard label="Needs Planning" value={needsPlanningIds.size} onClick={() => navigate('/planning?window=14')} />
        <button type="button" className="release-card" onClick={() => navigate('/releases')}>
          <span>Next Release</span>
          {nextRelease ? (
            <>
              <strong>{nextRelease.title}</strong>
              <div className="row gap">
                <ReleaseBadge type={nextRelease.releaseType} />
                <span>{formatDisplayDate(nextRelease.date)}</span>
                <span>{nextReleaseCount} items</span>
              </div>
            </>
          ) : (
            <strong>No active release</strong>
          )}
        </button>
      </section>

      <section className="two-column">
        <article className="card">
          <h2>Status Mix</h2>
          <StatusDonut counts={statusCounts} />
        </article>
        <article className="card">
          <h2>Category Coverage</h2>
          <CategoryBar
            rows={categoryRows}
            onSelect={(name) => {
              const category = categories.find((entry) => entry.name === name)
              if (category) {
                navigate(`/work-items?category=${category.categoryId}`)
              }
            }}
          />
        </article>
      </section>

      <section className="two-column">
        <article className="card">
          <h2>Upcoming Goal Dates</h2>
          {upcoming.length ? (
            <div className="stack">
              {upcoming.map((item) => {
                const person = people.find((entry) => entry.id === item.assignedToId)
                return (
                  <button key={item.workItemId} type="button" className="list-row" onClick={() => navigate(`/work-items/${item.workItemId}`)}>
                    <div>
                      <strong>{item.title}</strong>
                      <div className="row gap wrap">
                        <PeopleChip person={person} />
                        <span>{formatDisplayDate(item.goalDate)}</span>
                        <span className={statusColor(item.status)}>{item.status}</span>
                      </div>
                    </div>
                    <span className={daysRemaining(item.goalDate) < 0 ? 'danger-text' : ''}>{remainingText(item.goalDate)}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <EmptyState icon={<ListTodo size={24} />} title="No upcoming work" description="All incomplete work items are missing goal dates." />
          )}
        </article>
        <article className="card">
          <h2>Active Blockers</h2>
          {activeBlockers.length ? (
            <div className="stack">
              {activeBlockers.map((blocker) => {
                const workItem = workItems.find((item) => item.workItemId === blocker.workItemId)
                return (
                  <button
                    key={blocker.blockerId}
                    type="button"
                    className="list-row"
                    onClick={() => navigate(workItem ? `/work-items/${workItem.workItemId}` : '/blockers')}
                  >
                    <div>
                      <strong>{blocker.title}</strong>
                      <small>{workItem?.title || 'Blocker record'}</small>
                    </div>
                    <ValidationBadge status={blockerBadgeStatus(blocker.blockerActive, blocker.nextValidation)} />
                  </button>
                )
              })}
            </div>
          ) : (
            <EmptyState icon={<ShieldAlert size={24} />} title="No active blockers" description="Everything is currently unblocked." />
          )}
        </article>
      </section>
    </div>
  )
}

function WorkItemsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { categories, workItems, people, releases } = useReferenceData()
  const [open, setOpen] = useState(false)

  const filtered = applyWorkItemFilters(workItems, people, params)
  const grouping = params.get('group') === 'release' ? 'release' : 'category'

  const groups = groupWorkItems(filtered, grouping, categories, releases)

  return (
    <div className="page">
      <PageHeader
        icon={<ListTodo size={24} />}
        title="Work Items"
        subtitle="Filter, group, and manage work items with routing-friendly URL state."
        actions={
          <button type="button" className="primary-button gradient-primary" onClick={() => setOpen(true)}>
            New Item
          </button>
        }
      />

      <section className="card sticky-card">
        <div className="filters-grid">
          <Field label="Search">
            <input className="form-input" value={params.get('q') || ''} onChange={(event) => updateParam(params, setParams, 'q', event.target.value)} />
          </Field>
          <Field label="Status">
            <select className="form-input" value={params.get('status') || ''} onChange={(event) => updateParam(params, setParams, 'status', event.target.value)}>
              <option value="">All</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select className="form-input" value={params.get('category') || ''} onChange={(event) => updateParam(params, setParams, 'category', event.target.value)}>
              <option value="">All</option>
              {categories.filter((category) => category.active).map((category) => (
                <option key={category.categoryId} value={category.categoryId}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Release">
            <select className="form-input" value={params.get('release') || ''} onChange={(event) => updateParam(params, setParams, 'release', event.target.value)}>
              <option value="">All</option>
              {releases.filter((release) => release.active).map((release) => (
                <option key={release.id} value={release.id}>
                  {release.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="row gap wrap">
          <button type="button" className={grouping === 'category' ? 'primary-button' : 'secondary-button'} onClick={() => updateParam(params, setParams, 'group', 'category')}>
            Group by Category
          </button>
          <button type="button" className={grouping === 'release' ? 'primary-button' : 'secondary-button'} onClick={() => updateParam(params, setParams, 'group', 'release')}>
            Group by Release
          </button>
          <button type="button" className="secondary-button" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
            Clear all
          </button>
        </div>
        <div className="filter-chips">
          {[...params.entries()].map(([key, value]) => (
            <button key={`${key}-${value}`} type="button" className="badge badge-neutral" onClick={() => updateParam(params, setParams, key, '')}>
              {key}: {value} ✕
            </button>
          ))}
        </div>
      </section>

      {filtered.length ? (
        groups.map((group) => (
          <article key={group.label} className="card">
            <div className={`group-header ${grouping === 'release' ? 'surface-plum' : 'surface-fresh'}`}>
              <h2>{group.label}</h2>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Category</th>
                  <th>Size</th>
                  <th>Assigned</th>
                  <th>Goal</th>
                  <th>Remaining</th>
                  {grouping === 'category' ? <th>Release</th> : null}
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => {
                  const person = people.find((entry) => entry.id === item.assignedToId)
                  const category = categories.find((entry) => entry.categoryId === item.categoryId)
                  const release = releases.find((entry) => entry.id === item.releaseId)
                  const parent = workItems.find((entry) => entry.workItemId === item.parentItemId)
                  return (
                    <tr key={item.workItemId} tabIndex={0} onClick={() => navigate(`/work-items/${item.workItemId}`)} onKeyDown={(event) => event.key === 'Enter' && navigate(`/work-items/${item.workItemId}`)}>
                      <td>
                        <strong>{item.title}</strong>
                        {parent ? <small>Child of {parent.title}</small> : null}
                      </td>
                      <td>
                        <span className={statusColor(item.status)}>{item.status}</span>
                      </td>
                      <td>{category?.name || 'None'}</td>
                      <td>
                        <span className={sizeColor(item.size)}>{item.size}</span>
                      </td>
                      <td>
                        <PeopleChip person={person} />
                      </td>
                      <td>{formatDisplayDate(item.goalDate)}</td>
                      <td className={daysRemaining(item.goalDate) < 0 ? 'danger-text' : ''}>{remainingText(item.goalDate)}</td>
                      {grouping === 'category' ? <td>{release?.title || 'No Release'}</td> : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </article>
        ))
      ) : (
        <EmptyState
          icon={<FolderKanban size={28} />}
          title="No work items match"
          description="Adjust the filters or create a new work item."
          action={
            <button type="button" className="primary-button" onClick={() => setOpen(true)}>
              New Item
            </button>
          }
        />
      )}

      <WorkItemEditor open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

function WorkItemDetailPage() {
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
        onSubmit={async (draft) => {
          await linkMutations.create.mutateAsync(draft)
          setLinkOpen(false)
        }}
      />
      <WorkItemEditor open={subtaskOpen} onClose={() => setSubtaskOpen(false)} prefill={{ parentItemId: item.workItemId, categoryId: item.categoryId, status: 'Upcoming' }} />
    </div>
  )
}

function BlockersPage() {
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

      <BlockerEditor
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

function LinksPage() {
  const { workItems, links } = useReferenceData()
  const linkMutations = useLinkMutations()
  const [editing, setEditing] = useState<WorkLink | null>(null)
  const [open, setOpen] = useState(false)

  const grouped = groupBy(links, (link) => link.workItemId)

  return (
    <div className="page">
      <PageHeader
        icon={<Link2 size={24} />}
        title="Links"
        subtitle="Document and normalize cross-system references by work item."
        actions={
          <button type="button" className="primary-button" onClick={() => setOpen(true)}>
            New Link
          </button>
        }
      />

      <section className="card-grid">
        {Object.entries(grouped).map(([workItemId, items]) => {
          const workItem = workItems.find((entry) => entry.workItemId === workItemId)
          return (
            <article key={workItemId} className="card">
              <div className="group-header surface-ice">
                {workItem ? <WorkItemLink to={`/work-items/${workItemId}`} title={workItem.title} subtitle={workItemId} /> : <h2>{workItemId}</h2>}
              </div>
              <div className="stack">
                {items.map((link) => (
                  <div key={link.linkId} className="list-row static">
                    <div>
                      <span className={`badge badge-${link.linkType.toLowerCase()}`}>{link.linkType}</span>
                      <a href={buildLinkUrl(link.linkType, link.number)} target="_blank" rel="noreferrer">
                        {link.name}
                      </a>
                    </div>
                    <div className="row gap wrap">
                      <small>{link.number}</small>
                      <button type="button" className="secondary-button" onClick={() => setEditing(link)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={async () => {
                          if (window.confirm(`Delete ${link.name}?`)) {
                            await linkMutations.remove.mutateAsync(link.linkId)
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          )
        })}
      </section>

      <LinkEditor
        open={open || !!editing}
        onClose={() => {
          setOpen(false)
          setEditing(null)
        }}
        initial={editing || undefined}
        onSubmit={async (draft) => {
          if (editing) {
            await linkMutations.update.mutateAsync(draft)
          } else {
            await linkMutations.create.mutateAsync(draft)
          }
          setOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}

function ReleasesViewPage() {
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
                      <tr key={item.workItemId} onClick={() => navigate(`/work-items/${item.workItemId}`)}>
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

function CategoriesPage() {
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

function BlockerTypesPage() {
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

function PeoplePage() {
  const { people } = useReferenceData()
  const personMutations = usePersonMutations()
  const deleteCascade = useDeletePersonCascade()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Person | null>(null)
  const [email, setEmail] = useState('')

  return (
    <div className="page">
      <PageHeader
        icon={<Users size={24} />}
        title="People"
        subtitle="Manage assignees, pending enrichment, and cascade deletion."
      />

      <section className="card">
        <div className="row gap wrap">
          <input className="form-input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@pepsico.com" />
          <button
            type="button"
            className="primary-button"
            onClick={async () => {
              const created = await quickCreatePerson(email, personMutations.create)
              if (created) {
                setEmail('')
              }
            }}
          >
            New Person
          </button>
        </div>
      </section>

      <section className="stack">
        {people.map((person) => {
          const pending = !person.title || !person.role
          return (
            <article key={person.id} className={`card person-row ${pending ? 'person-row--pending' : ''}`}>
              <PeopleChip person={person} fullRow size="md" />
              <div className="row gap wrap">
                {pending ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={async () => {
                      if (window.confirm(`Delete pending person ${person.email}?`)) {
                        await personMutations.remove.mutateAsync(person.id)
                      }
                    }}
                  >
                    ✕
                  </button>
                ) : (
                  <>
                    <button type="button" className="secondary-button" onClick={() => setEditing(person)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={async () => {
                        if (window.confirm(`Delete ${person.title}?`)) {
                          await deleteCascade.mutateAsync(person.id)
                        }
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </article>
          )
        })}
      </section>

      <PersonEditor
        open={open || !!editing}
        onClose={() => {
          setOpen(false)
          setEditing(null)
        }}
        initial={editing || undefined}
        onSubmit={async (person) => {
          if (editing) {
            await personMutations.update.mutateAsync(person)
          } else {
            await personMutations.create.mutateAsync(person)
          }
          setOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}

function ReleasesMasterDataPage() {
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

function PlanningPage() {
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

function NotFoundPage() {
  return (
    <div className="page">
      <EmptyState icon={<AlertTriangle size={28} />} title="Page not found" description="The requested route does not exist in WorkTrack v2." />
    </div>
  )
}

function WorkItemEditor({
  open,
  onClose,
  initial,
  prefill,
}: {
  open: boolean
  onClose: () => void
  initial?: WorkItem
  prefill?: Partial<WorkItemDraft>
}) {
  const { categories, people, releases, workItems } = useReferenceData()
  const workItemMutations = useWorkItemMutations()
  const personMutations = usePersonMutations()
  const [draft, setDraft] = useState<WorkItemDraft>(() => mapWorkItemToDraft(initial, prefill))

  useEffect(() => {
    setDraft(mapWorkItemToDraft(initial, prefill))
  }, [initial, open, prefill])

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Work Item' : 'New Work Item'}>
      <div className="modal-form">
        <Field label="Title" required>
          <input className="form-input" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
        </Field>
        <Field label="Description">
          <textarea className="form-input" rows={5} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
        </Field>
        <Field label="Status">
          <select className="form-input" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as Status, complete: event.target.value === 'Complete' }))} disabled={initial?.status === 'Blocked'}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Size" required>
          <select className="form-input" value={draft.size} onChange={(event) => setDraft((current) => ({ ...current, size: event.target.value as Size }))}>
            {SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select className="form-input" value={draft.categoryId || ''} onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value || null }))}>
            <option value="">None</option>
            {categories.filter((category) => category.active).map((category) => (
              <option key={category.categoryId} value={category.categoryId}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        {initial ? (
          <Field label="Parent Item">
            <select className="form-input" value={draft.parentItemId || ''} onChange={(event) => setDraft((current) => ({ ...current, parentItemId: event.target.value || null }))}>
              <option value="">None</option>
              {workItems.filter((item) => item.workItemId !== initial.workItemId).map((item) => (
                <option key={item.workItemId} value={item.workItemId}>
                  {item.title}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="Assigned To">
          <PersonPicker
            people={people}
            value={draft.assignedToId}
            onChange={(value) => setDraft((current) => ({ ...current, assignedToId: value }))}
            onQuickCreate={(email) => quickCreatePerson(email, personMutations.create)}
          />
        </Field>
        {initial ? (
          <Field label="Assigned Date">
            <input className="form-input" type="date" value={draft.assignedToId ? initial.assignedDate || todayString() : ''} disabled />
          </Field>
        ) : null}
        <Field label="Goal Date">
          <input className="form-input" type="date" value={draft.goalDate} onChange={(event) => setDraft((current) => ({ ...current, goalDate: event.target.value }))} />
        </Field>
        <Field label="Release">
          <select className="form-input" value={draft.releaseId || ''} onChange={(event) => setDraft((current) => ({ ...current, releaseId: event.target.value || null }))}>
            <option value="">None</option>
            {releases.filter((release) => release.active).map((release) => (
              <option key={release.id} value={release.id}>
                {release.title}
              </option>
            ))}
          </select>
        </Field>
        <label className="toggle">
          <input type="checkbox" checked={draft.brf} onChange={(event) => setDraft((current) => ({ ...current, brf: event.target.checked }))} />
          BRF
        </label>
        <label className="toggle">
          <input type="checkbox" checked={draft.complete} onChange={(event) => setDraft((current) => ({ ...current, complete: event.target.checked, status: event.target.checked ? 'Complete' : current.status }))} />
          Complete
        </label>
        <button
          type="button"
          className="primary-button"
          disabled={!draft.title.trim()}
          onClick={async () => {
            const assignedDate = draft.assignedToId ? initial?.assignedDate || todayString() : ''
            const nextItem: WorkItem = initial
              ? { ...initial, ...draft, assignedDate }
              : {
                  workItemId: `wi-${Date.now()}`,
                  ...draft,
                  assignedDate,
                }
            if (initial) {
              await workItemMutations.update.mutateAsync(nextItem)
            } else {
              await workItemMutations.create.mutateAsync(nextItem)
            }
            touchLastChanged(nextItem.workItemId)
            onClose()
          }}
        >
          Save
        </button>
      </div>
    </Modal>
  )
}

function BlockerEditor({
  open,
  onClose,
  workItem,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  workItem?: WorkItem
  onSubmit: (draft: { title: string; blockerTypeId: string; expectedResolution: string; assignedToId: string | null }, workItemId?: string) => Promise<void>
}) {
  const { blockerTypes, people, workItems } = useReferenceData()
  const personMutations = usePersonMutations()
  const [title, setTitle] = useState('')
  const [blockerTypeId, setBlockerTypeId] = useState(blockerTypes[0]?.blockerTypeId || '')
  const [expectedResolution, setExpectedResolution] = useState(todayString())
  const [assignedToId, setAssignedToId] = useState<string | null>(workItem?.assignedToId || null)
  const [workItemId, setWorkItemId] = useState(workItem?.workItemId || workItems[0]?.workItemId || '')

  useEffect(() => {
    setTitle('')
    setBlockerTypeId(sortBlockerTypesForDialog(blockerTypes)[0]?.blockerTypeId || '')
    setExpectedResolution(todayString())
    setAssignedToId(workItem?.assignedToId || null)
    setWorkItemId(workItem?.workItemId || workItems[0]?.workItemId || '')
  }, [blockerTypes, open, workItem, workItems])

  const selectedType = blockerTypes.find((entry) => entry.blockerTypeId === blockerTypeId)
  return (
    <Modal open={open} onClose={onClose} title="Log a Blocker">
      <div className="modal-form">
        {!workItem ? (
          <Field label="Work item" required>
            <select className="form-input" value={workItemId} onChange={(event) => setWorkItemId(event.target.value)}>
              {workItems.map((item) => (
                <option key={item.workItemId} value={item.workItemId}>
                  {item.title}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="Title" required>
          <input className="form-input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field label="Blocker Type" required>
          <select className="form-input" value={blockerTypeId} onChange={(event) => setBlockerTypeId(event.target.value)}>
            {sortBlockerTypesForDialog(blockerTypes).map((type) => (
              <option key={type.blockerTypeId} value={type.blockerTypeId}>
                {type.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Expected Resolution" required>
          <input className="form-input" type="date" value={expectedResolution} onChange={(event) => setExpectedResolution(event.target.value)} />
        </Field>
        <Field label="Assigned Person">
          <PersonPicker
            people={people}
            value={assignedToId}
            onChange={setAssignedToId}
            onQuickCreate={(email) => quickCreatePerson(email, personMutations.create)}
          />
        </Field>
        <div className="muted-panel">Logged and last validated: {formatDisplayDate(todayString())}</div>
        <div className="muted-panel">Next validation: {selectedType ? formatDisplayDate(computeNextValidation(todayString(), selectedType.days)) : '—'}</div>
        <button
          type="button"
          className="primary-button"
          disabled={!title.trim() || !blockerTypeId || !expectedResolution}
          onClick={async () => {
            await onSubmit({ title, blockerTypeId, expectedResolution, assignedToId }, workItem ? undefined : workItemId)
          }}
        >
          Save blocker
        </button>
      </div>
    </Modal>
  )
}

function LinkEditor({
  open,
  onClose,
  initial,
  workItemId,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  initial?: WorkLink
  workItemId?: string
  onSubmit: (draft: WorkLink) => Promise<void>
}) {
  const { workItems } = useReferenceData()
  const [type, setType] = useState<LinkType>('RITM')
  const [number, setNumber] = useState('')
  const [selectedWorkItemId, setSelectedWorkItemId] = useState(workItemId || workItems[0]?.workItemId || '')

  useEffect(() => {
    setType(initial?.linkType || 'RITM')
    setNumber(initial?.number || '')
    setSelectedWorkItemId(initial?.workItemId || workItemId || workItems[0]?.workItemId || '')
  }, [initial, open, workItemId, workItems])

  const normalized = normalizeLinkNumber(type, number)
  const warning = validateLinkNumber(type, number)
  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Link' : 'Document Link'}>
      <div className="modal-form">
        <Field label="Type">
          <select className="form-input" value={type} onChange={(event) => setType(event.target.value as LinkType)}>
            {LINK_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Number / ID">
          <input className="form-input" value={number} onChange={(event) => setNumber(event.target.value)} />
        </Field>
        <Field label="Work item">
          <select className="form-input" value={selectedWorkItemId} onChange={(event) => setSelectedWorkItemId(event.target.value)}>
            {workItems.map((item) => (
              <option key={item.workItemId} value={item.workItemId}>
                {item.title}
              </option>
            ))}
          </select>
        </Field>
        {warning ? <p className="danger-text">{warning}</p> : null}
        <div className="preview-panel">Preview: {normalized ? deriveLinkDisplayName(type, normalized) : '—'}</div>
        <button
          type="button"
          className="primary-button"
          disabled={!normalized || !!warning}
          onClick={async () => {
            await onSubmit({
              linkId: initial?.linkId || `lnk-${Date.now()}`,
              linkType: type,
              number: normalized,
              name: deriveLinkDisplayName(type, normalized),
              workItemId: selectedWorkItemId,
            })
            onClose()
          }}
        >
          Save link
        </button>
      </div>
    </Modal>
  )
}

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

function PersonEditor({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  initial?: Person
  onSubmit: (person: Person) => Promise<void>
}) {
  const [draft, setDraft] = useState(
    initial || { id: `per-${Date.now()}`, title: '', email: '', role: '', active: true } satisfies Person,
  )
  useEffect(() => {
    setDraft(initial || { id: `per-${Date.now()}`, title: '', email: '', role: '', active: true })
  }, [initial, open])
  return (
    <Modal open={open} onClose={onClose} title="Edit Person">
      <div className="modal-form">
        <Field label="Name">
          <input className="form-input" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
        </Field>
        <Field label="Email" required>
          <input className="form-input" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
        </Field>
        <Field label="Role">
          <input className="form-input" value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))} />
        </Field>
        <label className="toggle"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} />Active</label>
        <button
          type="button"
          className="primary-button"
          disabled={!draft.email.trim() || !/^[^@\s]+@pepsico\.com$/i.test(draft.email)}
          onClick={async () => {
            await onSubmit({ ...draft, email: draft.email.toLowerCase() })
            onClose()
          }}
        >
          Save
        </button>
      </div>
    </Modal>
  )
}

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

const mapWorkItemToDraft = (initial?: WorkItem, prefill?: Partial<WorkItemDraft>): WorkItemDraft => ({
  title: initial?.title || prefill?.title || '',
  description: initial?.description || prefill?.description || '',
  assignedToId: initial?.assignedToId ?? prefill?.assignedToId ?? null,
  goalDate: initial?.goalDate || prefill?.goalDate || '',
  brf: initial?.brf || prefill?.brf || false,
  complete: initial?.complete || prefill?.complete || false,
  categoryId: initial?.categoryId ?? prefill?.categoryId ?? null,
  parentItemId: initial?.parentItemId ?? prefill?.parentItemId ?? null,
  releaseId: initial?.releaseId ?? prefill?.releaseId ?? null,
  size: initial?.size || prefill?.size || 'M',
  status: initial?.status || prefill?.status || 'Upcoming',
})

const applyWorkItemFilters = (items: WorkItem[], people: Person[], params: URLSearchParams) => {
  const status = params.get('status')
  const statusGroup = params.get('statusGroup')
  const category = params.get('category')
  const release = params.get('release')
  const query = params.get('q') || ''
  return items.filter((item) => {
    if (status && item.status !== status) {
      return false
    }
    if (statusGroup && STATUS_GROUPS[item.status] !== statusGroup) {
      return false
    }
    if (category && item.categoryId !== category) {
      return false
    }
    if (release && item.releaseId !== release) {
      return false
    }
    if (params.get('complete') === '1' && !(item.complete || item.status === 'Complete')) {
      return false
    }
    if (params.get('overdue') === '1' && !(daysRemaining(item.goalDate) < 0 && item.status !== 'Complete')) {
      return false
    }
    return matchesWorkItemSearch(item, people, query)
  })
}

const updateParam = (
  params: URLSearchParams,
  setParams: ReturnType<typeof useSearchParams>[1],
  key: string,
  value: string,
) => {
  const next = new URLSearchParams(params)
  if (value) {
    next.set(key, value)
  } else {
    next.delete(key)
  }
  setParams(next, { replace: true })
}

const groupWorkItems = (items: WorkItem[], grouping: 'category' | 'release', categories: Category[], releases: Release[]) => {
  const grouped = groupBy(items, (item) => {
    if (grouping === 'release') {
      return releases.find((release) => release.id === item.releaseId)?.title || 'No Release'
    }
    return categories.find((category) => category.categoryId === item.categoryId)?.name || 'Uncategorized'
  })
  const entries = Object.entries(grouped).map(([label, groupedItems]) => ({ label, items: groupedItems }))
  return entries.sort((left, right) => (left.label === 'No Release' ? 1 : right.label === 'No Release' ? -1 : left.label.localeCompare(right.label)))
}

const groupBy = <T,>(items: T[], getKey: (item: T) => string) =>
  items.reduce<Record<string, T[]>>((accumulator, item) => {
    const key = getKey(item)
    accumulator[key] = [...(accumulator[key] || []), item]
    return accumulator
  }, {})
