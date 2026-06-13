import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import type { Person } from '../../lib/worktrack'

export function PersonPicker({
  people,
  value,
  onChange,
  onQuickCreate,
  quickCreatePlaceholder = 'new.person@pepsico.com',
}: {
  people: Person[]
  value: string | null
  onChange: (value: string | null) => void
  onQuickCreate: (email: string) => Promise<string | null>
  quickCreatePlaceholder?: string
}) {
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
            placeholder={quickCreatePlaceholder}
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
