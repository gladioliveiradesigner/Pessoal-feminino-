import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSource } from '@/auth/session'
import { useProfile, useTable } from '@/hooks/useData'
import { countOn, dailyTarget, isPeriodic, logIndex, periodCount, type WeekStart } from '@/lib/domain'
import { fromDateKey } from '@/lib/dates'
import type { Habit, HabitLog } from '@/data/types'

/** Define a contagem de um hábito em uma data (0 remove o registro). Atualização otimista. */
export function useHabitLog() {
  const source = useSource()
  const qc = useQueryClient()
  const key = [source.kind, 'habit_logs']
  const { data: logs = [] } = useTable('habit_logs')
  const { data: profile } = useProfile()
  const ws = (profile?.week_starts_on ?? 0) as WeekStart
  const idx = logIndex(logs)

  const setCount = async (habit: Habit, dateKey: string, count: number) => {
    const c = Math.max(0, Math.min(50, count))
    const prev = qc.getQueryData<HabitLog[]>(key) ?? []
    const existing = prev.find((l) => l.habit_id === habit.id && l.log_date === dateKey)
    const next = c === 0
      ? prev.filter((l) => l !== existing)
      : existing ? prev.map((l) => (l === existing ? { ...l, count: c } : l)) : [...prev, { id: `tmp-${habit.id}-${dateKey}`, habit_id: habit.id, log_date: dateKey, count: c }]
    qc.setQueryData<HabitLog[]>(key, next)
    try {
      if (c === 0) { if (existing && !existing.id.startsWith('tmp-')) await source.remove('habit_logs', existing.id) }
      else await source.upsert('habit_logs', { habit_id: habit.id, log_date: dateKey, count: c }, 'habit_id,log_date')
      if (isPeriodic(habit)) {
        if (c > 0 && !existing) {
          const day = fromDateKey(dateKey)
          const n = periodCount(habit, logIndex(next), day, ws)
          const when = habit.frequency === 'weekly' ? 'da semana' : 'do mês'
          if (n === habit.target_per_period) toast.success(`${habit.name}: meta ${when} cumprida! ✨`)
          else if (n < habit.target_per_period) toast.success(`${habit.name}: ${n} de ${habit.target_per_period} ${when}.`)
        }
      } else if (c === dailyTarget(habit) && c > (existing?.count ?? 0)) toast.success(`${habit.name}: feito! ✨`)
    } catch {
      qc.setQueryData(key, prev)
      toast.error('Não foi possível registrar agora.')
    } finally {
      qc.invalidateQueries({ queryKey: key })
    }
  }

  return { idx, ws, count: (h: Habit, d: string) => countOn(idx, h.id, d), setCount }
}
