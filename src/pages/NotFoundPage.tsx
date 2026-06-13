import { AlertTriangle } from 'lucide-react'
import { EmptyState } from '../components'

export function NotFoundPage() {
  return (
    <div className="page">
      <EmptyState icon={<AlertTriangle size={28} />} title="Page not found" description="The requested route does not exist in WorkTrack v2." />
    </div>
  )
}
