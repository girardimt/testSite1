import type { ReactNode } from 'react'

type Surface = 'fresh' | 'plum' | 'ice'

/**
 * A card group-header strip with a tinted surface background.
 * Mirrors the `.group-header .surface-*` pattern used inline in pages.
 */
export const SurfaceHeader = ({
  surface = 'fresh',
  children,
}: {
  surface?: Surface
  children: ReactNode
}) => <div className={`group-header surface-${surface}`}>{children}</div>
