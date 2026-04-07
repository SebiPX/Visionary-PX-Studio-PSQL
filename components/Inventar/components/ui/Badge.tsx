import type { ItemStatus } from '../../types'

interface BadgeProps {
  status: ItemStatus | string
  size?: 'sm' | 'md'
}

const statusConfig: Record<string, { label: string; className: string }> = {
  'Vorhanden': { label: 'Vorhanden', className: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
  'Ausgeliehen': { label: 'Ausgeliehen', className: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  'Fehlt': { label: 'Fehlt', className: 'bg-red-500/20 text-red-300 border border-red-500/30' },
  'Defekt': { label: 'Defekt', className: 'bg-gray-500/20 text-muted-foreground border border-gray-500/30' },
}

export function StatusBadge({ status, size = 'sm' }: BadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-500/20 text-muted-foreground border border-gray-500/30' }
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  )
}

interface RoleBadgeProps { role: string }
export function RoleBadge({ role }: RoleBadgeProps) {
  const isAdmin = role === 'admin'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
      isAdmin ? 'bg-primary/20 text-blue-300 border border-primary/30' : 'bg-slate-500/20 text-primary-foreground border border-slate-500/30'
    }`}>
      {isAdmin ? 'Admin' : role}
    </span>
  )
}
