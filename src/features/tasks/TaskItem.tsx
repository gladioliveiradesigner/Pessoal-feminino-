import { Check, Flag, Repeat, ListChecks, Clock } from 'lucide-react'
import type { Category, Task } from '@/data/types'
import { Badge } from '@/components/ui/misc'
import { fromDateKey, friendlyDay, todayKey } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { useToggleTask } from './useTaskActions'

export function TaskCheck({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const done = !!task.completed_at
  return (
    <button onClick={onToggle} role="checkbox" aria-checked={done} aria-label={done ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
      className="-m-2 grid size-11 shrink-0 place-items-center">
      <span className={cn('grid size-6 place-items-center rounded-full border-2 transition',
        done ? 'animate-pop border-primary bg-primary text-primary-foreground' : task.priority === 'high' ? 'border-rose hover:bg-rose/15' : 'border-input hover:border-primary')}>
        {done && <Check className="size-3.5" strokeWidth={3} />}
      </span>
    </button>
  )
}

export function TaskItem({ task, all, categories, onOpen, showDate = true }: {
  task: Task; all: Task[]; categories: Category[]; onOpen: (t: Task) => void; showDate?: boolean
}) {
  const toggle = useToggleTask()
  const subs = all.filter((t) => t.parent_id === task.id)
  const subsDone = subs.filter((s) => s.completed_at).length
  const cat = categories.find((c) => c.id === task.category_id)
  const overdue = !task.completed_at && task.due_date && task.due_date < todayKey()
  const done = !!task.completed_at

  return (
    <li className="group flex items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-muted/60">
      <TaskCheck task={task} onToggle={() => toggle(task)} />
      <button onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
        <span className={cn('block text-[15px] leading-snug', done && 'text-muted-foreground line-through decoration-muted-foreground/50')}>{task.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          {showDate && task.due_date && (
            <span className={cn('inline-flex items-center gap-1', overdue && 'font-medium text-danger')}>
              <Clock className="size-3" />{friendlyDay(fromDateKey(task.due_date))}{task.due_time ? ` · ${task.due_time.slice(0, 5)}` : ''}
            </span>
          )}
          {!showDate && task.due_time && <span className="inline-flex items-center gap-1"><Clock className="size-3" />{task.due_time.slice(0, 5)}</span>}
          {task.priority === 'high' && !done && <span className="inline-flex items-center gap-1 text-[#a5636e] dark:text-rose"><Flag className="size-3" />Alta</span>}
          {subs.length > 0 && <span className="inline-flex items-center gap-1"><ListChecks className="size-3" />{subsDone}/{subs.length}</span>}
          {task.recurrence_freq && <Repeat className="size-3" aria-label="Recorrente" />}
          {cat && <Badge color={cat.color}>{cat.name}</Badge>}
          {task.tags.map((t) => <span key={t}>#{t}</span>)}
        </span>
      </button>
    </li>
  )
}
