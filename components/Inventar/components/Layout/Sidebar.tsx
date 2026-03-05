import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, LogOut, FileText, Calendar, KeyRound, Smartphone, CreditCard, Building2, Link2 } from 'lucide-react'
import type { Profile } from '../../types'

interface SidebarProps {
  profile: Profile
  isAdmin: boolean
  onSignOut: () => void
}

const navItems = [
  { to: '/inventar',         label: 'Inventar',          icon: Package,         end: false, adminOnly: false },
  { to: '/verleih-formular', label: 'Verleih',           icon: FileText,        end: false, adminOnly: false },
  { to: '/kalender',         label: 'Kalender',          icon: Calendar,        end: false, adminOnly: false },
  { to: '/logins',           label: 'Logins',            icon: KeyRound,        end: false, adminOnly: false },
  { to: '/handyvertraege',   label: 'Handyverträge',     icon: Smartphone,      end: false, adminOnly: true  },
  { to: '/kreditkarten',     label: 'Kreditkarten',      icon: CreditCard,      end: false, adminOnly: true  },
  { to: '/firmendaten',      label: 'Firmendaten',        icon: Building2,       end: false, adminOnly: true  },
  { to: '/links',            label: 'Interne Links',      icon: Link2,           end: false, adminOnly: false },
]


export function Sidebar({ profile, isAdmin, onSignOut }: SidebarProps) {
  const initials = profile.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile.email.slice(0, 2).toUpperCase()

  return (
    <aside className="w-64 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <Package size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">PX INTERN</p>
            <p className="text-xs text-slate-400">Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.filter(item => !item.adminOnly || isAdmin).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User / Footer */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile.full_name || profile.email}</p>
            <p className="text-xs text-slate-400 capitalize">{profile.role}</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut size={18} />
          Abmelden
        </button>
      </div>
    </aside>
  )
}
