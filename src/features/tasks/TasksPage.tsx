import { useMemo, useState } from 'react'
import { CheckSquare, Plus, Search, Tags } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { Chip, EmptyState, ErrorState, PageHeader, PageLoader } from '@/components/ui/misc'
import { useTable } from '@/hooks/useData'
import { useEditors } from '@/features/shared/editors'
import { CategoryManager } from '@/features/shared/CategoryManager'
import { filterTasks, sortTasks, type TaskFilter } from '@/lib/domain'
import { fromDateKey, friendlyDay, todayKey } from '@/lib/dates'
import { TaskItem } from './TaskItem'
import type { Task } from '@/data/types'

const FILTERS: { v: TaskFilter; label: string }[] = [
  { v: 'today', label: 'Hoje' }, { v: 'upcoming', label: 'Próximas' }, { v: 'overdue', label: 'Atrasadas' },
  { v: 'nodate', label: 'Sem data' }, { v: 'all', label: 'Todas' }, { v: 'done', label: 'Concluídas' },
]
const EMPTY: Record<TaskFilter, string> = {
  today: 'Nada para hoje. Que tal aproveitar o tempo livre?', upcoming: 'Nenhuma tarefa futura.', overdue: 'Nada atrasado. Muito bem!',
  nodate: 'Nenhuma tarefa sem data.', all: 'Nenhuma tarefa pendente.', done: 'As tarefas concluídas aparecem aqui.',
}

export function TasksPage() {
  const { data: tasks, isLoading, isError, refetch } = useTable('tasks')
  const { data: cats = [] } = useTable('categories')
  const { openTask } = useEditors()
  const [filter, setFilter] = useState<TaskFilter>('today')
  const [cat, setCat] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [manage, setManage] = useState(false)

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.v, tasks ? filterTasks(tasks, f.v).length : 0])), [tasks])
  const list = useMemo(() => {
    if (!tasks) return []
    let l = filterTasks(tasks, filter)
    if (cat) l = l.filter((t) => t.category_id === cat)
    if (q.trim()) {
      const s = q.trim().toLowerCase()
      l = l.filter((t) => t.title.toLowerCase().includes(s) || t.notes?.toLowerCase().includes(s) || t.tags.some((g) => g.toLowerCase().includes(s)))
    }
    return filter === 'done' ? l : sortTasks(l)
  }, [tasks, filter, cat, q])

  // agrupa por dia nas visões com várias datas
  const groups = useMemo(() => {
    if (!['upcoming', 'overdue', 'all'].includes(filter)) return [{ key: '', label: '', items: list }]
    const m = new Map<string, Task[]>()
    for (const t of list) { const k = t.due_date ?? 'sem'; m.set(k, [...(m.get(k) ?? []), t]) }
    return [...m.entries()].map(([k, items]) => ({ key: k, label: k === 'sem' ? 'Sem data' : friendlyDay(fromDateKey(k)), items }))
  }, [list, filter])

  if (isError) return <ErrorState onRetry={refetch} />
  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader title="Tarefas" subtitle={counts.overdue ? `${counts.today} para hoje · ${counts.overdue} atrasada${counts.overdue > 1 ? 's' : ''}` : `${counts.today} para hoje`}
        action={<Button aria-label="Nova tarefa" onClick={() => openTask(null, filter === "today" ? { due_date: todayKey() } : undefined)}><Plus /><span className="hidden sm:inline">Nova tarefa</span></Button>} />

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Filtrar tarefas">
        {FILTERS.map((f) => (
          <Chip key={f.v} active={filter === f.v} onClick={() => setFilter(f.v)}>
            {f.label}{f.v !== 'done' && counts[f.v] > 0 && <span className="text-xs opacity-70">{counts[f.v]}</span>}
          </Chip>
        ))}
      </div>
      <div className="-mx-4 mb-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Filtrar por categoria">
        <Chip active={cat === null} onClick={() => setCat(null)}>Todas</Chip>
        {cats.map((c) => <Chip key={c.id} active={cat === c.id} color={c.color} onClick={() => setCat(cat === c.id ? null : c.id)}>{c.name}</Chip>)}
        <Button variant="ghost" size="sm" onClick={() => setManage(true)} className="shrink-0"><Tags />Gerenciar</Button>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título, anotação ou etiqueta" aria-label="Buscar tarefas" className="pl-10" />
      </div>

      <Card className="p-3 sm:p-4">
        {list.length === 0 ? (
          <EmptyState icon={<CheckSquare />} title={q || cat ? 'Nada encontrado' : EMPTY[filter]}
            action={filter !== 'done' && !q ? <Button variant="outline" onClick={() => openTask(null, filter === 'today' ? { due_date: todayKey() } : undefined)}><Plus />Adicionar tarefa</Button> : undefined} />
        ) : groups.map((g) => (
          <section key={g.key} className="mb-2 last:mb-0">
            {g.label && <h2 className="px-2 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{g.label}</h2>}
            <ul>{g.items.map((t) => <TaskItem key={t.id} task={t} all={tasks!} categories={cats} onOpen={openTask} showDate={!g.label && filter !== 'today'} />)}</ul>
          </section>
        ))}
      </Card>
      <CategoryManager open={manage} onOpenChange={setManage} />
    </div>
  )
}
