import { Link } from 'react-router-dom'

export function WorkItemLink({ to, title, subtitle }: { to: string; title: string; subtitle?: string }) {
  return (
    <Link to={to} className="list-link">
      <strong>{title}</strong>
      {subtitle ? <small>{subtitle}</small> : null}
    </Link>
  )
}
