import { useMemo } from 'react'
import { Link } from 'react-router'
import { addDays, startOfDay, startOfWeek } from 'date-fns'
import { CalendarDays, CheckSquare, ChevronRight, FolderPlus, Plus } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, Dot, EmptyState, ErrorState, PageLoader, Skeleton } from '@/components/ui/misc'
import { useProfile, useTable, useTableMutations } from '@/hooks/useData'
import { useEditors } from '@/features/shared/editors'
import { TaskItem } from '@/features/tasks/TaskItem'
import { coreById, coreCategories, coreModules, type CoreDef, type CoreId } from '@/lib/cores'
import { colorOf } from '@/lib/colors'
import { expandEvents, filterTasks, sortTasks } from '@/lib/domain'
import { capitalize, fmt, friendlyDay, toDateKey, todayKey } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { ModuleDef } from '@/lib/modules'

function shortDay(d: Date) {
  const f = friendlyDay(d)
  return f.length <= 7 ? f : capitalize(fmt(d, "EEE, d/MM"))
}

function CoreHeader({ core }: { core: CoreDef }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <span className={cn('grid size-14 shrink-0 place-items-center rounded-2xl', colorOf(core.color).soft)}><core.icon className="size-7" /></span>
      <div>
        <h1 className="font-serif text-[28px] leading-tight font-medium tracking-tight sm:text-3xl">{core.label}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{core.description}</p>
      </div>
    </div>
  )
}

/** Pequeno resumo por módulo, mostrado no cartão do núcleo. */
function useModuleStats() {
  const { data: events } = useTable('events')
  const { data: tasks } = useTable('tasks')
  const { data: habits } = useTable('habits')
  const { data: sessions } = useTable('workout_sessions')
  const { data: mealLogs } = useTable('meal_logs')
  const { data: profile } = useProfile()
  return useMemo(() => {
    const today = startOfDay(new Date())
    const s: Record<string, string | undefined> = {}
    if (events) {
      const n = expandEvents(events, today, addDays(today, 1)).length
      s.agenda = n ? `${n} compromisso${n > 1 ? 's' : ''} hoje` : 'Nada marcado hoje'
    }
    if (tasks) {
      const n = filterTasks(tasks, 'today').length, late = filterTasks(tasks, 'overdue').length
      s.tasks = `${n} para hoje` + (late ? ` · ${late} atrasada${late > 1 ? 's' : ''}` : '')
    }
    if (habits) {
      const n = habits.filter((h) => !h.archived_at).length
      s.habits = `${n} hábito${n === 1 ? '' : 's'} ativo${n === 1 ? '' : 's'}`
    }
    if (sessions) {
      const from = toDateKey(startOfWeek(today, { weekStartsOn: profile?.week_starts_on ?? 0 }))
      const n = sessions.filter((x) => x.performed_on >= from).length
      s.workout = `${n} treino${n === 1 ? '' : 's'} nesta semana`
    }
    if (mealLogs) {
      const n = mealLogs.filter((x) => x.log_date === todayKey()).length
      s.food = `${n} refeiç${n === 1 ? 'ão registrada' : 'ões registradas'} hoje`
    }
    return s
  }, [events, tasks, habits, sessions, mealLogs, profile?.week_starts_on])
}

function ModuleCard({ m, stat, color }: { m: ModuleDef; stat?: string; color: string }) {
  return (
    <Link to={m.path!} className="group">
      <Card className="flex h-full items-center gap-4 p-4 transition group-hover:bg-muted/50">
        <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', colorOf(color).soft)}><m.icon className="size-6" /></span>
        <span className="min-w-0 flex-1">
          <b className="block font-semibold">{m.label}</b>
          <span className="text-sm text-muted-foreground">{stat ?? m.description}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </Card>
    </Link>
  )
}

/** Núcleos formados por módulos (Pessoal, Saúde). */
function ModulesCore({ core }: { core: CoreDef }) {
  const { data: profile } = useProfile()
  const { active, off, soon } = coreModules(core, profile?.enabled_modules)
  const stats = useModuleStats()
  return (
    <>
      {active.length === 0 ? (
        <Card><EmptyState icon={<core.icon />} title="Nada ativo por aqui ainda" text="Ative os módulos deste núcleo no seu perfil para começar."
          action={<Button asChild variant="outline"><Link to="/perfil">Ir para o perfil</Link></Button>} /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((m) => <ModuleCard key={m.id} m={m} stat={stats[m.id]} color={core.color} />)}
        </div>
      )}
      {off.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          Desativados: {off.map((m) => m.label).join(', ')}. <Link to="/perfil" className="text-primary hover:underline">Ativar no perfil</Link>
        </p>
      )}
      {soon.length > 0 && (
        <>
          <h2 className="mt-10 mb-3 font-serif text-xl">Chegando em breve</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {soon.map((m) => (
              <Card key={m.id} className="flex items-center gap-4 p-4 opacity-80">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-muted text-muted-foreground"><m.icon className="size-6" /></span>
                <span className="flex-1"><b className="block font-semibold">{m.label}</b><span className="text-sm text-muted-foreground">{m.description}</span></span>
                <Badge>Fase {m.phase}</Badge>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  )
}

/** Núcleos formados por categoria (Trabalho, Estudo): reúnem tarefas e compromissos daquela categoria. */
function CategoryCore({ core }: { core: CoreDef }) {
  const { data: cats, isLoading, isError, refetch } = useTable('categories')
  const { data: tasks = [] } = useTable('tasks')
  const { data: events, isLoading: loadingEvents } = useTable('events')
  const { data: profile } = useProfile()
  const { create } = useTableMutations('categories')
  const { openTask, openEvent } = useEditors()
  const enabled = profile?.enabled_modules ?? []
  const hasTasks = enabled.includes('tasks'), hasAgenda = enabled.includes('agenda')

  const mine = useMemo(() => coreCategories(core, cats ?? []), [core, cats])
  const ids = useMemo(() => new Set(mine.map((c) => c.id)), [mine])
  const main = mine[0]

  const openTasks = useMemo(() => sortTasks(tasks.filter((t) => !t.parent_id && !t.completed_at && t.category_id && ids.has(t.category_id))), [tasks, ids])
  const late = filterTasks(openTasks, 'overdue').length
  const upcoming = useMemo(() => {
    const today = startOfDay(new Date())
    return expandEvents((events ?? []).filter((e) => e.category_id && ids.has(e.category_id)), today, addDays(today, 14)).slice(0, 8)
  }, [events, ids])

  if (isError) return <ErrorState onRetry={refetch} />
  if (isLoading) return <PageLoader />

  if (!main) {
    return (
      <Card>
        <EmptyState icon={<FolderPlus />} title={`Crie a categoria ${core.categoryLabel}`}
          text={`Tudo o que você marcar com a categoria ${core.categoryLabel} (tarefas e compromissos) aparece reunido aqui.`}
          action={<Button disabled={create.isPending} onClick={() => create.mutate({ row: { name: core.categoryLabel!, color: core.color, position: (cats ?? []).length }, success: 'Categoria criada!' })}>
            <Plus />Criar categoria {core.categoryLabel}</Button>} />
      </Card>
    )
  }

  const link = (to: string) => ({ to: `${to}?categoria=${main.id}`, state: { core: core.id } })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {hasTasks && <Button onClick={() => openTask(null, { category_id: main.id })}><Plus />Nova tarefa</Button>}
        {hasAgenda && <Button variant="outline" onClick={() => openEvent(null, { category_id: main.id })}><Plus />Novo compromisso</Button>}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {hasTasks && (
          <Card>
            <CardHeader title={late ? `Tarefas · ${late} atrasada${late > 1 ? 's' : ''}` : 'Tarefas'} icon={<CheckSquare />}
              action={<Link {...link('/tarefas')} className="text-sm font-medium text-primary hover:underline">Ver todas</Link>} />
            {openTasks.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Nenhuma tarefa pendente de {core.label.toLowerCase()}.</p>
            ) : (
              <ul className="-mx-2">
                {openTasks.slice(0, 8).map((t) => <TaskItem key={t.id} task={t} all={tasks} categories={cats ?? []} onOpen={(x) => openTask(x)} />)}
              </ul>
            )}
          </Card>
        )}
        {hasAgenda && (
          <Card>
            <CardHeader title="Próximos compromissos" icon={<CalendarDays />}
              action={<Link {...link('/agenda')} className="text-sm font-medium text-primary hover:underline">Agenda</Link>} />
            {loadingEvents ? <Skeleton className="h-16" /> : upcoming.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Nada marcado nas próximas duas semanas.</p>
            ) : (
              <ul className="-mx-2 space-y-0.5">
                {upcoming.map((o) => (
                  <li key={o.key}>
                    <button onClick={() => openEvent(o.event)} className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-muted/60">
                      <span className="w-20 shrink-0 pt-0.5 text-sm">
                        <span className="block font-semibold">{shortDay(o.start)}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{o.event.all_day ? 'Dia todo' : fmt(o.start, 'HH:mm')}</span>
                      </span>
                      <Dot color={cats?.find((c) => c.id === o.event.category_id)?.color} className="mt-1.5" />
                      <span className="min-w-0 text-[15px]">{o.event.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Aqui aparecem as tarefas e compromissos com a categoria {mine.map((c) => c.name).join(' ou ')}.
        Módulos próprios de {core.label.toLowerCase()} chegam nas próximas fases.
      </p>
    </div>
  )
}

export function CorePage({ id }: { id: CoreId }) {
  const core = coreById(id)!
  return (
    <div>
      <CoreHeader core={core} />
      {core.categoryNames ? <CategoryCore core={core} /> : <ModulesCore core={core} />}
    </div>
  )
}
