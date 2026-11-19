import { CalendarDays, CheckSquare, Compass, Home, Repeat, UserRound, Wallet, type LucideIcon } from 'lucide-react'

export interface NavItem { to: string; label: string; icon: LucideIcon; module?: string }

export const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays, module: 'agenda' },
  { to: '/tarefas', label: 'Tarefas', icon: CheckSquare, module: 'tasks' },
  { to: '/rotina', label: 'Rotina', icon: Repeat, module: 'habits' },
  { to: '/financas', label: 'Finanças', icon: Wallet, module: 'finance' },
  { to: '/explorar', label: 'Explorar', icon: Compass },
  { to: '/perfil', label: 'Perfil', icon: UserRound },
]

export function visibleNav(enabled: string[] | undefined) {
  return MAIN_NAV.filter((n) => !n.module || (enabled ?? []).includes(n.module))
}
