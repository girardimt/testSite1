import { statusColor, type Status } from '../lib/worktrack'

export const StatusBadge = ({ status }: { status: Status }) => (
  <span className={statusColor(status)}>{status}</span>
)
