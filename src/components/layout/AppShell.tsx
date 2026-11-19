import { Suspense, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { Compass, PanelLeftClose, PanelLeftOpen, Plus, WifiOff, FlaskConical } from 'lucide-react'
import { Logo } from './Logo'
import { QuickAdd } from './QuickAdd'
import { visibleNav } from './nav'
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

  const nav = visibleNav(profile?.enabled_modules)
  const bottom = nav.filter((n) => ['/', '/agenda', '/rotina', '/perfil'].includes(n.to))
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
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {nav.map(({ to, label, icon: I }) => (
            <NavLink key={to} to={to} end={to === '/'} title={collapsed ? label : undefined}
              className={({ isActive }) => cn('flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground',
                isActive && 'bg-primary/12 text-foreground', collapsed && 'justify-center px-0')}>
              {({ isActive }) => <><I className={cn('size-5', isActive && 'text-primary')} strokeWidth={isActive ? 2.2 : 1.8} />{!collapsed && label}</>}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabeçalho */}
        <header className="pt-safe sticky top-0 z-30 border-b border-transparent bg-background/85 backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:hidden">
            <Logo />
            <div className="flex items-center gap-1">
              <NavLink to="/explorar" className="lg:hidden" aria-label="Explorar módulos">
                {({ isActive }) => <span className={cn('grid size-11 place-items-center rounded-xl hover:bg-muted', isActive && 'text-primary')}><Compass className="size-5" /></span>}
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
          <Suspense fallback={<PageLoader />}><Outlet /></Suspense>
        </main>
      </div>

      {/* Barra inferior (celular e tablet) */}
      <nav aria-label="Navegação inferior" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
          {[...bottom.slice(0, 2), null, ...bottom.slice(2)].map((n) =>
            n === null ? (
              <div key="add" className="flex justify-center">
                <button onClick={() => setQuick(true)} aria-label="Adicionar"
                  className="-mt-7 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-95">
                  <Plus className="size-6" strokeWidth={2.4} />
                </button>
              </div>
            ) : (
              <NavLink key={n.to} to={n.to} end={n.to === '/'}
                className={({ isActive }) => cn('flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground', isActive && 'text-foreground')}>
                {({ isActive }) => <><n.icon className={cn('size-[22px]', isActive && 'text-primary')} strokeWidth={isActive ? 2.2 : 1.7} />{n.label}</>}
              </NavLink>
            ),
          )}
        </div>
      </nav>

      <QuickAdd open={quick} onOpenChange={setQuick} />
    </div>
  )
}
