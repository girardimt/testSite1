import type { Release, ReleaseType } from '../../lib/worktrack'
import { releaseTypeColor } from '../../lib/worktrack'

export function ReleaseBadge({ type }: { type: ReleaseType }) {
  return <span className={releaseTypeColor(type)}>{type}</span>
}

export const releaseSummary = (release: Release, items: number) => ({
  badge: <ReleaseBadge type={release.releaseType} />,
  footer: `${items} item${items === 1 ? '' : 's'}`,
})
