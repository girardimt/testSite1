import { useState } from 'react'
import { FolderKanban, ListTodo } from 'lucide-react'
import {
  STATUS_OPTIONS,
  daysRemaining,
  formatDisplayDate,
  sizeColor,
  statusColor,
  type Category,
  type Release,
  type WorkItem,
} from '../lib/worktrack'
import {
  EmptyState,
  Field,
  PageHeader,
  PeopleChip,
} from '../lib/ui'
import {
  WorkItemEditor,
  applyWorkItemFilters,
  groupBy,
  remainingText,
  updateParam,
  useReferenceData,
} from '../app/shared'
import { useNavigate, useSearchParams } from 'react-router-dom'

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

export function WorkItemsPage() {
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
