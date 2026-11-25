import { useSearchParams } from 'react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, isSameDay, isSameMonth, isToday, startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Plus, Repeat, Bell } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Chip, Dot, EmptyState, ErrorState, PageHeader, PageLoader, Segmented, Switch } from '@/components/ui/misc'
import { useProfile, useTable } from '@/hooks/useData'
import { useEditors } from '@/features/shared/editors'
import { TaskCheck } from '@/features/tasks/TaskItem'
import { useToggleTask } from '@/features/tasks/useTaskActions'
import { durationLabel, expandEvents, occurrencesOnDay, type Occurrence } from '@/lib/domain'
import { capitalize, fmt, friendlyDay, toDateKey, WEEKDAYS_SHORT } from '@/lib/dates'
import { colorOf } from '@/lib/colors'
import { cn } from '@/lib/utils'
import type { Category, Task } from '@/data/types'

type View = 'month' | 'week' | 'day' | 'list'

function readView(): View {
  try { return (localStorage.getItem('lume-agenda-view') as View) || 'month' } catch { return 'month' }
}

/** Data padrão para um novo compromisso no dia escolhido (próxima hora cheia se for hoje). */
function defaultsFor(day: Date) {
  const base = isToday(day) ? new Date() : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9)
  const s = new Date(base); s.setMinutes(0, 0, 0); if (isToday(day)) s.setHours(s.getHours() + 1)
  return { starts_at: s.toISOString(), ends_at: new Date(s.getTime() + 3600_000).toISOString() }
}

function EventLine({ o, cats, onOpen }: { o: Occurrence; cats: Category[]; onOpen: () => void }) {
  const cat = cats.find((c) => c.id === o.event.category_id)
  return (
    <button onClick={onOpen} className="flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition hover:bg-muted/60">
      <span className="w-14 shrink-0 pt-0.5 text-sm tabular-nums">
        {o.event.all_day ? <span className="text-xs font-medium text-muted-foreground">Dia todo</span> : <><b className="font-semibold">{fmt(o.start, 'HH:mm')}</b><span className="block text-xs text-muted-foreground">{durationLabel(o.start, o.end)}</span></>}
      </span>
      <span className="mt-1 h-9 w-1 shrink-0 rounded-full" style={{ background: colorOf(cat?.color).hex }} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">{o.event.title}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-xs text-muted-foreground">
          {o.event.location && <span className="flex items-center gap-1"><MapPin className="size-3" />{o.event.location}</span>}
          {o.event.recurrence_freq && <Repeat className="size-3" aria-label="Repete" />}
          {o.event.reminder_minutes.length > 0 && <Bell className="size-3" aria-label="Com lembrete" />}
          {cat && <span>{cat.name}</span>}
        </span>
      </span>
    </button>
  )
}

function TaskLine({ t, onOpen }: { t: Task; onOpen: () => void }) {
  const toggle = useToggleTask()
  return (
    <div className="flex items-center gap-3 rounded-xl px-2.5 py-1.5 hover:bg-muted/60">
      <span className="w-14 shrink-0 text-xs text-muted-foreground">{t.due_time ? t.due_time.slice(0, 5) : 'Tarefa'}</span>
      <TaskCheck task={t} onToggle={() => toggle(t)} />
      <button onClick={onOpen} className={cn('flex-1 text-left text-[15px]', t.completed_at && 'text-muted-foreground line-through')}>{t.title}</button>
    </div>
  )
}

function DayAgenda({ day, occ, tasks, cats, empty }: { day: Date; occ: Occurrence[]; tasks: Task[]; cats: Category[]; empty?: boolean }) {
  const { openEvent, openTask } = useEditors()
  const list = occurrencesOnDay(occ, day)
  const dk = toDateKey(day)
  const dayTasks = tasks.filter((t) => t.due_date === dk)
  if (!list.length && !dayTasks.length) {
    return empty ? <p className="px-2.5 py-3 text-sm text-muted-foreground">Dia livre.</p> : null
  }
  return (
    <div>
      {list.map((o) => <EventLine key={o.key} o={o} cats={cats} onOpen={() => openEvent(o.event)} />)}
      {dayTasks.map((t) => <TaskLine key={t.id} t={t} onOpen={() => openTask(t)} />)}
    </div>
  )
}

function MonthView({ cursor, selected, onSelect, occ, tasks, cats, weekStartsOn }: {
  cursor: Date; selected: Date; onSelect: (d: Date) => void; occ: Occurrence[]; tasks: Task[]; cats: Category[]; weekStartsOn: 0 | 1
}) {
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor), { weekStartsOn }), end: endOfWeek(endOfMonth(cursor), { weekStartsOn }) })
  const labels = weekStartsOn === 1 ? [...WEEKDAYS_SHORT.slice(1), WEEKDAYS_SHORT[0]] : WEEKDAYS_SHORT
  const { openEvent } = useEditors()
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card className="p-2 sm:p-3">
        <div className="grid grid-cols-7 pb-1 text-center text-xs font-medium text-muted-foreground">{labels.map((l) => <span key={l}>{l}</span>)}</div>
        <div className="grid grid-cols-7 gap-0.5" role="grid" aria-label="Calendário do mês">
          {days.map((d) => {
            const items = occurrencesOnDay(occ, d)
            const nTasks = tasks.filter((t) => t.due_date === toDateKey(d) && !t.completed_at).length
            const sel = isSameDay(d, selected)
            return (
              <button key={d.toISOString()} role="gridcell" aria-selected={sel} onClick={() => onSelect(d)}
                onDoubleClick={() => openEvent(null, defaultsFor(d))}
                aria-label={`${fmt(d, "d 'de' MMMM")}, ${items.length} compromissos, ${nTasks} tarefas`}
                className={cn('flex min-h-14 flex-col items-center rounded-xl p-1 text-sm transition sm:min-h-24 sm:items-stretch',
                  !isSameMonth(d, cursor) && 'text-muted-foreground/45', sel ? 'bg-primary/12' : 'hover:bg-muted/70')}>
                <span className={cn('grid size-7 place-items-center rounded-full tabular-nums sm:self-end', isToday(d) && 'bg-primary font-semibold text-primary-foreground')}>{d.getDate()}</span>
                <span className="mt-1 flex flex-wrap justify-center gap-0.5 sm:hidden">
                  {items.slice(0, 3).map((o) => <Dot key={o.key} color={cats.find((c) => c.id === o.event.category_id)?.color} className="size-1.5" />)}
                  {nTasks > 0 && <span className="size-1.5 rounded-full border border-muted-foreground" aria-hidden />}
                </span>
                <span className="mt-1 hidden space-y-0.5 sm:block">
                  {items.slice(0, 2).map((o) => (
                    <span key={o.key} className={cn('block truncate rounded-md px-1.5 py-0.5 text-left text-[11px]', colorOf(cats.find((c) => c.id === o.event.category_id)?.color).soft)}>
                      {!o.event.all_day && fmt(o.start, 'HH:mm ')}{o.event.title}
                    </span>
                  ))}
                  {items.length + nTasks > 2 && <span className="block px-1.5 text-left text-[11px] text-muted-foreground">+{items.length + nTasks - Math.min(2, items.length)} itens</span>}
                </span>
              </button>
            )
          })}
        </div>
      </Card>
      <Card className="p-3">
        <div className="flex items-center justify-between px-2.5 pt-1 pb-2">
          <h2 className="font-semibold">{friendlyDay(selected)}<span className="ml-2 text-sm font-normal text-muted-foreground">{fmt(selected, "d 'de' MMM")}</span></h2>
          <Button variant="ghost" size="icon-sm" aria-label="Novo compromisso neste dia" onClick={() => openEvent(null, defaultsFor(selected))}><Plus /></Button>
        </div>
        <DayAgenda day={selected} occ={occ} tasks={tasks} cats={cats} empty />
      </Card>
    </div>
  )
}

function WeekView({ cursor, occ, tasks, cats, weekStartsOn }: { cursor: Date; occ: Occurrence[]; tasks: Task[]; cats: Category[]; weekStartsOn: 0 | 1 }) {
  const { openEvent } = useEditors()
  const days = eachDayOfInterval({ start: startOfWeek(cursor, { weekStartsOn }), end: endOfWeek(cursor, { weekStartsOn }) })
  return (
    <div className="grid gap-3 lg:grid-cols-7 lg:gap-2">
      {days.map((d) => (
        <Card key={d.toISOString()} className={cn('p-2', isToday(d) && 'ring-1 ring-primary/50')}>
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-sm"><span className="text-muted-foreground">{capitalize(fmt(d, 'EEE'))}</span> <b className={cn('font-semibold', isToday(d) && 'text-primary')}>{d.getDate()}</b></span>
            <button className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted" aria-label={`Novo compromisso em ${fmt(d, "d 'de' MMMM")}`} onClick={() => openEvent(null, defaultsFor(d))}><Plus className="size-4" /></button>
          </div>
          <div className="lg:[&_.w-14]:hidden"><DayAgenda day={d} occ={occ} tasks={tasks} cats={cats} empty /></div>
        </Card>
      ))}
    </div>
  )
}

const HOUR = 56
function DayView({ day, occ, tasks, cats }: { day: Date; occ: Occurrence[]; tasks: Task[]; cats: Category[] }) {
  const { openEvent, openTask } = useEditors()
  const ref = useRef<HTMLDivElement>(null)
  const list = occurrencesOnDay(occ, day)
  const allDay = list.filter((o) => o.event.all_day || !isSameDay(o.start, o.end) && o.start < startOfDay(day))
  const timed = list.filter((o) => !allDay.includes(o))
  const dayTasks = tasks.filter((t) => t.due_date === toDateKey(day))

  // distribui eventos sobrepostos em colunas
  const layout = useMemo(() => {
    const cols: Occurrence[][] = []
    const pos = new Map<string, { col: number; cols: number }>()
    let group: Occurrence[] = [], groupEnd = 0
    const flush = () => { const n = Math.max(1, cols.length); group.forEach((o) => pos.set(o.key, { ...pos.get(o.key)!, cols: n })); cols.length = 0; group = [] }
    for (const o of timed) {
      if (o.start.getTime() >= groupEnd) { flush(); groupEnd = 0 }
      let c = cols.findIndex((col) => col[col.length - 1].end <= o.start)
      if (c < 0) { cols.push([]); c = cols.length - 1 }
      cols[c].push(o); group.push(o); pos.set(o.key, { col: c, cols: 1 })
      groupEnd = Math.max(groupEnd, o.end.getTime())
    }
    flush()
    return pos
  }, [timed])

  useEffect(() => { ref.current?.scrollTo({ top: HOUR * 7 }) }, [day])
  const now = new Date()
  const dayStart = startOfDay(day)

  return (
    <Card className="p-2 sm:p-3">
      {(allDay.length > 0 || dayTasks.length > 0) && (
        <div className="mb-2 space-y-1 border-b pb-2">
          {allDay.map((o) => <button key={o.key} onClick={() => openEvent(o.event)} className={cn('block w-full truncate rounded-lg px-3 py-1.5 text-left text-sm', colorOf(cats.find((c) => c.id === o.event.category_id)?.color).soft)}>{o.event.title}</button>)}
          {dayTasks.map((t) => <TaskLine key={t.id} t={t} onOpen={() => openTask(t)} />)}
        </div>
      )}
      <div ref={ref} className="relative h-[62dvh] overflow-y-auto">
        <div className="relative" style={{ height: HOUR * 24 }}>
          {Array.from({ length: 24 }, (_, h) => (
            <button key={h} className="absolute inset-x-0 flex border-t border-border/70 text-left" style={{ top: h * HOUR, height: HOUR }}
              aria-label={`Novo compromisso às ${h}h`} onClick={() => { const s = new Date(dayStart); s.setHours(h); openEvent(null, { starts_at: s.toISOString(), ends_at: new Date(s.getTime() + 3600_000).toISOString() }) }}>
              <span className="-mt-2.5 w-12 bg-card pr-2 text-right text-[11px] text-muted-foreground tabular-nums">{h ? `${String(h).padStart(2, '0')}:00` : ''}</span>
            </button>
          ))}
          {isToday(day) && <div className="pointer-events-none absolute right-0 left-12 z-10 h-px bg-danger" style={{ top: ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR }}><span className="absolute -top-1 -left-1 size-2 rounded-full bg-danger" /></div>}
          {timed.map((o) => {
            const startMin = Math.max(0, (o.start.getTime() - dayStart.getTime()) / 60000)
            const endMin = Math.min(24 * 60, (o.end.getTime() - dayStart.getTime()) / 60000)
            const p = layout.get(o.key) ?? { col: 0, cols: 1 }
            const color = colorOf(cats.find((c) => c.id === o.event.category_id)?.color).hex
            return (
              <button key={o.key} onClick={() => openEvent(o.event)}
                className="absolute overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left text-xs shadow-sm"
                style={{ top: (startMin / 60) * HOUR + 1, height: Math.max(22, ((endMin - startMin) / 60) * HOUR - 2), left: `calc(3.25rem + (100% - 3.5rem) * ${p.col / p.cols})`, width: `calc((100% - 3.5rem) / ${p.cols} - 2px)`, borderColor: color, background: `color-mix(in srgb, ${color} 22%, var(--card))` }}>
                <b className="block truncate font-semibold">{o.event.title}</b>
                <span className="text-muted-foreground">{fmt(o.start, 'HH:mm')}–{fmt(o.end, 'HH:mm')}</span>
              </button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function ListView({ occ, tasks, cats }: { occ: Occurrence[]; tasks: Task[]; cats: Category[] }) {
  const { openEvent } = useEditors()
  const today = startOfDay(new Date())
  const days = eachDayOfInterval({ start: today, end: addDays(today, 59) })
    .filter((d) => occurrencesOnDay(occ, d).length || tasks.some((t) => t.due_date === toDateKey(d) && !t.completed_at))
  if (!days.length) return <Card><EmptyState icon={<CalendarDays />} title="Nada nos próximos 60 dias" action={<Button onClick={() => openEvent(null)}><Plus />Novo compromisso</Button>} /></Card>
  return (
    <div className="space-y-3">
      {days.map((d) => (
        <Card key={d.toISOString()} className="p-3">
          <h2 className="px-2.5 pb-1 text-sm font-semibold">{friendlyDay(d)} <span className="font-normal text-muted-foreground">· {fmt(d, "d 'de' MMMM")}</span></h2>
          <DayAgenda day={d} occ={occ} tasks={tasks.filter((t) => !t.completed_at)} cats={cats} />
        </Card>
      ))}
    </div>
  )
}

export function AgendaPage() {
  const { data: events, isLoading, isError, refetch } = useTable('events')
  const { data: allTasks = [] } = useTable('tasks')
  const { data: cats = [] } = useTable('categories')
  const { data: profile } = useProfile()
  const { openEvent } = useEditors()
  const weekStartsOn = profile?.week_starts_on ?? 0
  const [view, setViewState] = useState<View>(readView)
  const [cursor, setCursor] = useState(() => startOfDay(new Date()))
  const [params] = useSearchParams()
  const [filter, setFilter] = useState<string[]>(() => { const c = params.get('categoria'); return c ? [c] : [] })
  const [showTasks, setShowTasks] = useState(true)
  const setView = (v: View) => { setViewState(v); try { localStorage.setItem('lume-agenda-view', v) } catch { /* ignore */ } }

  const range = useMemo(() => {
    if (view === 'month') return [startOfWeek(startOfMonth(cursor), { weekStartsOn }), addDays(endOfWeek(endOfMonth(cursor), { weekStartsOn }), 1)]
    if (view === 'week') return [startOfWeek(cursor, { weekStartsOn }), addDays(endOfWeek(cursor, { weekStartsOn }), 1)]
    if (view === 'day') return [cursor, addDays(cursor, 1)]
    const t = startOfDay(new Date()); return [t, addDays(t, 60)]
  }, [view, cursor, weekStartsOn])

  const occ = useMemo(() => {
    const filtered = (events ?? []).filter((e) => !filter.length || filter.includes(e.category_id ?? 'none'))
    return expandEvents(filtered, range[0], range[1])
  }, [events, filter, range])
  const tasks = showTasks ? allTasks.filter((t) => !t.parent_id && t.due_date && (!filter.length || filter.includes(t.category_id ?? 'none'))) : []

  const move = (dir: 1 | -1) => {
    const f = { month: [addMonths, subMonths], week: [addWeeks, subWeeks], day: [addDays, subDays], list: [addDays, subDays] }[view]
    setCursor((c) => (dir === 1 ? f[0] : f[1])(c, 1))
  }
  const title = view === 'month' ? capitalize(fmt(cursor, 'MMMM yyyy'))
    : view === 'week' ? `${fmt(startOfWeek(cursor, { weekStartsOn }), 'd MMM')} – ${fmt(endOfWeek(cursor, { weekStartsOn }), "d MMM")}`
    : view === 'day' ? capitalize(fmt(cursor, "EEEE, d 'de' MMMM")) : 'Próximos 60 dias'

  if (isError) return <ErrorState onRetry={refetch} />
  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader title="Agenda" action={<Button aria-label="Novo compromisso" onClick={() => openEvent(null, view === "list" ? undefined : defaultsFor(cursor))}><Plus /><span className="hidden sm:inline">Novo compromisso</span></Button>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented label="Visualização" value={view} onChange={setView} className="w-full sm:w-auto"
          options={[{ value: 'month', label: 'Mês' }, { value: 'week', label: 'Semana' }, { value: 'day', label: 'Dia' }, { value: 'list', label: 'Lista' }]} />
        {view !== 'list' && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Anterior" onClick={() => move(-1)}><ChevronLeft /></Button>
            <span className="min-w-36 text-center text-sm font-semibold" aria-live="polite">{title}</span>
            <Button variant="ghost" size="icon-sm" aria-label="Próximo" onClick={() => move(1)}><ChevronRight /></Button>
            <Button variant="outline" size="sm" onClick={() => setCursor(startOfDay(new Date()))}>Hoje</Button>
          </div>
        )}
      </div>
      <div className="-mx-4 mb-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Filtrar por categoria">
        <Chip active={!filter.length} onClick={() => setFilter([])}>Todas</Chip>
        {cats.map((c) => <Chip key={c.id} active={filter.includes(c.id)} color={c.color} onClick={() => setFilter((f) => f.includes(c.id) ? f.filter((x) => x !== c.id) : [...f, c.id])}>{c.name}</Chip>)}
        <label className="ml-auto flex shrink-0 items-center gap-2 pl-2 text-sm text-muted-foreground">Tarefas <Switch label="Mostrar tarefas com prazo" checked={showTasks} onCheckedChange={setShowTasks} /></label>
      </div>
      {view === 'month' && <MonthView cursor={cursor} selected={cursor} onSelect={setCursor} occ={occ} tasks={tasks} cats={cats} weekStartsOn={weekStartsOn} />}
      {view === 'week' && <WeekView cursor={cursor} occ={occ} tasks={tasks} cats={cats} weekStartsOn={weekStartsOn} />}
      {view === 'day' && <DayView day={cursor} occ={occ} tasks={tasks} cats={cats} />}
      {view === 'list' && <ListView occ={occ} tasks={tasks} cats={cats} />}
    </div>
  )
}
