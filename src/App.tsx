import { lazy, Suspense } from 'react'
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import { useSession } from '@/auth/session'
import { useProfile } from '@/hooks/useData'
import { AppShell } from '@/components/layout/AppShell'
import { EditorsProvider } from '@/features/shared/editors'
import { ErrorState, PageLoader } from '@/components/ui/misc'
import type { ReactNode } from 'react'

const AuthPage = lazy(() => import('@/features/auth/AuthPage').then((m) => ({ default: m.AuthPage })))
const OnboardingPage = lazy(() => import('@/features/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const AgendaPage = lazy(() => import('@/features/agenda/AgendaPage').then((m) => ({ default: m.AgendaPage })))
const TasksPage = lazy(() => import('@/features/tasks/TasksPage').then((m) => ({ default: m.TasksPage })))
const HabitsPage = lazy(() => import('@/features/habits/HabitsPage').then((m) => ({ default: m.HabitsPage })))
const FinancePage = lazy(() => import('@/features/finance/FinancePage').then((m) => ({ default: m.FinancePage })))
const WorkoutPage = lazy(() => import('@/features/workout/WorkoutPage').then((m) => ({ default: m.WorkoutPage })))
const FoodPage = lazy(() => import('@/features/food/FoodPage').then((m) => ({ default: m.FoodPage })))
const ExplorePage = lazy(() => import('@/features/explore/ExplorePage').then((m) => ({ default: m.ExplorePage })))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })))

/** Rota protegida: exige sessão (real ou demonstração) e onboarding concluído. */
function Protected({ children, onboarding }: { children: ReactNode; onboarding?: boolean }) {
  const { status } = useSession()
  const loc = useLocation()
  const profile = useProfile()
  if (status === 'loading') return <PageLoader />
  if (status === 'signed-out') return <Navigate to="/entrar" replace state={{ from: loc.pathname }} />
  if (profile.isLoading) return <PageLoader />
  if (profile.isError) return <div className="p-6"><ErrorState onRetry={() => profile.refetch()} /></div>
  const done = !!profile.data?.onboarded_at
  if (!onboarding && !done) return <Navigate to="/onboarding" replace />
  if (onboarding && done) return <Navigate to="/" replace />
  return <>{children}</>
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { status } = useSession()
  if (status === 'loading') return <PageLoader />
  if (status !== 'signed-out') return <Navigate to="/" replace />
  return <>{children}</>
}

// Na prévia (arquivo único), a navegação fica em memória.
const Router = import.meta.env.VITE_PREVIEW ? MemoryRouter : BrowserRouter

export default function App() {
  return (
    <Router basename={import.meta.env.VITE_PREVIEW ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/entrar" element={<PublicOnly><AuthPage /></PublicOnly>} />
          <Route path="/onboarding" element={<Protected onboarding><OnboardingPage /></Protected>} />
          <Route element={<Protected><EditorsProvider><AppShell /></EditorsProvider></Protected>}>
            <Route index element={<DashboardPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="tarefas" element={<TasksPage />} />
            <Route path="rotina" element={<HabitsPage />} />
            <Route path="financas" element={<FinancePage />} />
            <Route path="treinos" element={<WorkoutPage />} />
            <Route path="alimentacao" element={<FoodPage />} />
            <Route path="explorar" element={<ExplorePage />} />
            <Route path="perfil" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  )
}
