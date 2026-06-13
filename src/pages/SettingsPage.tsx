import { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  useSettings,
  useSettingsMutations,
} from '../lib/worktrack'
import { Field, PageHeader } from '../components'

type SettingsDraft = {
  fallbackPersonEmail: string
  emailDomain: string
  allowedEmailDomains: string
  defaultPageSize: string
}

const mapSettingsToDraft = (settings: AppSettings): SettingsDraft => ({
  fallbackPersonEmail: settings.fallbackPersonEmail,
  emailDomain: settings.emailDomain,
  allowedEmailDomains: settings.allowedEmailDomains.join('\n'),
  defaultPageSize: String(settings.defaultPageSize),
})

const parseAllowedDomains = (value: string, emailDomain: string) =>
  Array.from(new Set([emailDomain, ...value.split(/[\n,]+/)].map((domain) => domain.trim().toLowerCase()).filter(Boolean)))

export function SettingsPage() {
  const settings = useSettings().data ?? DEFAULT_APP_SETTINGS
  const settingsMutations = useSettingsMutations()
  const [draft, setDraft] = useState<SettingsDraft>(() => mapSettingsToDraft(settings))

  useEffect(() => {
    setDraft(mapSettingsToDraft(settings))
  }, [settings])

  return (
    <div className="page">
      <PageHeader
        icon={<Settings size={24} />}
        title="Settings"
        subtitle="Configure fallback ownership, email validation, and default app behavior."
      />

      <section className="card">
        <div className="modal-form">
          <Field label="Fallback person email" required>
            <input
              className="form-input"
              type="email"
              value={draft.fallbackPersonEmail}
              onChange={(event) => setDraft((current) => ({ ...current, fallbackPersonEmail: event.target.value }))}
            />
          </Field>
          <Field label="Email domain" required hint="Used by People page validation.">
            <input
              className="form-input"
              value={draft.emailDomain}
              onChange={(event) => setDraft((current) => ({ ...current, emailDomain: event.target.value }))}
            />
          </Field>
          <Field label="Allowed email domains" required hint="One per line or separated by commas.">
            <textarea
              className="form-input"
              rows={4}
              value={draft.allowedEmailDomains}
              onChange={(event) => setDraft((current) => ({ ...current, allowedEmailDomains: event.target.value }))}
            />
          </Field>
          <Field label="Default page size" required>
            <input
              className="form-input"
              type="number"
              min={1}
              value={draft.defaultPageSize}
              onChange={(event) => setDraft((current) => ({ ...current, defaultPageSize: event.target.value }))}
            />
          </Field>
          <button
            type="button"
            className="primary-button"
            disabled={settingsMutations.save.isPending}
            onClick={async () => {
              const fallbackPersonEmail = draft.fallbackPersonEmail.trim().toLowerCase()
              const emailDomain = draft.emailDomain.trim().toLowerCase()
              const defaultPageSize = Number.parseInt(draft.defaultPageSize, 10)

              if (!/^[^@\s]+@[^@\s]+$/.test(fallbackPersonEmail)) {
                window.alert('Please enter a valid fallback email address.')
                return
              }

              if (!emailDomain || emailDomain.includes('@') || !emailDomain.includes('.')) {
                window.alert('Please enter a valid email domain.')
                return
              }

              if (!Number.isFinite(defaultPageSize) || defaultPageSize <= 0) {
                window.alert('Default page size must be a positive number.')
                return
              }

              await settingsMutations.save.mutateAsync({
                fallbackPersonEmail,
                emailDomain,
                allowedEmailDomains: parseAllowedDomains(draft.allowedEmailDomains, emailDomain),
                defaultPageSize,
              })
              window.alert('Settings saved.')
            }}
          >
            Save Settings
          </button>
        </div>
      </section>
    </div>
  )
}
