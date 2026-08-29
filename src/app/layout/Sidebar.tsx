import {
  Calendar,
  CircleCheck,
  Clapperboard,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Target,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { Tooltip } from '@/components/ui/misc'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** `end` evita que "/" fique ativo em todas as rotas. */
  end?: boolean
}

const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/leads', label: 'Leads', icon: Target },
  { to: '/clients', label: 'Clientes', icon: Users },
  { to: '/projects', label: 'Projetos', icon: FolderKanban },
  { to: '/production', label: 'Produção', icon: Clapperboard },
  { to: '/calendar', label: 'Calendário', icon: Calendar },
  { to: '/tasks', label: 'Tarefas', icon: CircleCheck },
  { to: '/financial', label: 'Financeiro', icon: Wallet },
  { to: '/reports', label: 'Relatórios', icon: TrendingUp },
]

const FOOTER_NAV: NavItem[] = [{ to: '/settings', label: 'Configurações', icon: Settings }]

function NavRow({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  onNavigate?: () => void
}) {
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex h-8 items-center gap-2.5 rounded-md text-sm font-medium transition-colors',
          collapsed ? 'justify-center px-0' : 'px-3',
          isActive
            ? 'bg-accent/12 text-accent'
            : 'text-ink-dim hover:bg-hover hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Barra de acento rente à borda da sidebar, no item ativo. */}
          <span
            aria-hidden
            className={cn(
              'absolute top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-accent transition-opacity',
              collapsed ? '-left-2' : '-left-3',
              isActive ? 'opacity-100' : 'opacity-0',
            )}
          />
          <item.icon className="size-4 shrink-0" />
          {collapsed ? null : <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  )

  return collapsed ? (
    <Tooltip content={item.label} side="right">
      <div>{link}</div>
    </Tooltip>
  ) : (
    link
  )
}

export function Sidebar({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  /** Fecha a sobreposição no celular ao escolher um destino. */
  onNavigate?: () => void
}) {
  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200',
        collapsed ? 'w-14' : 'w-52',
      )}
    >
      {/* Marca — alinhada à altura da topbar. */}
      <div
        className={cn(
          'flex h-12 items-center gap-2 border-b border-line',
          collapsed ? 'justify-center px-0' : 'px-4',
        )}
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-bold text-on-accent">
          F
        </span>
        {collapsed ? null : (
          <span className="truncate text-base font-semibold tracking-tight text-ink">FrameFlow</span>
        )}
      </div>

      <nav className={cn('flex flex-1 flex-col gap-0.5 overflow-y-auto py-2', collapsed ? 'px-2' : 'px-3')}>
        {MAIN_NAV.map((item) => (
          <NavRow key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className={cn('flex flex-col gap-0.5 border-t border-line py-2', collapsed ? 'px-2' : 'px-3')}>
        {FOOTER_NAV.map((item) => (
          <NavRow key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </div>
    </aside>
  )
}
