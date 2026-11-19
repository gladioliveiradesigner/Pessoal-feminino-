import { addDays, addMinutes, differenceInMinutes, parseISO, startOfDay, subDays } from 'date-fns'
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

export function isScheduled(h: Habit, day: Date) {
  return h.days_of_week.includes(day.getDay())
}

export function logIndex(logs: HabitLog[]) {
  const m = new Map<string, number>()
  for (const l of logs) m.set(`${l.habit_id}:${l.log_date}`, l.count)
  return m
}

export function countOn(idx: Map<string, number>, habitId: string, dateKey: string) {
  return idx.get(`${habitId}:${dateKey}`) ?? 0
}

/**
 * Sequência atual: dias programados consecutivos concluídos.
 * Hoje só conta se já foi concluído — não "quebra" a sequência enquanto o dia não acabou.
 */
export function currentStreak(h: Habit, idx: Map<string, number>, today = new Date()) {
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

export function bestStreak(h: Habit, idx: Map<string, number>, days = 365, today = new Date()) {
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

/** Percentual de conclusão nos últimos `days` dias programados (excluindo hoje se ainda pendente). */
export function completionRate(h: Habit, idx: Map<string, number>, days = 30, today = new Date()) {
  let scheduled = 0, done = 0
  const created = h.created_at ? startOfDay(parseISO(h.created_at)) : null
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
export function encouragement(rate: number, streak: number) {
  if (streak >= 7) return `${streak} dias seguidos. Que constância bonita!`
  if (streak >= 2) return `${streak} dias seguidos. Continue no seu ritmo.`
  if (rate >= 60) return 'Você tem cuidado bem desse hábito.'
  if (rate > 0) return 'Cada dia conta. Recomeçar também é progresso.'
  return 'Um pequeno passo hoje já é um começo.'
}
