/**
 * A small badge indicating whether a record (Person, Release, etc.) is active.
 * Active → green leaf badge. Inactive → neutral grey badge.
 */
export const ActiveBadge = ({ active }: { active: boolean }) => (
  <span className={active ? 'badge badge-leaf' : 'badge badge-neutral'}>
    {active ? 'Active' : 'Inactive'}
  </span>
)
