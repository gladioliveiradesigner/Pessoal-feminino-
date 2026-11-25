import { Check, Minus, Plus } from 'lucide-react'
import { habitIcon } from '@/lib/habitIcons'
import { colorOf } from '@/lib/colors'
import { fromDateKey, todayKey } from '@/lib/dates'
import { isPeriodic, periodCount } from '@/lib/domain'
import { cn } from '@/lib/utils'
import type { Habit } from '@/data/types'
import { useHabitLog } from './useHabitLog'

export function HabitRow({ habit, dateKey = todayKey(), onOpen, extra }: { habit: Habit; dateKey?: string; onOpen?: () => void; extra?: React.ReactNode }) {
  const { count, setCount, idx, ws } = useHabitLog()
  const c = count(habit, dateKey)
  const periodic = isPeriodic(habit)
  const target = periodic ? 1 : habit.target_per_day
  const done = c >= target
  const Icon = habitIcon(habit.icon)
  const color = colorOf(habit.color)
  const multi = !periodic && habit.target_per_day > 1
  const pct = Math.min(100, (c / target) * 100)
  const pc = periodic ? periodCount(habit, idx, fromDateKey(dateKey), ws) : 0
  const periodPct = periodic ? Math.min(100, (pc / habit.target_per_period) * 100) : 0
  const periodWord = habit.frequency === 'weekly' ? 'nesta semana' : 'neste mês'

  return (
    <div className="flex items-center gap-3 rounded-2xl p-2">
      <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, ${color.hex} 22%, transparent)` }}>
        <Icon className="size-5" style={{ color: color.hex }} strokeWidth={2} />
      </span>
      <button className="min-w-0 flex-1 text-left" onClick={onOpen} disabled={!onOpen}>
        <span className={cn('block truncate text-[15px] font-medium', (periodic ? pc >= habit.target_per_period : done) && 'text-muted-foreground')}>{habit.name}</span>
        {periodic ? (
          <span className="mt-1 flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full transition-all" style={{ width: `${periodPct}%`, background: color.hex }} /></span>
            <span className="text-xs text-muted-foreground tabular-nums">{pc}/{habit.target_per_period} {periodWord}</span>
          </span>
        ) : multi ? (
          <span className="mt-1 flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color.hex }} /></span>
            <span className="text-xs text-muted-foreground tabular-nums">{c}/{habit.target_per_day}{habit.unit ? ` ${habit.unit}` : ''}</span>
          </span>
        ) : extra}
      </button>
      {multi && (
        <button onClick={() => setCount(habit, dateKey, c - 1)} disabled={c === 0} aria-label={`Diminuir ${habit.name}`}
          className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-30"><Minus className="size-4" /></button>
      )}
      <button onClick={() => setCount(habit, dateKey, multi ? (done ? c : c + 1) : done ? 0 : 1)}
        aria-label={multi ? `Registrar mais um: ${habit.name}` : done ? `Desmarcar ${habit.name}` : periodic ? `Fiz hoje: ${habit.name}` : `Concluir ${habit.name}`}
        aria-pressed={done}
        title={periodic ? (done ? 'Feito hoje (toque para desfazer)' : 'Marcar como feito hoje') : undefined}
        className={cn('grid size-10 shrink-0 place-items-center rounded-full border-2 transition', done ? 'animate-pop text-white' : 'border-input hover:border-primary')}
        style={done ? { background: color.hex, borderColor: color.hex } : undefined}>
        {done ? <Check className="size-5" strokeWidth={3} /> : multi ? <Plus className="size-4" /> : null}
      </button>
    </div>
  )
}

export function HabitToday({ habits, compact }: { habits: Habit[]; compact?: boolean }) {
  return <div className={cn('-mx-2', compact ? 'space-y-0' : 'space-y-1')}>{habits.map((h) => <HabitRow key={h.id} habit={h} />)}</div>
}
