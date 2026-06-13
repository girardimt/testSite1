import type { PropsWithChildren } from 'react'

export function Field({
  label,
  required,
  hint,
  children,
}: PropsWithChildren<{ label: string; required?: boolean; hint?: string }>) {
  return (
    <label className="field">
      <span className="field__label">
        {label}
        {required ? <strong> *</strong> : null}
      </span>
      {hint ? <span className="field__hint">{hint}</span> : null}
      {children}
    </label>
  )
}
