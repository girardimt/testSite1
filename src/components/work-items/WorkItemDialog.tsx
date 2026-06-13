import { useEffect, useState } from 'react'
import {
  DEFAULT_APP_SETTINGS,
  SIZE_OPTIONS,
  STATUS_OPTIONS,
  todayString,
  touchLastChanged,
  type Size,
  type Status,
  type WorkItem,
  usePersonMutations,
  useSettings,
  useWorkItemMutations,
} from '../../lib/worktrack'
import { mapWorkItemToDraft, quickCreatePerson, type WorkItemDraft, useReferenceData } from '../../app/shared'
import { Field } from '../system/Field'
import { Modal } from '../system/Modal'
import { PersonPicker } from '../common/PersonPicker'

export function WorkItemDialog({
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
  const settings = useSettings().data ?? DEFAULT_APP_SETTINGS
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
            onQuickCreate={(email) => quickCreatePerson(email, personMutations.create, settings)}
            quickCreatePlaceholder={`new.person@${settings.emailDomain}`}
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
