import { useMemo, useState } from 'react'
import { CalendarCheck, Check, ClipboardList, Dumbbell, Pencil, Play, Plus, TrendingUp, Archive } from 'lucide-react'
import { subDays } from 'date-fns'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/field'
import { Dot, EmptyState, ErrorState, PageHeader, PageLoader, Segmented } from '@/components/ui/misc'
import { useTable } from '@/hooks/useData'
import { useEditors } from '@/features/shared/editors'
import { capitalize, fmt, fromDateKey, friendlyDay, todayKey, WEEKDAYS_SHORT } from '@/lib/dates'
import { activePlans, EFFORT_LABEL, exerciseHistory, exerciseSummary, formatKg, plansForDay, sessionFromPlan, sessionsOn, trackedExercises, weekActivity } from '@/lib/workout'
import { colorOf } from '@/lib/colors'
import type { WorkoutPlan, WorkoutSession } from '@/data/types'
import { PlanForm } from './PlanForm'
import { WeekDots } from './WeekDots'
import { ProgressChart } from './ProgressChart'

type Tab = 'plans' | 'history' | 'progress'

function TodayCard({ plans, sessions }: { plans: WorkoutPlan[]; sessions: WorkoutSession[] }) {
  const { openWorkout } = useEditors()
  const todayPlans = plansForDay(plans, new Date())
  const done = sessionsOn(sessions, todayKey())
  const weekCount = weekActivity(sessions).filter((d) => d.trained).length
  return (
    <Card>
      <CardHeader title="Treino de hoje" icon={<CalendarCheck />} action={<span className="text-sm text-muted-foreground">{weekCount} na semana</span>} />
      <WeekDots sessions={sessions} />
      <div className="mt-4 space-y-2">
        {done.map((s) => (
          <button key={s.id} onClick={() => openWorkout(s)} className="flex w-full items-center gap-3 rounded-xl bg-primary/10 p-3 text-left">
            <Check className="size-5 text-primary" strokeWidth={3} />
            <span className="flex-1"><b className="font-semibold">{s.name}</b> · feito hoje{s.duration_min ? `, ${s.duration_min} min` : ''}</span>
            <Pencil className="size-4 text-muted-foreground" />
          </button>
        ))}
        {todayPlans.filter((p) => !done.some((s) => s.plan_id === p.id)).map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border p-3">
            <Dot color={p.color} />
            <span className="min-w-0 flex-1"><b className="block truncate font-semibold">{p.name}</b><span className="text-xs text-muted-foreground">{p.exercises.length} exercícios</span></span>
            <Button size="sm" onClick={() => openWorkout(null, sessionFromPlan(p, todayKey()))}><Play />Começar</Button>
          </div>
        ))}
        {todayPlans.length === 0 && done.length === 0 && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Nenhuma ficha marcada para hoje.</p>
            <Button variant="outline" size="sm" onClick={() => openWorkout(null)}><Plus />Registrar</Button>
          </div>
        )}
      </div>
    </Card>
  )
}

function PlanCard({ plan, onEdit }: { plan: WorkoutPlan; onEdit: () => void }) {
  const { openWorkout } = useEditors()
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${colorOf(plan.color).hex} 25%, transparent)` }}>
          <Dumbbell className="size-5" style={{ color: colorOf(plan.color).hex }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{plan.name}</p>
          <p className="text-xs text-muted-foreground">{plan.days_of_week.length ? plan.days_of_week.map((d) => WEEKDAYS_SHORT[d]).join(', ') : 'Sem dia fixo'} · {plan.exercises.length} exercícios</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={`Editar ${plan.name}`} onClick={onEdit}><Pencil /></Button>
      </div>
      {plan.exercises.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {plan.exercises.map((e) => (
            <li key={e.id} className="flex justify-between gap-3 border-b border-dashed py-1 last:border-0">
              <span className="truncate">{e.name}</span><span className="shrink-0 text-muted-foreground tabular-nums">{exerciseSummary(e)}</span>
            </li>
          ))}
        </ul>
      )}
      {plan.notes && <p className="mt-2 text-xs text-muted-foreground">{plan.notes}</p>}
      <Button className="mt-3 w-full" variant="secondary" onClick={() => openWorkout(null, sessionFromPlan(plan, todayKey()))}><Play />Treinar agora</Button>
    </Card>
  )
}

function History({ sessions }: { sessions: WorkoutSession[] }) {
  const { openWorkout } = useEditors()
  const list = [...sessions].sort((a, b) => (a.performed_on < b.performed_on ? 1 : a.performed_on > b.performed_on ? -1 : 0))
  if (!list.length) return <Card><EmptyState icon={<ClipboardList />} title="Nenhum treino registrado" text="Quando você registrar um treino, ele aparece aqui." /></Card>
  return (
    <Card className="p-3">
      <ul>
        {list.map((s) => {
          const done = s.entries.filter((e) => e.done).length
          return (
            <li key={s.id}>
              <button onClick={() => openWorkout(s)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-muted/60">
                <span className="w-14 shrink-0 text-center"><b className="block text-lg leading-none">{fmt(fromDateKey(s.performed_on), 'd')}</b><span className="text-xs text-muted-foreground">{fmt(fromDateKey(s.performed_on), 'MMM')}</span></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {[s.entries.length ? `${done}/${s.entries.length} exercícios` : '', s.duration_min ? `${s.duration_min} min` : '', s.effort ? EFFORT_LABEL[s.effort] : ''].filter(Boolean).join(' · ') || friendlyDay(fromDateKey(s.performed_on))}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function Progress({ sessions }: { sessions: WorkoutSession[] }) {
  const names = useMemo(() => trackedExercises(sessions), [sessions])
  const [picked, setPicked] = useState('')
  const name = names.includes(picked) ? picked : names[0] ?? ''
  const data = useMemo(() => (name ? exerciseHistory(sessions, name) : []), [sessions, name])
  const last30 = sessions.filter((s) => fromDateKey(s.performed_on) >= subDays(new Date(), 30)).length
  const totalMin = sessions.filter((s) => fromDateKey(s.performed_on) >= subDays(new Date(), 30)).reduce((a, s) => a + (s.duration_min ?? 0), 0)
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="p-4"><p className="text-xs text-muted-foreground">Treinos nos últimos 30 dias</p><p className="mt-1 text-2xl font-semibold">{last30}</p></Card>
      <Card className="p-4"><p className="text-xs text-muted-foreground">Tempo treinando (30 dias)</p><p className="mt-1 text-2xl font-semibold">{totalMin >= 60 ? `${Math.floor(totalMin / 60)}h${String(totalMin % 60).padStart(2, '0')}` : `${totalMin} min`}</p></Card>
      <Card className="p-4"><p className="text-xs text-muted-foreground">Total registrado</p><p className="mt-1 text-2xl font-semibold">{sessions.length}</p></Card>
      <Card className="md:col-span-3">
        <CardHeader title={name ? `Carga: ${name}` : 'Evolução da carga'} icon={<TrendingUp />} />
        {names.length === 0 ? <p className="text-sm text-muted-foreground">Registre treinos com carga (kg) para ver sua evolução aqui.</p> : (
          <>
            <Select aria-label="Exercício" value={name} onChange={(e) => setPicked(e.target.value)} className="mb-4 sm:max-w-xs">
              {names.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
            {data.length < 2
              ? <p className="text-sm text-muted-foreground">Só um registro até agora ({formatKg(data[0]?.weight)}). Com mais treinos, o gráfico aparece.</p>
              : <>
                <ProgressChart name={name} data={data} />
                <p className="mt-2 text-sm text-muted-foreground">
                  De {formatKg(data[0].weight)} ({capitalize(fmt(data[0].day, "d 'de' MMM"))}) para {formatKg(data[data.length - 1].weight)}
                  {data[data.length - 1].weight > data[0].weight ? `: +${formatKg(data[data.length - 1].weight - data[0].weight)}. Que evolução!` : '.'}
                </p>
                <details className="mt-2 text-sm"><summary className="cursor-pointer text-primary">Ver em tabela</summary>
                  <table className="mt-2 w-full text-left"><thead><tr className="text-xs text-muted-foreground"><th className="py-1 font-medium">Data</th><th className="py-1 font-medium">Carga</th></tr></thead>
                    <tbody>{data.map((d) => <tr key={d.date} className="border-t"><td className="py-1">{fmt(d.day, 'dd/MM/yyyy')}</td><td className="py-1 tabular-nums">{formatKg(d.weight)}</td></tr>)}</tbody></table>
                </details>
              </>}
          </>
        )}
      </Card>
    </div>
  )
}

export function WorkoutPage() {
  const plansQ = useTable('workout_plans')
  const sessionsQ = useTable('workout_sessions')
  const { openWorkout } = useEditors()
  const [tab, setTab] = useState<Tab>('plans')
  const [editing, setEditing] = useState<WorkoutPlan | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  if (plansQ.isError || sessionsQ.isError) return <ErrorState onRetry={() => { plansQ.refetch(); sessionsQ.refetch() }} />
  if (plansQ.isLoading || sessionsQ.isLoading) return <PageLoader />
  const plans = plansQ.data ?? []
  const sessions = sessionsQ.data ?? []
  const active = activePlans(plans)
  const archived = plans.filter((p) => p.archived_at)
  const editPlan = (p: WorkoutPlan | null) => { setEditing(p); setFormOpen(true) }

  return (
    <div>
      <PageHeader title="Treinos" subtitle="Fichas, cargas e constância" action={<Button onClick={() => openWorkout(null)}><Plus />Registrar treino</Button>} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div><TodayCard plans={plans} sessions={sessions} /></div>
        <div>
          <Segmented className="mb-4 w-full sm:w-auto" label="Seção" value={tab} onChange={setTab}
            options={[{ value: 'plans', label: 'Fichas' }, { value: 'history', label: 'Histórico' }, { value: 'progress', label: 'Evolução' }]} />
          {tab === 'plans' && (active.length === 0 ? (
            <Card><EmptyState icon={<Dumbbell />} title="Monte sua primeira ficha" text="Liste os exercícios com séries, repetições e carga. Tem modelos prontos para começar."
              action={<Button onClick={() => editPlan(null)}><Plus />Nova ficha</Button>} /></Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">{active.map((p) => <PlanCard key={p.id} plan={p} onEdit={() => editPlan(p)} />)}</div>
              <Button variant="outline" className="mt-4" onClick={() => editPlan(null)}><Plus />Nova ficha</Button>
              {archived.length > 0 && (
                <details className="mt-6">
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground"><Archive className="size-4" />Arquivadas ({archived.length})</summary>
                  <ul className="mt-2 space-y-1">{archived.map((p) => <li key={p.id}><button className="rounded-xl px-3 py-2 text-sm hover:bg-muted" onClick={() => editPlan(p)}>{p.name}</button></li>)}</ul>
                </details>
              )}
            </>
          ))}
          {tab === 'history' && <History sessions={sessions} />}
          {tab === 'progress' && <Progress sessions={sessions} />}
        </div>
      </div>
      <PlanForm open={formOpen} onOpenChange={setFormOpen} plan={editing} nextPosition={plans.length} />
    </div>
  )
}
