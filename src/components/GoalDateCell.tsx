import { daysRemaining, formatDisplayDate } from '../lib/worktrack'
import { formatRemainingText } from './DaysRemaining'

/**
 * Renders a formatted goal date with a remaining-days indicator.
 * Applies danger-text styling when the goal date is in the past.
 */
export const GoalDateCell = ({ goalDate }: { goalDate: string }) => {
  const overdue = !!goalDate && daysRemaining(goalDate) < 0
  return (
    <span className={overdue ? 'danger-text' : ''}>
      {formatDisplayDate(goalDate)} · {formatRemainingText(goalDate)}
    </span>
  )
}
