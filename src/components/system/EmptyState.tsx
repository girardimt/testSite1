import type { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <section className="empty-state">
      {icon}
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  )
}
