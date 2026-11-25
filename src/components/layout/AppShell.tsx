import { Suspense, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Compass, Home, PanelLeftClose, PanelLeftOpen, Plus, UserRound, WifiOff, FlaskConical } from 'lucide-react'
import { Logo } from './Logo'
import { QuickAdd } from './QuickAdd'
import { coreTabs } from './nav'
import { activeCore, visibleCores } from '@/lib/cores'
import { colorOf } from '@/lib/colors'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/ui/misc'
import { useProfile } from '@/hooks/useData'
import { useApplyTheme } from '@/hooks/useTheme'
import { useOnline } from '@/hooks/useOnline'
import { useSession } from '@/auth/session'
import { cn } from '@/lib/utils'

function readCollapsed() {
  try { return localStorage.getItem('lume-sidebar') === 'collapsed' } catch { return false }
}

export function AppShell() {
  const { data: profile } = useProfile()
  const { status, exitDemo } = useSession()
  const online = useOnline()
  const loc = useLocation()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [quick, setQuick] = useState(false)
  useApplyTheme(profile?.theme, profile?.accent)

  const enabled = profile?.enabled_modules
  const cores = visibleCores(enabled)
  const current = activeCore(loc.pathname, (loc.state as { core?: string } | null)?.core)
  const tabs = current ? coreTabs(current, enabled) : []
  const isHome = loc.pathname === '/'
  const toggle = () => {
    setCollapsed((c) => {
      try { localStorage.setItem('lume-sidebar', c ? 'open' : 'collapsed') } catch { /* ignore */ }
      return !c
    })
  }

  return (
    <div className="min-h-dvh lg:flex">
      <a href="#conteudo" className="sr-only z-50 rounded-xl bg-card px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Pular para o conteúdo</a>

      {/* Menu lateral (computador e tablet grande) */}
      <aside className={cn('sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-card/60 px-3 py-5 backdrop-blur transition-[width] lg:flex', collapsed ? 'w-[76px]' : 'w-64')}>
        <div className={cn('mb-6 flex items-center px-2', collapsed ? 'justify-center' : 'justify-between')}>
          <Logo compact={collapsed} />
          {!collapsed && <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Recolher menu"><PanelLeftClose /></Button>}
        </div>
        {collapsed && <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Expandir menu" className="mx-auto mb-3"><PanelLeftOpen /></Button>}
        <Button onClick={() => setQuick(true)} className={cn('mb-5', collapsed ? 'mx-auto size-11 px-0' : 'w-full')} aria-label="Adicionar">
          <Plus />{!collapsed && 'Adicionar'}
        </Button>
        <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 overflow-y-auto">
          <SideLink to="/" label="Início" icon={Home} active={isHome} collapsed={collapsed} />
          {!collapsed && <p className="mt-4 mb-1 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Núcleos</p>}
          {collapsed && <div className="my-2 border-t" />}
          {cores.map((c) => {
            const on = current?.id === c.id
            const sub = on && !collapsed ? coreTabs(c, enabled).slice(1) : []
            return (
              <div key={c.id}>
                <SideLink to={c.path} label={c.label} icon={c.icon} active={on && loc.pathname === c.path} highlight={on} color={c.color} collapsed={collapsed} />
                {sub.length > 0 && (
                  <div className="mt-0.5 mb-1 ml-[22px] flex flex-col gap-0.5 border-l pl-3">
                    {sub.map((t) => (
                      <NavLink key={t.to} to={t.to} state={loc.state}
                        className={({ isActive }) => cn('flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground', isActive && 'bg-muted text-foreground')}>
                        <t.icon className="size-4" strokeWidth={1.8} />{t.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          <div className="mt-auto flex flex-col gap-1 pt-4">
            <SideLink to="/explorar" label="Explorar" icon={Compass} active={loc.pathname === '/explorar'} collapsed={collapsed} />
            <SideLink to="/perfil" label="Perfil" icon={UserRound} active={loc.pathname === '/perfil'} collapsed={collapsed} />
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabeçalho */}
        <header className="pt-safe sticky top-0 z-30 border-b border-transparent bg-background/85 backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:hidden">
            <Link to="/" aria-label="Início"><Logo /></Link>
            <div className="flex items-center gap-1">
              <NavLink to="/explorar" aria-label="Explorar módulos">
                {({ isActive }) => <span className={cn('grid size-11 place-items-center rounded-xl hover:bg-muted', isActive && 'text-primary')}><Compass className="size-5" /></span>}
              </NavLink>
              <NavLink to="/perfil" aria-label="Perfil">
                {({ isActive }) => <span className={cn('grid size-11 place-items-center rounded-xl hover:bg-muted', isActive && 'text-primary')}><UserRound className="size-5" /></span>}
              </NavLink>
            </div>
          </div>
          {status === 'demo' && (
            <div className="flex items-center justify-center gap-2 bg-lavender/30 px-4 py-1.5 text-center text-xs font-medium">
              <FlaskConical className="size-3.5" /> Modo demonstração: dados fictícios, nada é salvo.
              <button onClick={exitDemo} className="font-semibold underline underline-offset-2">Sair</button>
            </div>
          )}
          {!online && (
            <div role="status" className="flex items-center justify-center gap-2 bg-[#E1C49B]/35 px-4 py-1.5 text-xs font-medium">
              <WifiOff className="size-3.5" /> Você está sem conexão. Alterações não serão salvas até a internet voltar.
            </div>
          )}
        </header>

        <main id="conteudo" key={loc.pathname} className="animate-fade-up mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-32 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
          {tabs.length > 1 && (
            <nav aria-label={`Abas de ${current!.label}`} className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:hidden">
              {tabs.map((t) => (
                <NavLink key={t.to} to={t.to} end state={loc.state}
                  className={({ isActive }) => cn('flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium text-muted-foreground transition hover:bg-muted',
                    isActive && cn('border-transparent', colorOf(current!.color).soft))}>
                  <t.icon className="size-4" />{t.label}
                </NavLink>
              ))}
            </nav>
          )}
          <Suspense fallback={<PageLoader />}><Outlet /></Suspense>
        </main>
      </div>

      {/* Botão de adicionar (celular e tablet) */}
      <button onClick={() => setQuick(true)} aria-label="Adicionar"
        className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-95 lg:hidden">
        <Plus className="size-6" strokeWidth={2.4} />
      </button>

      {/* Dock dos núcleos (celular e tablet) */}
      <nav aria-label="Núcleos" className="pb-safe fixed inset-x-0 bottom-0 z-40 px-3 lg:hidden">
        <div className="mx-auto mb-2 grid h-[68px] max-w-lg items-center rounded-[26px] border bg-card/95 px-1.5 shadow-soft backdrop-blur-md"
          style={{ gridTemplateColumns: `repeat(${cores.length + 1}, minmax(0, 1fr))` }}>
          <DockItem to="/" label="Início" icon={Home} active={isHome} />
          {cores.map((c) => <DockItem key={c.id} to={c.path} label={c.label} icon={c.icon} active={current?.id === c.id} color={c.color} />)}
        </div>
      </nav>

      <QuickAdd open={quick} onOpenChange={setQuick} />
    </div>
  )
}

type IconT = typeof Home

function SideLink({ to, label, icon: I, active, highlight, color, collapsed }: {
  to: string; label: string; icon: IconT; active: boolean; highlight?: boolean; color?: string; collapsed: boolean
}) {
  const on = active || highlight
  return (
    <Link to={to} title={collapsed ? label : undefined} aria-current={active ? 'page' : undefined}
      className={cn('flex h-11 items-center gap-3 rounded-xl px-2 text-[15px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground',
        on && 'text-foreground', active && 'bg-muted', collapsed && 'justify-center px-0')}>
      <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', on && (color ? colorOf(color).soft : 'bg-primary/12 text-primary'))}>
        <I className="size-[18px]" strokeWidth={on ? 2.2 : 1.8} />
      </span>
      {!collapsed && label}
    </Link>
  )
}

function DockItem({ to, label, icon: I, active, color }: { to: string; label: string; icon: IconT; active: boolean; color?: string }) {
  return (
    <Link to={to} aria-current={active ? 'page' : undefined}
      className={cn('flex h-full min-w-0 flex-col items-center justify-center gap-1 text-[10.5px] font-medium text-muted-foreground', active && 'text-foreground')}>
      <span className={cn('grid h-8 w-11 place-items-center rounded-full transition', active && (color ? colorOf(color).soft : 'bg-primary/12 text-primary'))}>
        <I className="size-[21px]" strokeWidth={active ? 2.2 : 1.7} />
      </span>
      <span className="max-w-full truncate">{label}</span>
    </Link>
  )
}
