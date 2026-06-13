export function MetricCard({
  label,
  value,
  onClick,
}: {
  label: string
  value: number
  onClick?: () => void
}) {
  return (
    <button type="button" className="metric-card" onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  )
}
