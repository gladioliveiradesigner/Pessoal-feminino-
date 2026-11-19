import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { addDays, startOfDay } from 'date-fns'
import { Bell, CalendarDays, CheckSquare, ChevronDown, ChevronUp, MapPin, Plus, Repeat, Settings2, Smile, Sparkles } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { Sheet } from '@/components/ui/dialog'
import { Dot, EmptyState, ErrorState, Skeleton, Switch } from '@/components/ui/misc'
import { useProfile, useTable, useTableMutations, useUpdateProfile } from '@/hooks/useData'
import { useEditors } from '@/features/shared/editors'
import { TaskItem } from '@/features/tasks/TaskItem'
import { HabitToday } from '@/features/habits/HabitToday'
import { MoodPicker } from './MoodPicker'
import { expandEvents, filterTasks, occurrencesOnDay, sortTasks, upcomingReminders, isScheduled } from '@/lib/domain'
import { capitalize, fmt, friendlyDay, greeting, todayKey, toDateKey } from '@/lib/dates'
import { firstName } from '@/lib/utils'
import { DEFAULT_WIDGETS, type WidgetId, type WidgetPref } from '@/data/types'

const WIDGET_LABEL: Record<WidgetId, string> = {
  tasks: 'Tarefas de hoje', events: 'Compromissos de hoje', habits: 'Hábitos do dia', mood: 'Como você está', reminders: 'Lembretes',
}
const PHRASES = [
  'Que tal organizar seu dia?', 'Um passo de cada vez já é muito.', 'Seu ritmo é o ritmo certo.',
  'Hoje é um bom dia para cuidar de você.', 'Pequenas escolhas, grandes mudanças.',
]

function TasksWidget() {
  const { data: tasks, isLoading, isError, refetch } = useTable('tasks')
  const { data: cats = [] } = useTable('categories')
  const { create } = useTableMutations('tasks')
  const { openTask } = useEditors()
  const [title, setTitle] = useState('')
  const list = useMemo(() => tasks ? sortTasks([...filterTasks(tasks, 'overdue'), ...filterTasks(tasks, 'today')]) : [], [tasks])
  const doneToday = tasks?.filter((t) => !t.parent_id && t.completed_at && toDateKey(new Date(t.completed_at)) === todayKey()).length ?? 0

  const quickAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    create.mutate({ row: { title: title.trim(), due_date: todayKey() }, success: 'Tarefa adicionada para hoje.' })
    setTitle('')
  }

  return (
    <Card>
      <CardHeader title="Tarefas de hoje" icon={<CheckSquare />} action={<Link to="/tarefas" className="text-sm font-medium text-primary hover:underline">Ver todas</Link>} />
      {isError ? <ErrorState onRetry={refetch} /> : isLoading ? <div className="space-y-2"><Skeleton className="h-10" /><Skeleton className="h-10" /></div> : (
        <>
          {list.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">{doneToday > 0 ? `Tudo feito por hoje! ${doneToday} tarefa${doneToday > 1 ? 's' : ''} concluída${doneToday > 1 ? 's' : ''}.` : 'Nada pendente para hoje. Aproveite!'}</p>
          ) : (
            <ul className="-mx-2">{list.slice(0, 7).map((t) => <TaskItem key={t.id} task={t} all={tasks!} categories={cats} onOpen={openTask} />)}</ul>
          )}
          {list.length > 7 && <Link to="/tarefas" className="mt-1 block text-sm text-muted-foreground hover:underline">+ {list.length - 7} tarefas</Link>}
          <form onSubmit={quickAdd} className="mt-3 flex gap-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Adicionar tarefa para hoje" aria-label="Nova tarefa para hoje" className="h-10" />
            <Button type="submit" size="icon-sm" className="size-10" aria-label="Adicionar tarefa"><Plus /></Button>
          </form>
        </>
      )}
    </Card>
  )
}

function EventsWidget() {
  const { data: events, isLoading, isError, refetch } = useTable('events')
  const { data: cats = [] } = useTable('categories')
  const { openEvent } = useEditors()
  const today = startOfDay(new Date())
  const list = useMemo(() => events ? occurrencesOnDay(expandEvents(events, today, addDays(today, 1)), today) : [], [events]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card>
      <CardHeader title="Compromissos de hoje" icon={<CalendarDays />} action={<Link to="/agenda" className="text-sm font-medium text-primary hover:underline">Agenda</Link>} />
      {isError ? <ErrorState onRetry={refetch} /> : isLoading ? <Skeleton className="h-16" /> : list.length === 0 ? (
        <div className="flex items-center justify-between gap-3 py-2">
          <p className="text-sm text-muted-foreground">Nenhum compromisso hoje.</p>
          <Button variant="outline" size="sm" onClick={() => openEvent(null)}><Plus />Novo</Button>
        </div>
      ) : (
        <ul className="space-y-1">
          {list.map((o) => {
            const cat = cats.find((c) => c.id === o.event.category_id)
            return (
              <li key={o.key}>
                <button onClick={() => openEvent(o.event)} className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-muted/60">
                  <span className="w-12 shrink-0 pt-0.5 text-sm font-semibold tabular-nums">{o.event.all_day ? 'Dia' : fmt(o.start, 'HH:mm')}</span>
                  <Dot color={cat?.color} className="mt-1.5" />
                  <span className="min-w-0">
                    <span className="block text-[15px]">{o.event.title}</span>
                    {o.event.location && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{o.event.location}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function HabitsWidget() {
  const { data: habits, isLoading } = useTable('habits')
  const list = (habits ?? []).filter((h) => !h.archived_at && isScheduled(h, new Date()))
  return (
    <Card>
      <CardHeader title="Hábitos do dia" icon={<Repeat />} action={<Link to="/rotina" className="text-sm font-medium text-primary hover:underline">Rotina</Link>} />
      {isLoading ? <Skeleton className="h-16" /> : list.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Nenhum hábito para hoje. <Link to="/rotina" className="text-primary hover:underline">Criar um hábito</Link></p>
      ) : <HabitToday habits={list} compact />}
    </Card>
  )
}

function MoodWidget() {
  const { data: entries = [] } = useTable('mood_entries')
  const { create, update } = useTableMutations('mood_entries')
  const { openMood } = useEditors()
  const today = entries.find((e) => e.entry_date === todayKey())
  const set = (mood: number) => {
    if (today) update.mutate({ id: today.id, patch: { mood }, success: 'Humor atualizado.' })
    else create.mutate({ row: { entry_date: todayKey(), mood }, success: 'Registrado. Obrigada por se ouvir.' })
  }
  return (
    <Card>
      <CardHeader title="Como você está?" icon={<Smile />} action={<button onClick={openMood} className="text-sm font-medium text-primary hover:underline">{today ? 'Detalhar' : 'Mais opções'}</button>} />
      <MoodPicker value={today?.mood ?? null} onChange={set} />
      <p className="mt-3 text-xs text-muted-foreground">Privado. Só você vê.</p>
    </Card>
  )
}

function RemindersWidget() {
  const { data: events = [] } = useTable('events')
  const { data: tasks = [] } = useTable('tasks')
  const { openEvent, openTask } = useEditors()
  const now = new Date()
  const reminders = useMemo(() => upcomingReminders(expandEvents(events, now, addDays(now, 3)), now), [events]) // eslint-disable-line react-hooks/exhaustive-deps
  const tomorrow = toDateKey(addDays(now, 1))
  const dueTomorrow = tasks.filter((t) => !t.parent_id && !t.completed_at && t.due_date === tomorrow)
  const empty = reminders.length === 0 && dueTomorrow.length === 0
  return (
    <Card>
      <CardHeader title="Lembretes" icon={<Bell />} />
      {empty ? <p className="py-2 text-sm text-muted-foreground">Nenhum lembrete para os próximos dias.</p> : (
        <ul className="space-y-1 text-sm">
          {reminders.map(({ occ }) => (
            <li key={occ.key}><button onClick={() => openEvent(occ.event)} className="flex w-full gap-2 rounded-xl p-2 text-left hover:bg-muted/60">
              <Bell className="mt-0.5 size-4 shrink-0 text-primary" /><span><b className="font-semibold">{occ.event.title}</b> · {friendlyDay(occ.start)}{occ.event.all_day ? '' : `, ${fmt(occ.start, 'HH:mm')}`}</span>
            </button></li>
          ))}
          {dueTomorrow.map((t) => (
            <li key={t.id}><button onClick={() => openTask(t)} className="flex w-full gap-2 rounded-xl p-2 text-left hover:bg-muted/60">
              <CheckSquare className="mt-0.5 size-4 shrink-0 text-primary" /><span><b className="font-semibold">{t.title}</b> · vence amanhã</span>
            </button></li>
          ))}
        </ul>
      )}
    </Card>
  )
}

const WIDGETS: Record<WidgetId, () => React.ReactElement> = {
  tasks: TasksWidget, events: EventsWidget, habits: HabitsWidget, mood: MoodWidget, reminders: RemindersWidget,
}
const WIDGET_MODULE: Partial<Record<WidgetId, string>> = { tasks: 'tasks', events: 'agenda', habits: 'habits' }

function Customize({ open, onOpenChange, widgets, enabled }: { open: boolean; onOpenChange: (o: boolean) => void; widgets: WidgetPref[]; enabled: string[] }) {
  const save = useUpdateProfile()
  const set = (next: WidgetPref[]) => save.mutate({ dashboard_widgets: next })
  const move = (i: number, d: -1 | 1) => {
    const next = [...widgets]; const j = i + d
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]; set(next)
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Personalizar início" description="Mostre, oculte e reordene os cartões.">
      <ul className="space-y-2 pt-2 pb-2">
        {widgets.map((w, i) => {
          const mod = WIDGET_MODULE[w.id]
          const off = mod && !enabled.includes(mod)
          return (
            <li key={w.id} className="flex items-center gap-2 rounded-2xl border bg-card p-2 pl-4">
              <span className="flex-1 text-[15px]">{WIDGET_LABEL[w.id]}{off && <span className="block text-xs text-muted-foreground">Módulo desativado</span>}</span>
              <Button variant="ghost" size="icon-sm" aria-label={`Mover ${WIDGET_LABEL[w.id]} para cima`} disabled={i === 0} onClick={() => move(i, -1)}><ChevronUp /></Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Mover ${WIDGET_LABEL[w.id]} para baixo`} disabled={i === widgets.length - 1} onClick={() => move(i, 1)}><ChevronDown /></Button>
              <Switch label={`Mostrar ${WIDGET_LABEL[w.id]}`} checked={w.visible && !off} disabled={!!off}
                onCheckedChange={(v) => set(widgets.map((x) => (x.id === w.id ? { ...x, visible: v } : x)))} />
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}

export function DashboardPage() {
  const { data: profile } = useProfile()
  const [customize, setCustomize] = useState(false)
  const now = new Date()
  const enabled = profile?.enabled_modules ?? []
  const saved = profile?.dashboard_widgets?.length ? profile.dashboard_widgets : DEFAULT_WIDGETS
  // garante que widgets novos apareçam mesmo em perfis antigos
  const widgets = [...saved, ...DEFAULT_WIDGETS.filter((d) => !saved.some((s) => s.id === d.id))]
  const visible = widgets.filter((w) => w.visible && (!WIDGET_MODULE[w.id] || enabled.includes(WIDGET_MODULE[w.id]!)))
  const phrase = PHRASES[now.getDate() % PHRASES.length]
  const name = firstName(profile?.display_name)

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{capitalize(fmt(now, "EEEE, d 'de' MMMM"))}</p>
          <h1 className="mt-1 font-serif text-[28px] leading-tight sm:text-4xl">{greeting(now)}{name ? `, ${name}` : ''}!</h1>
          <p className="mt-1 text-muted-foreground">{phrase}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setCustomize(true)} aria-label="Personalizar início"><Settings2 /></Button>
      </div>
      {visible.length === 0 ? (
        <EmptyState icon={<Sparkles />} title="Seu início está vazio" text="Escolha os cartões que quer ver aqui."
          action={<Button onClick={() => setCustomize(true)}>Personalizar</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((w) => { const W = WIDGETS[w.id]; return <W key={w.id} /> })}
        </div>
      )}
      <Customize open={customize} onOpenChange={setCustomize} widgets={widgets} enabled={enabled} />
    </div>
  )
}
