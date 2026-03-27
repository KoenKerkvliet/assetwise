import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Monitor, TrendingDown, AlertTriangle, Archive, Trash2, Settings, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/hardware', label: 'Hardware', icon: Monitor },
  { to: '/incidents', label: 'Incidenten', icon: AlertTriangle },
  { to: '/depreciation', label: 'Afschrijvingen', icon: TrendingDown },
]

const secondaryItems = [
  { to: '/archive', label: 'Archief', icon: Archive },
  { to: '/deleted', label: 'Prullenbak', icon: Trash2 },
]

export function Sidebar() {
  const { signOut, user } = useAuth()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
    )

  return (
    <>
      <header className="flex h-14 items-center border-b bg-sidebar px-4 md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <span className="ml-3 text-lg font-semibold">Asset Wise</span>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={close} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground transition-transform duration-200 md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center border-b px-4">
          <h1 className="text-lg font-semibold">Asset Wise</h1>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass} onClick={close}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}

          <Separator className="my-2" />

          {secondaryItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} onClick={close}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3">
          <Separator className="mb-3" />
          <NavLink to="/settings" className={linkClass} onClick={close}>
            <Settings className="h-4 w-4" />
            Instellingen
          </NavLink>
          <p className="mb-2 mt-3 truncate px-3 text-xs text-muted-foreground">
            {user?.email}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Uitloggen
          </Button>
        </div>
      </aside>
    </>
  )
}
