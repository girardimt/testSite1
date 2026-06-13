import { useSearchParams } from 'react-router-dom'
import {
  STATUS_GROUPS,
  daysRemaining,
  matchesWorkItemSearch,
  type Person,
  type Size,
  type Status,
  type WorkItem,
  useBlockerTypes,
  useBlockers,
  useCategories,
  useLinks,
  usePersonMutations,
  usePersons,
  useReleases,
  useWorkItems,
} from '../lib/worktrack'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorkItemDraft = {
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

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export const useReferenceData = () => {
  const categories = useCategories().data ?? []
  const blockerTypes = useBlockerTypes().data ?? []
  const workItems = useWorkItems().data ?? []
  const links = useLinks().data ?? []
  const blockers = useBlockers().data ?? []
  const people = usePersons().data ?? []
  const releases = useReleases().data ?? []
  return { categories, blockerTypes, workItems, links, blockers, people, releases }
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

export const quickCreatePerson = async (
  email: string,
  createPerson: ReturnType<typeof usePersonMutations>['create'],
  settings: { emailDomain: string } = { emailDomain: 'pepsico.com' },
) => {
  const normalized = email.trim().toLowerCase()
  const [localPart = '', domain = ''] = normalized.split('@')
  const expectedDomain = settings.emailDomain.trim().toLowerCase()
  if (!localPart || domain !== expectedDomain) {
    window.alert(`Please enter a valid ${expectedDomain} email.`)
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

export const remainingText = (goalDate: string) => {
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

export const applyWorkItemFilters = (items: WorkItem[], people: Person[], params: URLSearchParams) => {
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

export const updateParam = (
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

export const groupBy = <T,>(items: T[], getKey: (item: T) => string) =>
  items.reduce<Record<string, T[]>>((accumulator, item) => {
    const key = getKey(item)
    accumulator[key] = [...(accumulator[key] || []), item]
    return accumulator
  }, {})

export const mapWorkItemToDraft = (initial?: WorkItem, prefill?: Partial<WorkItemDraft>): WorkItemDraft => ({
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
