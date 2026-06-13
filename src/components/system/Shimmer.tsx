import { clsx } from 'clsx'

export function Shimmer({ className }: { className?: string }) {
  return <div className={clsx('shimmer', className)} aria-hidden="true" />
}

export const CardShimmer = () => <Shimmer className="card-shimmer" />
export const RowShimmer = () => <Shimmer className="row-shimmer" />
