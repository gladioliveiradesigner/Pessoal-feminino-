import { addDays, addMinutes, addMonths, addWeeks, differenceInMinutes, parseISO, startOfDay, startOfMonth, startOfWeek, subDays } from 'date-fns'
import type { EventRow, Habit, HabitLog, Task } from '@/data/types'
import { fromDateKey, toDateKey, todayKey } from './dates'
import { addStep, occurrencesBetween } from './recurrence'

// ---------------- Tarefas ----------------
export type TaskFilter = 'today' | 'upcoming' | 'overdue' | 'nodate' | 'done' | 'all'

export const PRIORITY_LABEL = { high: 'Alta', medium: 'Média', low: 'Baixa' } as const
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const

export function filterTasks(tasks: Task[], filter: TaskFilter, today = todayKey()) {
  const top = tasks.filter((t) => !t.parent_id)
  const open = top.filter((t) => !t.completed_at)
  switch (filter) {
    case 'today': return open.filter((t) => t.due_date === today)
    case 'upcoming': return open.filter((t) => t.due_date && t.due_date > today)
    case 'overdue': return open.filter((t) => t.due_date && t.due_date < today)
    case 'nodate': return open.filter((t) => !t.due_date)
    case 'done': return top.filter((t) => t.completed_at).sort((a, b) => (b.completed_at! > a.completed_at! ? 1 : -1))
    case 'all': return open
  }
}

export function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    const da = a.due_date ?? '9999', db = b.due_date ?? '9999'
    if (da !== db) return da < db ? -1 : 1
    if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    const ta = a.due_time ?? '99', tb = b.due_time ?? '99'
    if (ta !== tb) return ta < tb ? -1 : 1
    return a.position - b.position
  })
}

export function subtasksOf(tasks: Task[], id: string) {
  return tasks.filter((t) => t.parent_id === id).sort((a, b) => a.position - b.position)
}

/** Próxima data de uma tarefa recorrente. */
export function nextDueDate(task: Task) {
  if (!task.recurrence_freq || !task.due_date) return null
  return toDateKey(addStep(fromDateKey(task.due_date), task.recurrence_freq, task.recurrence_interval || 1))
}

// ---------------- Compromissos ----------------
export interface Occurrence {
  key: string
  event: EventRow
  start: Date
  end: Date
}

export function expandEvents(events: EventRow[], from: Date, to: Date): Occurrence[] {
  const out: Occurrence[] = []
  for (const e of events) {
    const start = parseISO(e.starts_at)
    const dur = parseISO(e.ends_at).getTime() - start.getTime()
    const until = e.recurrence_until ? fromDateKey(e.recurrence_until) : null
    for (const s of occurrencesBetween(start, e.recurrence_freq, e.recurrence_interval, until, from, to, dur)) {
      out.push({ key: `${e.id}:${s.toISOString()}`, event: e, start: s, end: new Date(s.getTime() + dur) })
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime() || Number(b.event.all_day) - Number(a.event.all_day))
}

export function occurrencesOnDay(occ: Occurrence[], day: Date) {
  const s = startOfDay(day), e = addDays(s, 1)
  return occ.filter((o) => o.start < e && (o.end > s || o.start.getTime() === s.getTime()))
}

export function durationLabel(start: Date, end: Date) {
  const m = differenceInMinutes(end, start)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60), r = m % 60
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`
}

export const REMINDER_OPTIONS = [
  { value: '', label: 'Sem lembrete' },
  { value: '0', label: 'Na hora' },
  { value: '10', label: '10 minutos antes' },
  { value: '30', label: '30 minutos antes' },
  { value: '60', label: '1 hora antes' },
  { value: '1440', label: '1 dia antes' },
]

/** Lembretes cujo horário de aviso cai nas próximas `hours` horas (ou já passou e o evento não começou). */
export function upcomingReminders(occ: Occurrence[], now = new Date(), hours = 48) {
  const limit = addMinutes(now, hours * 60)
  return occ
    .filter((o) => o.event.reminder_minutes.length > 0 && o.start > now)
    .map((o) => ({ occ: o, at: addMinutes(o.start, -Math.max(...o.event.reminder_minutes)) }))
    .filter((r) => r.at <= limit)
}

// ---------------- Hábitos ----------------
export const PERIOD_LABEL = { morning: 'Manhã', afternoon: 'Tarde', evening: 'Noite', anytime: 'Ao longo do dia' } as const

export type WeekStart = 0 | 1

export function isPeriodic(h: Pick<Habit, 'frequency'>) {
  return h.frequency === 'weekly' || h.frequency === 'monthly'
}

/** Hábitos diários seguem os dias da semana; semanais e mensais podem ser feitos em qualquer dia. */
export function isScheduled(h: Habit, day: Date) {
  if (isPeriodic(h)) return true
  return h.days_of_week.includes(day.getDay())
}

/** Meta do dia: hábitos semanais/mensais contam um registro por dia. */
export function dailyTarget(h: Habit) {
  return isPeriodic(h) ? 1 : h.target_per_day
}

/** Início (inclusivo) e fim (exclusivo) da semana ou do mês que contém `day`. */
export function periodBounds(h: Pick<Habit, 'frequency'>, day: Date, weekStartsOn: WeekStart = 0): [Date, Date] {
  if (h.frequency === 'monthly') { const s = startOfMonth(day); return [s, addMonths(s, 1)] }
  const s = startOfWeek(startOfDay(day), { weekStartsOn }); return [s, addWeeks(s, 1)]
}

/** Quantos dias do período (semana/mês) têm registro. */
export function periodCount(h: Habit, idx: Map<string, number>, day = new Date(), weekStartsOn: WeekStart = 0) {
  const [s, e] = periodBounds(h, day, weekStartsOn)
  let n = 0
  for (let d = s; d < e; d = addDays(d, 1)) if (countOn(idx, h.id, toDateKey(d)) > 0) n++
  return n
}

export function periodDone(h: Habit, idx: Map<string, number>, day = new Date(), weekStartsOn: WeekStart = 0) {
  return periodCount(h, idx, day, weekStartsOn) >= h.target_per_period
}

export function frequencyLabel(h: Habit) {
  const n = h.target_per_period
  if (h.frequency === 'weekly') return n === 1 ? '1 vez por semana' : `${n} vezes por semana`
  if (h.frequency === 'monthly') return n === 1 ? '1 vez por mês' : `${n} vezes por mês`
  return h.days_of_week.length === 7 ? 'Todos os dias' : h.days_of_week.map((d) => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d]).join(', ')
}

/** Unidade da sequência: dias, semanas ou meses. */
export function streakUnit(h: Habit, n: number) {
  if (h.frequency === 'weekly') return n === 1 ? 'semana' : 'semanas'
  if (h.frequency === 'monthly') return n === 1 ? 'mês' : 'meses'
  return n === 1 ? 'dia' : 'dias'
}

export function logIndex(logs: HabitLog[]) {
  const m = new Map<string, number>()
  for (const l of logs) m.set(`${l.habit_id}:${l.log_date}`, l.count)
  return m
}

export function countOn(idx: Map<string, number>, habitId: string, dateKey: string) {
  return idx.get(`${habitId}:${dateKey}`) ?? 0
}

const createdOf = (h: Habit) => (h.created_at ? startOfDay(parseISO(h.created_at)) : null)
const prevPeriod = (h: Habit, start: Date) => (h.frequency === 'monthly' ? addMonths(start, -1) : addWeeks(start, -1))

/** Períodos (semana/mês) do atual para trás. */
function periodsBack(h: Habit, today: Date, ws: WeekStart, max: number) {
  const out: Date[] = []
  let s = periodBounds(h, today, ws)[0]
  for (let i = 0; i < max; i++) { out.push(s); s = prevPeriod(h, s) }
  return out
}

/**
 * Sequência atual. Diários: dias programados consecutivos concluídos.
 * Semanais/mensais: semanas/meses seguidos com a meta atingida.
 * O período atual só conta se já foi concluído — não "quebra" a sequência enquanto não acabou.
 */
export function currentStreak(h: Habit, idx: Map<string, number>, today = new Date(), weekStartsOn: WeekStart = 0) {
  if (isPeriodic(h)) {
    let streak = 0
    const created = createdOf(h)
    for (const [i, s] of periodsBack(h, today, weekStartsOn, 120).entries()) {
      const done = periodDone(h, idx, s, weekStartsOn)
      if (i === 0 && !done) continue
      if (!done) break
      streak++
      if (created && s <= created) break
    }
    return streak
  }
  let streak = 0
  let d = startOfDay(today)
  if (isScheduled(h, d) && countOn(idx, h.id, toDateKey(d)) < h.target_per_day) d = subDays(d, 1)
  for (let i = 0; i < 400; i++) {
    if (isScheduled(h, d)) {
      if (countOn(idx, h.id, toDateKey(d)) >= h.target_per_day) streak++
      else break
    }
    d = subDays(d, 1)
  }
  return streak
}

export function bestStreak(h: Habit, idx: Map<string, number>, days = 365, today = new Date(), weekStartsOn: WeekStart = 0) {
  if (isPeriodic(h)) {
    const n = h.frequency === 'monthly' ? Math.ceil(days / 30) : Math.ceil(days / 7)
    let best = 0, cur = 0
    for (const s of periodsBack(h, today, weekStartsOn, n).reverse()) {
      if (periodDone(h, idx, s, weekStartsOn)) { cur++; best = Math.max(best, cur) } else if (s.getTime() !== periodBounds(h, today, weekStartsOn)[0].getTime()) cur = 0
    }
    return best
  }
  let best = 0, cur = 0
  const created = h.created_at ? startOfDay(parseISO(h.created_at)) : subDays(today, days)
  for (let i = days; i >= 0; i--) {
    const d = subDays(startOfDay(today), i)
    if (!isScheduled(h, d)) continue
    if (countOn(idx, h.id, toDateKey(d)) >= h.target_per_day) { cur++; best = Math.max(best, cur) }
    else if (d >= created && i > 0) cur = 0
  }
  return best
}

/** Janela usada no percentual: 30 dias, 8 semanas ou 6 meses. */
export function rateWindowLabel(h: Habit) {
  return h.frequency === 'weekly' ? '8 semanas' : h.frequency === 'monthly' ? '6 meses' : '30 dias'
}

/** Percentual de conclusão na janela (excluindo o dia/período atual se ainda pendente). */
export function completionRate(h: Habit, idx: Map<string, number>, days = 30, today = new Date(), weekStartsOn: WeekStart = 0) {
  if (isPeriodic(h)) {
    const created = createdOf(h)
    let total = 0, done = 0
    for (const [i, s] of periodsBack(h, today, weekStartsOn, h.frequency === 'monthly' ? 6 : 8).entries()) {
      const end = periodBounds(h, s, weekStartsOn)[1]
      if (created && end <= created) continue
      const ok = periodDone(h, idx, s, weekStartsOn)
      if (i === 0 && !ok) continue
      total++
      if (ok) done++
    }
    return total ? Math.round((done / total) * 100) : 0
  }
  let scheduled = 0, done = 0
  const created = createdOf(h)
  for (let i = 0; i < days; i++) {
    const d = subDays(startOfDay(today), i)
    if (!isScheduled(h, d) || (created && d < created)) continue
    const ok = countOn(idx, h.id, toDateKey(d)) >= h.target_per_day
    if (i === 0 && !ok) continue
    scheduled++
    if (ok) done++
  }
  return scheduled ? Math.round((done / scheduled) * 100) : 0
}

/** Mensagens gentis, nunca de culpa. */
export function encouragement(rate: number, streak: number, unit: 'dias' | 'semanas' | 'meses' = 'dias') {
  const strong = unit === 'dias' ? 7 : unit === 'semanas' ? 4 : 3
  const seg = unit === 'semanas' ? 'seguidas' : 'seguidos'
  if (streak >= strong) return `${streak} ${unit} ${seg}. Que constância bonita!`
  if (streak >= 2) return `${streak} ${unit} ${seg}. Continue no seu ritmo.`
  if (rate >= 60) return 'Você tem cuidado bem desse hábito.'
  if (rate > 0) return 'Cada dia conta. Recomeçar também é progresso.'
  return 'Um pequeno passo hoje já é um começo.'
}
