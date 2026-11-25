import { describe, expect, it } from 'vitest'
import { applyLoadsToPlan, exerciseHistory, parseDecimal, sessionFromPlan, trackedExercises } from '../workout'
import { dayTimeline, daySummary, nextMeal } from '../food'
import type { Meal, MealLog, WorkoutPlan, WorkoutSession } from '@/data/types'

const plan: WorkoutPlan = {
  id: 'p', name: 'Treino A', color: 'rose', days_of_week: [1], notes: null, archived_at: null, position: 0,
  exercises: [{ id: 'e1', name: 'Agachamento', sets: 4, reps: '10', weight_kg: 20, rest_seconds: null, notes: null }],
}
const sess = (d: string, w: number | null, done = true): WorkoutSession => ({
  id: d, plan_id: 'p', name: 'Treino A', performed_on: d, duration_min: null, effort: null, notes: null,
  entries: [{ exercise_id: 'e1', name: 'Agachamento', sets: 4, reps: '10', weight_kg: w, done }],
})

describe('treinos', () => {
  it('aceita vírgula na carga', () => {
    expect(parseDecimal('12,5')).toBe(12.5)
    expect(parseDecimal('')).toBeNull()
  })
  it('monta o treino a partir da ficha e atualiza as cargas', () => {
    const s = sessionFromPlan(plan, '2026-11-23')
    expect(s.entries?.[0]).toMatchObject({ exercise_id: 'e1', weight_kg: 20, done: false })
    const updated = applyLoadsToPlan(plan, [{ ...s.entries![0], weight_kg: 22.5, done: true }])
    expect(updated[0].weight_kg).toBe(22.5)
    expect(applyLoadsToPlan(plan, [{ ...s.entries![0], weight_kg: 30, done: false }])[0].weight_kg).toBe(20)
  })
  it('evolução ignora exercícios não feitos e ordena por data', () => {
    const list = [sess('2026-11-16', 25), sess('2026-11-09', 20), sess('2026-11-12', 40, false)]
    expect(exerciseHistory(list, 'agachamento ').map((x) => x.weight)).toEqual([20, 25])
    expect(trackedExercises(list)).toEqual(['Agachamento'])
  })
})

describe('alimentação', () => {
  const meals: Meal[] = [
    { id: 'a', name: 'Almoço', time: '12:30', planned: 'Arroz e feijão', days_of_week: [0, 1, 2, 3, 4, 5, 6], position: 1 },
    { id: 'c', name: 'Café', time: '07:30', planned: null, days_of_week: [0, 1, 2, 3, 4, 5, 6], position: 0 },
    { id: 's', name: 'Brunch', time: '10:00', planned: null, days_of_week: [0], position: 2 },
  ]
  const logs: MealLog[] = [
    { id: '1', log_date: '2026-11-25', meal_id: 'c', name: 'Café', status: 'as_planned', description: null, time: null, notes: null },
    { id: '2', log_date: '2026-11-25', meal_id: null, name: 'Bolo', status: 'different', description: null, time: '15:00', notes: null },
  ]
  const day = new Date('2026-11-25T11:00') // quarta
  it('ordena por horário e só mostra refeições do dia da semana', () => {
    const t = dayTimeline(meals, logs, day, '2026-11-25')
    expect(t.planned.map((p) => p.meal.id)).toEqual(['c', 'a'])
    expect(t.extras.map((l) => l.name)).toEqual(['Bolo'])
    expect(nextMeal(t, day)?.meal.id).toBe('a')
  })
  it('resume o dia', () => {
    expect(daySummary(meals, logs, day, '2026-11-25')).toEqual({ planned: 2, logged: 1, asPlanned: 1, extras: 1 })
  })
})
