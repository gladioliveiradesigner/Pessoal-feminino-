import type { Meal, MealLog, MealStatus } from '@/data/types'

export function mealsForDay(meals: Meal[], day: Date) {
  return meals.filter((m) => m.days_of_week.includes(day.getDay())).sort(byTime)
}

export function byTime(a: { time: string | null; position?: number }, b: { time: string | null; position?: number }) {
  const ta = a.time ?? '99', tb = b.time ?? '99'
  if (ta !== tb) return ta < tb ? -1 : 1
  return (a.position ?? 0) - (b.position ?? 0)
}

export function logsOn(logs: MealLog[], dateKey: string) {
  return logs.filter((l) => l.log_date === dateKey)
}

/** Refeição planejada + registro do dia (se houver). Registros avulsos ficam em `extras`. */
export function dayTimeline(meals: Meal[], logs: MealLog[], day: Date, dateKey: string) {
  const dayLogs = logsOn(logs, dateKey)
  const planned = mealsForDay(meals, day).map((meal) => ({ meal, log: dayLogs.find((l) => l.meal_id === meal.id) ?? null }))
  const extras = dayLogs.filter((l) => !l.meal_id || !planned.some((p) => p.meal.id === l.meal_id)).sort(byTime)
  return { planned, extras }
}

/** Próxima refeição planejada ainda sem registro (pela hora). */
export function nextMeal(timeline: ReturnType<typeof dayTimeline>, now = new Date()) {
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const open = timeline.planned.filter((p) => !p.log)
  return open.find((p) => (p.meal.time ?? '99') >= hm) ?? open[0] ?? null
}

export function daySummary(meals: Meal[], logs: MealLog[], day: Date, dateKey: string) {
  const t = dayTimeline(meals, logs, day, dateKey)
  const logged = t.planned.filter((p) => p.log && p.log.status !== 'skipped').length
  const asPlanned = t.planned.filter((p) => p.log?.status === 'as_planned').length
  return { planned: t.planned.length, logged, asPlanned, extras: t.extras.length }
}

export const STATUS_LABEL: Record<MealStatus, string> = {
  as_planned: 'Como planejei', different: 'Comi outra coisa', skipped: 'Pulei',
}

export const MEAL_TEMPLATE: Partial<Meal>[] = [
  { name: 'Café da manhã', time: '07:30', position: 0 },
  { name: 'Lanche da manhã', time: '10:00', position: 1 },
  { name: 'Almoço', time: '12:30', position: 2 },
  { name: 'Lanche da tarde', time: '16:00', position: 3 },
  { name: 'Jantar', time: '19:30', position: 4 },
]
