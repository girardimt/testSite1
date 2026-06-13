import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * A styled back-navigation link using the app `.back-link` class.
 * Renders as a react-router `<Link>` so browser history is preserved.
 */
export const BackLink = ({ to, children }: { to: string; children?: ReactNode }) => (
  <Link to={to} className="back-link">
    <ArrowLeft size={16} />
    {children}
  </Link>
)
