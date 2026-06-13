import { clsx } from 'clsx'
import type { PropsWithChildren } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { navTree } from './nav'

export function AppLayout({ children }: PropsWithChildren) {
  const location = useLocation()
  const mobileItems: Array<{ to: string; label: string }> = navTree.reduce<Array<{ to: string; label: string }>>(
    (accumulator, item) => {
      if ('to' in item) {
        accumulator.push(item)
      } else {
        accumulator.push(...item.children)
      }
      return accumulator
    },
    [],
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-tile">
          <div className="brand-mark">WT</div>
          <div>
            <strong>WorkTrack</strong>
            <small>v2</small>
          </div>
        </div>
        <nav className="nav-tree" aria-label="Primary">
          {navTree.map((item) =>
            'to' in item ? (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => clsx('nav-leaf', isActive && 'nav-item-active')}>
                {item.label}
              </NavLink>
            ) : (
              <div key={item.label} className="nav-group">
                <strong>{item.label}</strong>
                <div className="nav-group__children">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) =>
                        clsx('nav-leaf', isActive && 'nav-item-active', location.pathname.startsWith(child.to) && 'nav-item-active')
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ),
          )}
        </nav>
      </aside>
      <header className="mobile-nav">
        <div className="brand-tile brand-tile--mobile">
          <div className="brand-mark">WT</div>
          <strong>WorkTrack</strong>
        </div>
        <div className="mobile-nav__chips">
          {mobileItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => clsx('mobile-chip', isActive && 'nav-item-active')}>
              {item.label}
            </NavLink>
          ))}
        </div>
      </header>
      <main className="main-content">{children}</main>
    </div>
  )
}

export default AppLayout
