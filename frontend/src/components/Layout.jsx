import { NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  LogOut,
  Scale,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'
import ThemeToggle from './ThemeToggle.jsx'

const LINKS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/matters', label: 'Matters', icon: Briefcase },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export default function Layout({ theme }) {
  const { user, signOut } = useAuth()
  const initials = user.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Scale size={20} /></span>
          <span>Hearing Diary</span>
        </div>

        <nav className="nav" aria-label="Main">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className="nav-link">
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="user-chip">
            <span className="avatar">{initials}</span>
            <span className="user-text">
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </span>
          </div>
          <div className="sidebar-actions">
            <ThemeToggle theme={theme} />
            <button className="icon-button" onClick={signOut} aria-label="Sign out" title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
