import { blockerBadgeClass, type BlockerBadgeStatus } from '../../lib/worktrack'

export function ValidationBadge({ status }: { status: BlockerBadgeStatus }) {
  return <span className={blockerBadgeClass(status)}>{status === 'cleared' ? 'Cleared' : status === 'valid' ? 'Valid' : 'Revalidate'}</span>
}
