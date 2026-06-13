import { useEffect, useState } from 'react'
import {
  LINK_TYPE_OPTIONS,
  buildLinkUrl,
  deriveLinkDisplayName,
  normalizeLinkNumber,
  type Link as WorkLink,
  type LinkType,
  validateLinkNumber,
  validateLinkUniqueness,
} from '../../lib/worktrack'
import { useReferenceData } from '../../app/shared'
import { Field } from '../system/Field'
import { Modal } from '../system/Modal'

export function LinkDialog({
  open,
  onClose,
  initial,
  workItemId,
  existingLinks,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  initial?: WorkLink
  workItemId?: string
  existingLinks: WorkLink[]
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
  const uniquenessError = warning ? '' : validateLinkUniqueness(type, normalized, existingLinks, initial?.linkId)
  const errorMessage = warning || uniquenessError

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
        {errorMessage ? <p className="danger-text">{errorMessage}</p> : null}
        <div className="preview-panel">Preview: {normalized ? deriveLinkDisplayName(type, normalized) : '—'}</div>
        {normalized && !errorMessage ? (
          <a className="secondary-button" href={buildLinkUrl(type, normalized)} target="_blank" rel="noreferrer">
            Open destination
          </a>
        ) : null}
        <button
          type="button"
          className="primary-button"
          disabled={!normalized || !!errorMessage}
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
