import { daysRemaining } from '../lib/worktrack'

/**
 * Returns a human-readable string describing days remaining until a goal date.
 * Exported so it can be tested independently of the component.
 */
export const formatRemainingText = (goalDate: string): string => {
  const remaining = daysRemaining(goalDate)
  if (!Number.isFinite(remaining)) return 'No goal date'
  if (remaining < 0) return `${Math.abs(remaining)}d overdue`
  if (remaining === 0) return 'Due today'
  return `${remaining}d left`
}

export const DaysRemaining = ({ goalDate }: { goalDate: string }) => {
  const remaining = daysRemaining(goalDate)
  return <span className={remaining < 0 ? 'danger-text' : ''}>{formatRemainingText(goalDate)}</span>
}
