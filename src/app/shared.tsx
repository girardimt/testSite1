import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  LINK_TYPE_OPTIONS,
  SIZE_OPTIONS,
  STATUS_OPTIONS,
  computeNextValidation,
  deriveLinkDisplayName,
  formatDisplayDate,
  normalizeLinkNumber,
  sortBlockerTypesForDialog,
  todayString,
  touchLastChanged,
  validateLinkNumber,
  type Link as WorkLink,
  type LinkType,
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
  useWorkItemMutations,
  useWorkItems,
  STATUS_GROUPS,
  daysRemaining,
  matchesWorkItemSearch,
} from '../lib/worktrack'
import {
  Field,
  Modal,
  PersonPicker,
} from '../lib/ui'

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

export const quickCreatePerson = async (email: string, createPerson: ReturnType<typeof usePersonMutations>['create']) => {
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

// ---------------------------------------------------------------------------
// Shared editor components
// ---------------------------------------------------------------------------

export function WorkItemEditor({
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

export function BlockerEditor({
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

export function LinkEditor({
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

