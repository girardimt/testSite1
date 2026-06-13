import { LayoutDashboard, ListTodo, ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  STATUS_GROUPS,
  blockerBadgeStatus,
  daysRemaining,
  formatDisplayDate,
  parseLocalDate,
} from '../lib/worktrack'
import {
  CategoryBar,
  EmptyState,
  MetricCard,
  PageHeader,
  PeopleChip,
  ReleaseBadge,
  ValidationBadge,
  statusGroupCounts,
  StatusDonut,
} from '../lib/ui'
import { applyWorkItemFilters, remainingText, useReferenceData } from '../app/shared'

export function DashboardPage() {
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
                        <span>{item.status}</span>
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
