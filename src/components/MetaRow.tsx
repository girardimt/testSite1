import type { ReactNode } from 'react'

/**
 * A labelled metadata row that follows the `.detail-line` convention.
 * Renders a bold label on the left and arbitrary content on the right.
 */
export const MetaRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="detail-line">
    <strong>{label}</strong>
    <div>{children}</div>
  </div>
)
