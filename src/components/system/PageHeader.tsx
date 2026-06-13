import type { ReactNode } from 'react'

export function PageHeader({
  icon,
  title,
  subtitle,
  actions,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  actions?: ReactNode
}) {
  return (
    <header className="page-header">
      <div className="header-tile">{icon}</div>
      <div className="page-header__body">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="page-header__actions">{actions}</div>
    </header>
  )
}
