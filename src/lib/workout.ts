import { addDays, startOfDay, startOfWeek } from 'date-fns'
import type { WorkoutEntry, WorkoutExercise, WorkoutPlan, WorkoutSession } from '@/data/types'
import { fromDateKey, toDateKey } from './dates'
import { uid } from './utils'

/** "12,5" ou "12.5" → 12.5; vazio → null. */
export function parseDecimal(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim().replace(',', '.')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function formatKg(n: number | null | undefined) {
  if (n === null || n === undefined) return ''
  return `${String(Math.round(n * 100) / 100).replace('.', ',')} kg`
}

/** "3 × 12 · 20 kg" */
export function exerciseSummary(e: Pick<WorkoutExercise, 'sets' | 'reps' | 'weight_kg'>) {
  const base = `${e.sets} × ${e.reps || '—'}`
  return e.weight_kg !== null && e.weight_kg !== undefined ? `${base} · ${formatKg(e.weight_kg)}` : base
}

export function newExercise(partial: Partial<WorkoutExercise> = {}): WorkoutExercise {
  return { id: uid(), name: '', sets: 3, reps: '12', weight_kg: null, rest_seconds: null, notes: null, ...partial }
}

export function activePlans(plans: WorkoutPlan[]) {
  return plans.filter((p) => !p.archived_at).sort((a, b) => a.position - b.position)
}

export function plansForDay(plans: WorkoutPlan[], day: Date) {
  return activePlans(plans).filter((p) => p.days_of_week.includes(day.getDay()))
}

export function sessionsOn(sessions: WorkoutSession[], dateKey: string) {
  return sessions.filter((s) => s.performed_on === dateKey)
}

/** Dias da semana atual (7 datas) e se houve treino em cada um. */
export function weekActivity(sessions: WorkoutSession[], today = new Date(), weekStartsOn: 0 | 1 = 0) {
  const start = startOfWeek(startOfDay(today), { weekStartsOn })
  const done = new Set(sessions.map((s) => s.performed_on))
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i)
    return { date: d, key: toDateKey(d), trained: done.has(toDateKey(d)) }
  })
}

/** Monta um treino a partir da ficha (cargas da ficha como ponto de partida). */
export function sessionFromPlan(plan: WorkoutPlan, dateKey: string): Partial<WorkoutSession> {
  return {
    plan_id: plan.id, name: plan.name, performed_on: dateKey, duration_min: null, effort: null, notes: null,
    entries: plan.exercises.map((e) => ({ exercise_id: e.id, name: e.name, sets: e.sets, reps: e.reps, weight_kg: e.weight_kg, done: false })),
  }
}

/** Atualiza as cargas/repetições da ficha com o que foi feito no treino. */
export function applyLoadsToPlan(plan: WorkoutPlan, entries: WorkoutEntry[]): WorkoutExercise[] {
  return plan.exercises.map((ex) => {
    const e = entries.find((x) => x.exercise_id === ex.id && x.done)
    return e ? { ...ex, weight_kg: e.weight_kg ?? ex.weight_kg, reps: e.reps || ex.reps, sets: e.sets || ex.sets } : ex
  })
}

const norm = (s: string) => s.trim().toLocaleLowerCase('pt-BR')

/** Nomes de exercícios com carga registrada, do mais frequente ao menos. */
export function trackedExercises(sessions: WorkoutSession[]) {
  const m = new Map<string, { name: string; n: number }>()
  for (const s of sessions) for (const e of s.entries) {
    if (!e.done || e.weight_kg === null || !e.name.trim()) continue
    const k = norm(e.name)
    const cur = m.get(k)
    m.set(k, { name: cur?.name ?? e.name.trim(), n: (cur?.n ?? 0) + 1 })
  }
  return [...m.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).map((x) => x.name)
}

/** Maior carga por dia para um exercício (para o gráfico de evolução). */
export function exerciseHistory(sessions: WorkoutSession[], name: string) {
  const k = norm(name)
  const byDay = new Map<string, number>()
  for (const s of sessions) for (const e of s.entries) {
    if (!e.done || e.weight_kg === null || norm(e.name) !== k) continue
    byDay.set(s.performed_on, Math.max(byDay.get(s.performed_on) ?? 0, e.weight_kg))
  }
  return [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, weight]) => ({ date, day: fromDateKey(date), weight }))
}

export const EFFORT_LABEL = ['', 'Bem leve', 'Leve', 'Na medida', 'Puxado', 'Muito puxado'] as const

export const PLAN_TEMPLATES: { name: string; color: string; exercises: Partial<WorkoutExercise>[] }[] = [
  { name: 'Treino A · Inferiores', color: 'rose', exercises: [
    { name: 'Agachamento livre', sets: 4, reps: '10' }, { name: 'Leg press', sets: 3, reps: '12' },
    { name: 'Cadeira extensora', sets: 3, reps: '12' }, { name: 'Mesa flexora', sets: 3, reps: '12' },
    { name: 'Elevação pélvica', sets: 4, reps: '10' }, { name: 'Panturrilha em pé', sets: 3, reps: '15' },
  ] },
  { name: 'Treino B · Superiores', color: 'lavender', exercises: [
    { name: 'Puxada frontal', sets: 3, reps: '12' }, { name: 'Remada baixa', sets: 3, reps: '12' },
    { name: 'Supino com halteres', sets: 3, reps: '10' }, { name: 'Desenvolvimento', sets: 3, reps: '10' },
    { name: 'Rosca direta', sets: 3, reps: '12' }, { name: 'Tríceps na polia', sets: 3, reps: '12' },
  ] },
  { name: 'Treino C · Glúteos e core', color: 'sage', exercises: [
    { name: 'Stiff', sets: 3, reps: '10' }, { name: 'Abdução na máquina', sets: 3, reps: '15' },
    { name: 'Afundo', sets: 3, reps: '10 cada perna' }, { name: 'Prancha', sets: 3, reps: '40 s' },
  ] },
]
