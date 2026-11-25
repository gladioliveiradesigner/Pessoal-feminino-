import { useMemo, useState } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, format, isAfter, isSameMonth, startOfDay, startOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Flame, Plus, Repeat, Sun, Sunset, Moon, Clock3, Archive, CalendarRange, CalendarDays } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, PageHeader, PageLoader, Segmented } from '@/components/ui/misc'
import { useTable } from '@/hooks/useData'
import { useEditors } from '@/features/shared/editors'
import { completionRate, currentStreak, bestStreak, encouragement, isScheduled, PERIOD_LABEL, countOn, dailyTarget, frequencyLabel, isPeriodic, periodDone, rateWindowLabel, streakUnit } from '@/lib/domain'
import { capitalize, fmt, toDateKey, todayKey, WEEKDAYS_MIN } from '@/lib/dates'
import { colorOf } from '@/lib/colors'
import { cn } from '@/lib/utils'
import type { DayPeriod, Habit } from '@/data/types'
import { HabitRow } from './HabitToday'
import { useHabitLog } from './useHabitLog'

const PERIOD_ICON = { morning: Sun, afternoon: Sunset, evening: Moon, anytime: Clock3 }
const PERIODS: DayPeriod[] = ['morning', 'afternoon', 'evening', 'anytime']

function HabitCalendar({ habit }: { habit: Habit }) {
  const { idx, setCount } = useHabitLog()
  const target = dailyTarget(habit)
  const [month, setMonth] = useState(startOfMonth(new Date()))
  const days = eachDayOfInterval({ start: startOfWeek(month), end: endOfWeek(endOfMonth(month)) })
  const color = colorOf(habit.color).hex
  const today = startOfDay(new Date())
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" aria-label="Mês anterior" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft /></Button>
        <span className="text-sm font-medium">{capitalize(fmt(month, 'MMMM yyyy'))}</span>
        <Button variant="ghost" size="icon-sm" aria-label="Próximo mês" disabled={isSameMonth(month, today)} onClick={() => setMonth(addMonths(month, 1))}><ChevronRight /></Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">{WEEKDAYS_MIN.map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const k = toDateKey(d)
          const c = countOn(idx, habit.id, k)
          const done = c >= target
          const partial = c > 0 && !done
          const future = isAfter(d, today)
          const sched = isScheduled(habit, d)
          return (
            <button key={k} disabled={future || !isSameMonth(d, month)}
              onClick={() => setCount(habit, k, done ? 0 : target)}
              aria-label={`${fmt(d, "d 'de' MMMM")}: ${done ? 'concluído' : partial ? 'parcial' : 'não registrado'}`}
              className={cn('aspect-square rounded-lg text-xs tabular-nums transition', !isSameMonth(d, month) && 'invisible',
                !done && !partial && (sched ? 'bg-muted/70' : 'bg-transparent text-muted-foreground/50'), future && 'opacity-40',
                toDateKey(today) === k && 'ring-1 ring-foreground/40')}
              style={done ? { background: color, color: '#fff' } : partial ? { background: `color-mix(in srgb, ${color} 35%, transparent)` } : undefined}>
              {format(d, 'd')}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Toque em um dia passado para marcar ou desmarcar.</p>
    </div>
  )
}

function HabitStats({ habit }: { habit: Habit }) {
  const { idx, ws } = useHabitLog()
  const { openHabit } = useEditors()
  const streak = currentStreak(habit, idx, new Date(), ws)
  const best = bestStreak(habit, idx, 365, new Date(), ws)
  const rate = completionRate(habit, idx, 30, new Date(), ws)
  const unit = streakUnit(habit, 2) as 'dias' | 'semanas' | 'meses'
  const color = colorOf(habit.color).hex
  return (
    <Card className="p-4">
      <HabitRow habit={habit} dateKey={todayKey()} onOpen={() => openHabit(habit)}
        extra={<span className="text-xs text-muted-foreground">{frequencyLabel(habit)}</span>} />
      {isPeriodic(habit) && <p className="mt-1 pl-2 text-xs text-muted-foreground">{frequencyLabel(habit)}</p>}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-muted/60 p-2"><p className="flex items-center justify-center gap-1 text-lg font-semibold"><Flame className="size-4" style={{ color }} />{streak}</p><p className="text-[11px] text-muted-foreground">{streakUnit(habit, streak)} seguid{habit.frequency === 'weekly' ? (streak === 1 ? 'a' : 'as') : (streak === 1 ? 'o' : 'os')}</p></div>
        <div className="rounded-xl bg-muted/60 p-2"><p className="text-lg font-semibold">{best}</p><p className="text-[11px] text-muted-foreground">melhor</p></div>
        <div className="rounded-xl bg-muted/60 p-2"><p className="text-lg font-semibold">{rate}%</p><p className="text-[11px] text-muted-foreground">{rateWindowLabel(habit)}</p></div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{encouragement(rate, streak, unit)}</p>
      <details className="group mt-3">
        <summary className="cursor-pointer list-none text-sm font-medium text-primary">Ver calendário</summary>
        <div className="mt-3"><HabitCalendar habit={habit} /></div>
      </details>
    </Card>
  )
}

export function HabitsPage() {
  const { data: habits, isLoading, isError, refetch } = useTable('habits')
  const { openHabit } = useEditors()
  const { idx, ws } = useHabitLog()
  const [view, setView] = useState<'today' | 'all'>('today')
  const active = useMemo(() => (habits ?? []).filter((h) => !h.archived_at), [habits])
  const archived = (habits ?? []).filter((h) => h.archived_at)
  const now = new Date()
  const todays = active.filter((h) => !isPeriodic(h) && isScheduled(h, now))
  const weekly = active.filter((h) => h.frequency === 'weekly')
  const monthly = active.filter((h) => h.frequency === 'monthly')
  const doneCount = todays.filter((h) => countOn(idx, h.id, todayKey()) >= h.target_per_day).length
  const subtitle = [
    todays.length ? `${doneCount} de ${todays.length} de hoje` : '',
    weekly.length ? `${weekly.filter((h) => periodDone(h, idx, now, ws)).length} de ${weekly.length} da semana` : '',
    monthly.length ? `${monthly.filter((h) => periodDone(h, idx, now, ws)).length} de ${monthly.length} do mês` : '',
  ].filter(Boolean).join(' · ')

  if (isError) return <ErrorState onRetry={refetch} />
  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader title="Rotina" subtitle={subtitle || 'Seus hábitos e rotinas'}
        action={<Button onClick={() => openHabit(null)}><Plus />Novo hábito</Button>} />
      {active.length === 0 ? (
        <Card><EmptyState icon={<Repeat />} title="Comece com um hábito pequeno" text="Beber água todo dia, academia 3 vezes por semana, faxina 1 vez por mês. Constância vem de passos leves."
          action={<Button onClick={() => openHabit(null)}><Plus />Criar hábito</Button>} /></Card>
      ) : (
        <>
          <Segmented className="mb-5 w-full sm:w-auto" label="Visualização" value={view} onChange={setView}
            options={[{ value: 'today', label: 'Hoje' }, { value: 'all', label: 'Progresso' }]} />
          {view === 'today' ? (
            <div className="grid gap-4 md:grid-cols-2">
              {PERIODS.map((p) => {
                const list = todays.filter((h) => h.period === p)
                if (!list.length) return null
                const I = PERIOD_ICON[p]
                return (
                  <Card key={p}>
                    <CardHeader title={PERIOD_LABEL[p]} icon={<I />} />
                    <div className="-mx-2">{list.map((h) => <HabitRow key={h.id} habit={h} onOpen={() => openHabit(h)} />)}</div>
                  </Card>
                )
              })}
              {todays.length === 0 && weekly.length + monthly.length === 0 && <Card className="md:col-span-2"><p className="text-sm text-muted-foreground">Hoje é dia de descanso para seus hábitos. Aproveite.</p></Card>}
              {weekly.length > 0 && (
                <Card>
                  <CardHeader title="Nesta semana" icon={<CalendarRange />} />
                  <div className="-mx-2">{weekly.map((h) => <HabitRow key={h.id} habit={h} onOpen={() => openHabit(h)} />)}</div>
                </Card>
              )}
              {monthly.length > 0 && (
                <Card>
                  <CardHeader title="Neste mês" icon={<CalendarDays />} />
                  <div className="-mx-2">{monthly.map((h) => <HabitRow key={h.id} habit={h} onOpen={() => openHabit(h)} />)}</div>
                </Card>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{active.map((h) => <HabitStats key={h.id} habit={h} />)}</div>
          )}
        </>
      )}
      {archived.length > 0 && (
        <details className="mt-8">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground"><Archive className="size-4" />Arquivados ({archived.length})</summary>
          <ul className="mt-3 space-y-1">
            {archived.map((h) => <li key={h.id}><button className="rounded-xl px-3 py-2 text-sm hover:bg-muted" onClick={() => openHabit(h)}>{h.name}</button></li>)}
          </ul>
        </details>
      )}
    </div>
  )
}
