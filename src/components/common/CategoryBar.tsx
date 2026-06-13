import { AlertCircle } from 'lucide-react'
import { EmptyState } from '../system/EmptyState'

export function CategoryBar({
  rows,
  onSelect,
}: {
  rows: Array<{ label: string; value: number }>
  onSelect: (label: string) => void
}) {
  const max = Math.max(...rows.map((row) => row.value), 1)

  if (!rows.length) {
    return <EmptyState icon={<AlertCircle size={28} />} title="No category data" description="Nothing is assigned to a category yet." />
  }

  return (
    <div className="bar-chart">
      {rows.map((row) => (
        <button key={row.label} type="button" className="bar-chart__row" onClick={() => onSelect(row.label)}>
          <span>{row.label}</span>
          <span className="bar-chart__track">
            <span className="bar-chart__fill" style={{ width: `${(row.value / max) * 100}%` }} />
          </span>
          <strong>{row.value}</strong>
        </button>
      ))}
    </div>
  )
}
