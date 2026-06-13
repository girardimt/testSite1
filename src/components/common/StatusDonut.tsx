import { PieChart } from 'lucide-react'
import { arc, pie } from 'd3'
import { useMemo } from 'react'
import { STATUS_GROUPS } from '../../lib/worktrack'
import { EmptyState } from '../system/EmptyState'

export const statusGroupCounts = (statuses: string[]) =>
  statuses.reduce<Record<string, number>>((accumulator, status) => {
    const group = STATUS_GROUPS[status as keyof typeof STATUS_GROUPS]
    accumulator[group] = (accumulator[group] || 0) + 1
    return accumulator
  }, {})

export function StatusDonut({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).filter(([, value]) => value > 0)
  const chart = useMemo(() => {
    const pieData = pie<[string, number]>().value((entry: [string, number]) => entry[1])(entries)
    return pieData.map((segment) => {
      const path = arc<typeof segment>().innerRadius(48).outerRadius(78)(segment) || ''
      const color =
        segment.data[0] === 'Pending'
          ? '#6A6A6A'
          : segment.data[0] === 'In-Progress'
            ? '#4C94CF'
            : segment.data[0] === 'Complete'
              ? '#85BB19'
              : segment.data[0] === 'Blocked'
                ? '#E1784B'
                : '#A160C1'
      return { path, color, label: segment.data[0], value: segment.data[1] }
    })
  }, [entries])

  if (!chart.length) {
    return <EmptyState icon={<PieChart size={28} />} title="No status data" description="No work items are currently available." />
  }

  return (
    <div className="chart-card">
      <svg viewBox="-90 -90 180 180" className="donut-chart" aria-label="Status donut">
        {chart.map((segment) => (
          <path key={segment.label} d={segment.path} fill={segment.color} />
        ))}
      </svg>
      <div className="chart-legend">
        {chart.map((segment) => (
          <div key={segment.label} className="chart-legend__row">
            <span className="chart-dot" style={{ background: segment.color }} />
            <span>{segment.label}</span>
            <strong>{segment.value}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}
