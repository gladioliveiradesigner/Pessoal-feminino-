import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSource } from '@/auth/session'
import type { Meal, MealLog, MealStatus } from '@/data/types'
import { STATUS_LABEL } from '@/lib/food'

/** Registro rápido de uma refeição planejada (um por refeição e dia). */
export function useMealLog() {
  const source = useSource()
  const qc = useQueryClient()
  const key = [source.kind, 'meal_logs']

  const save = async (row: Partial<MealLog>, success?: string) => {
    const prev = qc.getQueryData<MealLog[]>(key) ?? []
    if (row.meal_id) {
      const existing = prev.find((l) => l.meal_id === row.meal_id && l.log_date === row.log_date)
      qc.setQueryData<MealLog[]>(key, existing ? prev.map((l) => (l === existing ? { ...l, ...row } : l)) : [...prev, { id: `tmp-${row.meal_id}`, time: null, notes: null, description: null, ...row } as MealLog])
    }
    try {
      if (row.meal_id) await source.upsert('meal_logs', row, 'meal_id,log_date')
      else await source.insert('meal_logs', row)
      if (success) toast.success(success)
    } catch (e) {
      qc.setQueryData(key, prev)
      toast.error(e instanceof Error ? e.message : 'Não foi possível registrar agora.')
      throw e
    } finally {
      qc.invalidateQueries({ queryKey: key })
    }
  }

  const quick = (meal: Meal, dateKey: string, status: MealStatus) =>
    save({ meal_id: meal.id, log_date: dateKey, name: meal.name, status, description: status === 'as_planned' ? meal.planned : null },
      status === 'skipped' ? `${meal.name}: anotado.` : `${meal.name}: ${STATUS_LABEL[status].toLowerCase()}. ✨`).catch(() => {})

  return { save, quick }
}
