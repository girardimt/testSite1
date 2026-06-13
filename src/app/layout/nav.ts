export const navTree = [
  { to: '/', label: 'Dashboard' },
  { to: '/work-items', label: 'Work Items' },
  { to: '/planning', label: 'Planning' },
  {
    label: 'Views',
    children: [
      { to: '/blockers', label: 'Blockers' },
      { to: '/links', label: 'Links' },
      { to: '/releases', label: 'Releases' },
    ],
  },
  {
    label: 'Core Data',
    children: [
      { to: '/categories', label: 'Categories' },
      { to: '/blocker-types', label: 'Blocker Types' },
      { to: '/people', label: 'People' },
      { to: '/releases-md', label: 'Releases' },
      { to: '/settings', label: 'Settings' },
    ],
  },
] as const
