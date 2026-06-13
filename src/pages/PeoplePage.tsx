import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import {
  DEFAULT_APP_SETTINGS,
  type Person,
  useDeletePersonCascade,
  usePersonMutations,
  useSettings,
} from '../lib/worktrack'
import {
  Field,
  Modal,
  PageHeader,
  PeopleChip,
} from '../components'
import { quickCreatePerson, useReferenceData } from '../app/shared'

function PersonEditor({
  open,
  onClose,
  initial,
  onSubmit,
  emailDomain,
}: {
  open: boolean
  onClose: () => void
  initial?: Person
  onSubmit: (person: Person) => Promise<void>
  emailDomain: string
}) {
  const [draft, setDraft] = useState(
    initial || { id: `per-${Date.now()}`, title: '', email: '', role: '', active: true } satisfies Person,
  )
  useEffect(() => {
    setDraft(initial || { id: `per-${Date.now()}`, title: '', email: '', role: '', active: true })
  }, [initial, open])
  return (
    <Modal open={open} onClose={onClose} title="Edit Person">
      <div className="modal-form">
        <Field label="Name">
          <input className="form-input" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
        </Field>
        <Field label="Email" required hint={`Use your @${emailDomain} address`}>
          <input className="form-input" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
        </Field>
        <Field label="Role">
          <input className="form-input" value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))} />
        </Field>
        <label className="toggle"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} />Active</label>
        <button
          type="button"
          className="primary-button"
          disabled={!draft.email.trim() || draft.email.trim().toLowerCase().split('@')[1] !== emailDomain.toLowerCase()}
          onClick={async () => {
            await onSubmit({ ...draft, email: draft.email.toLowerCase() })
            onClose()
          }}
        >
          Save
        </button>
      </div>
    </Modal>
  )
}

export function PeoplePage() {
  const { people } = useReferenceData()
  const settings = useSettings().data ?? DEFAULT_APP_SETTINGS
  const personMutations = usePersonMutations()
  const deleteCascade = useDeletePersonCascade()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Person | null>(null)
  const [email, setEmail] = useState('')

  return (
    <div className="page">
      <PageHeader
        icon={<Users size={24} />}
        title="People"
        subtitle="Manage assignees, pending enrichment, and cascade deletion."
      />

      <section className="card">
        <div className="row gap wrap">
          <input className="form-input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={`name@${settings.emailDomain}`} />
          <button
            type="button"
            className="primary-button"
            onClick={async () => {
              const created = await quickCreatePerson(email, personMutations.create, settings)
              if (created) {
                setEmail('')
              }
            }}
          >
            New Person
          </button>
        </div>
      </section>

      <section className="stack">
        {people.map((person) => {
          const pending = !person.title || !person.role
          return (
            <article key={person.id} className={`card person-row ${pending ? 'person-row--pending' : ''}`}>
              <PeopleChip person={person} fullRow size="md" />
              <div className="row gap wrap">
                {pending ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={async () => {
                      if (window.confirm(`Delete pending person ${person.email}?`)) {
                        await personMutations.remove.mutateAsync(person.id)
                      }
                    }}
                  >
                    ✕
                  </button>
                ) : (
                  <>
                    <button type="button" className="secondary-button" onClick={() => setEditing(person)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={async () => {
                        if (window.confirm(`Delete ${person.title}?`)) {
                          await deleteCascade.mutateAsync(person.id)
                        }
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </article>
          )
        })}
      </section>

      <PersonEditor
        open={open || !!editing}
        onClose={() => {
          setOpen(false)
          setEditing(null)
        }}
        initial={editing || undefined}
        emailDomain={settings.emailDomain}
        onSubmit={async (person) => {
          if (editing) {
            await personMutations.update.mutateAsync(person)
          } else {
            await personMutations.create.mutateAsync(person)
          }
          setOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
