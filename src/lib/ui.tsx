import { AlertCircle, PieChart, UserPlus, Users } from 'lucide-react'
import { arc, pie } from 'd3'
import { clsx } from 'clsx'
import { Component, type PropsWithChildren, type ReactNode, useMemo, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  STATUS_GROUPS,
  blockerBadgeClass,
  type BlockerBadgeStatus,
  type Person,
  type Release,
  type ReleaseType,
  releaseTypeColor,
} from './worktrack'
import { navTree } from '../app/layout/nav'

export { navTree }

export class AppErrorBoundary extends Component<PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main className="app-shell">
          <section className="empty-state">
          <AlertCircle size={32} />
            <h2>Something went wrong</h2>
            <p>The WorkTrack shell hit an unexpected rendering error.</p>
          </section>
        </main>
      )
    }
    return this.props.children
  }
}

export const PageHeader = ({
  icon,
  title,
  subtitle,
  actions,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  actions?: ReactNode
}) => (
  <header className="page-header">
    <div className="header-tile">{icon}</div>
    <div className="page-header__body">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
    <div className="page-header__actions">{actions}</div>
  </header>
)

export const Field = ({
  label,
  required,
  hint,
  children,
}: PropsWithChildren<{ label: string; required?: boolean; hint?: string }>) => (
  <label className="field">
    <span className="field__label">
      {label}
      {required ? <strong> *</strong> : null}
    </span>
    {hint ? <span className="field__hint">{hint}</span> : null}
    {children}
  </label>
)

export const EmptyState = ({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) => (
  <section className="empty-state">
    {icon}
    <h2>{title}</h2>
    <p>{description}</p>
    {action}
  </section>
)

export const Shimmer = ({ className }: { className?: string }) => (
  <div className={clsx('shimmer', className)} aria-hidden="true" />
)

export const CardShimmer = () => <Shimmer className="card-shimmer" />
export const RowShimmer = () => <Shimmer className="row-shimmer" />

const families = ['fresh', 'leaf', 'grain', 'paprika', 'plum', 'ice', 'grapefruit'] as const
const hashFamily = (value: string) =>
  families[
    Math.abs(
      value.split('').reduce((sum, char) => {
        return sum + char.charCodeAt(0)
      }, 0),
    ) % families.length
  ]

export const PeopleChip = ({
  person,
  size = 'sm',
  fullRow = false,
}: {
  person?: Person | null
  size?: 'xs' | 'sm' | 'md'
  fullRow?: boolean
}) => {
  if (!person) {
    return (
      <span className={clsx('people-chip', 'people-chip--unassigned', `people-chip--${size}`, fullRow && 'people-chip--full')}>
        Unassigned
      </span>
    )
  }
  const pending = !person.title || !person.role
  const family = hashFamily(person.id)
  const initials = (person.title || person.email || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join('')
  return (
    <span
      className={clsx(
        'people-chip',
        `people-chip--${size}`,
        `people-chip--${family}`,
        pending && 'people-chip--pending',
        fullRow && 'people-chip--full',
      )}
    >
      <span className="people-chip__avatar">{pending ? '…' : initials}</span>
      <span className="people-chip__text">
        <strong>{person.title || person.email}</strong>
        <small>{pending ? 'Pending enrichment' : person.role}</small>
      </span>
    </span>
  )
}

export const ReleaseBadge = ({ type }: { type: ReleaseType }) => <span className={releaseTypeColor(type)}>{type}</span>

export const ValidationBadge = ({ status }: { status: BlockerBadgeStatus }) => (
  <span className={blockerBadgeClass(status)}>{status === 'cleared' ? 'Cleared' : status === 'valid' ? 'Valid' : 'Revalidate'}</span>
)

export const Modal = ({
  open,
  title,
  onClose,
  children,
}: PropsWithChildren<{ open: boolean; title: string; onClose: () => void }>) => {
  if (!open) {
    return null
  }
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <h2>{title}</h2>
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </section>
    </div>
  )
}

export const AppLayout = ({ children }: PropsWithChildren) => {
  const location = useLocation()
  const mobileItems: Array<{ to: string; label: string }> = navTree.reduce<Array<{ to: string; label: string }>>(
    (accumulator, item) => {
      if ('to' in item) {
        accumulator.push(item)
      } else {
        accumulator.push(...item.children)
      }
      return accumulator
    },
    [],
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-tile">
          <div className="brand-mark">WT</div>
          <div>
            <strong>WorkTrack</strong>
            <small>v2</small>
          </div>
        </div>
        <nav className="nav-tree" aria-label="Primary">
          {navTree.map((item) =>
            'to' in item ? (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => clsx('nav-leaf', isActive && 'nav-item-active')}>
                {item.label}
              </NavLink>
            ) : (
              <div key={item.label} className="nav-group">
                <strong>{item.label}</strong>
                <div className="nav-group__children">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) =>
                        clsx('nav-leaf', isActive && 'nav-item-active', location.pathname.startsWith(child.to) && 'nav-item-active')
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ),
          )}
        </nav>
      </aside>
      <header className="mobile-nav">
        <div className="brand-tile brand-tile--mobile">
          <div className="brand-mark">WT</div>
          <strong>WorkTrack</strong>
        </div>
        <div className="mobile-nav__chips">
          {mobileItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => clsx('mobile-chip', isActive && 'nav-item-active')}>
              {item.label}
            </NavLink>
          ))}
        </div>
      </header>
      <main className="main-content">{children}</main>
    </div>
  )
}

export const StatusDonut = ({ counts }: { counts: Record<string, number> }) => {
  const entries = Object.entries(counts).filter(([, value]) => value > 0)
  const chart = useMemo(() => {
    const pieData = pie<[string, number]>().value((entry: [string, number]) => entry[1])(entries)
    return pieData.map((segment) => {
      const path = arc<typeof segment>().innerRadius(48).outerRadius(78)(segment) || ''
      const color =
        segment.data[0] === 'Pending'
          ? '#6A6A6A'
          : segment.data[0] === 'In-Progress'
            ? '#4C94CF'
            : segment.data[0] === 'Complete'
              ? '#85BB19'
              : segment.data[0] === 'Blocked'
                ? '#E1784B'
                : '#A160C1'
      return { path, color, label: segment.data[0], value: segment.data[1] }
    })
  }, [entries])

  if (!chart.length) {
    return <EmptyState icon={<PieChart size={28} />} title="No status data" description="No work items are currently available." />
  }

  return (
    <div className="chart-card">
      <svg viewBox="-90 -90 180 180" className="donut-chart" aria-label="Status donut">
        {chart.map((segment) => (
          <path key={segment.label} d={segment.path} fill={segment.color} />
        ))}
      </svg>
      <div className="chart-legend">
        {chart.map((segment) => (
          <div key={segment.label} className="chart-legend__row">
            <span className="chart-dot" style={{ background: segment.color }} />
            <span>{segment.label}</span>
            <strong>{segment.value}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

export const CategoryBar = ({
  rows,
  onSelect,
}: {
  rows: Array<{ label: string; value: number }>
  onSelect: (label: string) => void
}) => {
  const max = Math.max(...rows.map((row) => row.value), 1)
  if (!rows.length) {
    return <EmptyState icon={<AlertCircle size={28} />} title="No category data" description="Nothing is assigned to a category yet." />
  }
  return (
    <div className="bar-chart">
      {rows.map((row) => (
        <button key={row.label} type="button" className="bar-chart__row" onClick={() => onSelect(row.label)}>
          <span>{row.label}</span>
          <span className="bar-chart__track">
            <span className="bar-chart__fill" style={{ width: `${(row.value / max) * 100}%` }} />
          </span>
          <strong>{row.value}</strong>
        </button>
      ))}
    </div>
  )
}

export const PersonPicker = ({
  people,
  value,
  onChange,
  onQuickCreate,
}: {
  people: Person[]
  value: string | null
  onChange: (value: string | null) => void
  onQuickCreate: (email: string) => Promise<string | null>
}) => {
  const [creating, setCreating] = useState(false)
  const [email, setEmail] = useState('')
  return (
    <div className="person-picker">
      <select value={value || ''} onChange={(event) => onChange(event.target.value || null)} className="form-input">
        <option value="">Unassigned</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.title || person.email}
          </option>
        ))}
      </select>
      <button type="button" className="secondary-button" onClick={() => setCreating((current) => !current)} aria-label="Create person inline">
        <UserPlus size={16} />
      </button>
      {creating ? (
        <div className="inline-create">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="new.person@pepsico.com"
            className="form-input"
          />
          <button
            type="button"
            className="primary-button"
            onClick={async () => {
              const created = await onQuickCreate(email)
              if (created) {
                onChange(created)
                setEmail('')
                setCreating(false)
              }
            }}
          >
            Create
          </button>
        </div>
      ) : null}
    </div>
  )
}

export const MetricCard = ({
  label,
  value,
  onClick,
}: {
  label: string
  value: number
  onClick?: () => void
}) => (
  <button type="button" className="metric-card" onClick={onClick}>
    <span>{label}</span>
    <strong>{value}</strong>
  </button>
)

export const WorkItemLink = ({ to, title, subtitle }: { to: string; title: string; subtitle?: string }) => (
  <Link to={to} className="list-link">
    <strong>{title}</strong>
    {subtitle ? <small>{subtitle}</small> : null}
  </Link>
)

export const statusGroupCounts = (statuses: string[]) =>
  statuses.reduce<Record<string, number>>((accumulator, status) => {
    const group = STATUS_GROUPS[status as keyof typeof STATUS_GROUPS]
    accumulator[group] = (accumulator[group] || 0) + 1
    return accumulator
  }, {})

export const releaseSummary = (release: Release, items: number) => ({
  badge: <ReleaseBadge type={release.releaseType} />,
  footer: `${items} item${items === 1 ? '' : 's'}`,
})

export const PeopleEmpty = () => (
  <EmptyState icon={<Users size={28} />} title="No people found" description="Add a new person to start assigning work." />
)
