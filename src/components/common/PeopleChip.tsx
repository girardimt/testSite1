import { Users } from 'lucide-react'
import { clsx } from 'clsx'
import type { Person } from '../../lib/worktrack'
import { EmptyState } from '../system/EmptyState'

const families = ['fresh', 'leaf', 'grain', 'paprika', 'plum', 'ice', 'grapefruit'] as const

const hashFamily = (value: string) =>
  families[
    Math.abs(
      value.split('').reduce((sum, char) => {
        return sum + char.charCodeAt(0)
      }, 0),
    ) % families.length
  ]

export function PeopleChip({
  person,
  size = 'sm',
  fullRow = false,
}: {
  person?: Person | null
  size?: 'xs' | 'sm' | 'md'
  fullRow?: boolean
}) {
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

export const PeopleEmpty = () => (
  <EmptyState icon={<Users size={28} />} title="No people found" description="Add a new person to start assigning work." />
)
