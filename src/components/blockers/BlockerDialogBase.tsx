import { useEffect, useState } from 'react'
import {
  computeNextValidation,
  DEFAULT_APP_SETTINGS,
  formatDisplayDate,
  sortBlockerTypesForDialog,
  todayString,
  type WorkItem,
  usePersonMutations,
  useSettings,
} from '../../lib/worktrack'
import { quickCreatePerson, useReferenceData } from '../../app/shared'
import { PersonPicker } from '../common/PersonPicker'
import { Field } from '../system/Field'
import { Modal } from '../system/Modal'

export function BlockerDialogBase({
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
  const settings = useSettings().data ?? DEFAULT_APP_SETTINGS
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
            onQuickCreate={(email) => quickCreatePerson(email, personMutations.create, settings)}
            quickCreatePlaceholder={`new.person@${settings.emailDomain}`}
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
