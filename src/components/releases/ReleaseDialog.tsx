import { useEffect, useState } from 'react'
import {
  RELEASE_TYPE_OPTIONS,
  releaseSequence,
  todayString,
  type Release,
  type ReleaseType,
} from '../../lib/worktrack'
import { useReferenceData } from '../../app/shared'
import { Field } from '../system/Field'
import { Modal } from '../system/Modal'

export function ReleaseDialog({
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
