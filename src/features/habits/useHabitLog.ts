import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSource } from '@/auth/session'
import { useTable } from '@/hooks/useData'
import { countOn, logIndex } from '@/lib/domain'
import type { Habit, HabitLog } from '@/data/types'

/** Define a contagem de um hábito em uma data (0 remove o registro). Atualização otimista. */
export function useHabitLog() {
  const source = useSource()
  const qc = useQueryClient()
  const key = [source.kind, 'habit_logs']
  const { data: logs = [] } = useTable('habit_logs')
  const idx = logIndex(logs)

  const setCount = async (habit: Habit, dateKey: string, count: number) => {
    const c = Math.max(0, Math.min(50, count))
    const prev = qc.getQueryData<HabitLog[]>(key) ?? []
    const existing = prev.find((l) => l.habit_id === habit.id && l.log_date === dateKey)
    qc.setQueryData<HabitLog[]>(key, c === 0
      ? prev.filter((l) => l !== existing)
      : existing ? prev.map((l) => (l === existing ? { ...l, count: c } : l)) : [...prev, { id: `tmp-${habit.id}-${dateKey}`, habit_id: habit.id, log_date: dateKey, count: c }])
    try {
      if (c === 0) { if (existing && !existing.id.startsWith('tmp-')) await source.remove('habit_logs', existing.id) }
      else await source.upsert('habit_logs', { habit_id: habit.id, log_date: dateKey, count: c }, 'habit_id,log_date')
      if (c === habit.target_per_day && c > (existing?.count ?? 0)) toast.success(`${habit.name}: feito! ✨`)
    } catch {
      qc.setQueryData(key, prev)
      toast.error('Não foi possível registrar agora.')
    } finally {
      qc.invalidateQueries({ queryKey: key })
    }
  }

  return { idx, count: (h: Habit, d: string) => countOn(idx, h.id, d), setCount }
}
