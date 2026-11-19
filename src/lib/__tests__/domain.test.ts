import { describe, expect, it } from 'vitest'
import { occurrencesBetween } from '../recurrence'
import { currentStreak, completionRate, filterTasks, logIndex, nextDueDate } from '../domain'
import type { Habit, Task } from '@/data/types'

const d = (s: string) => new Date(`${s}T00:00`)

describe('recorrência', () => {
  it('evento semanal aparece em cada semana do intervalo', () => {
    const start = new Date('2026-11-04T18:30')
    const occ = occurrencesBetween(start, 'weekly', 1, null, d('2026-11-01'), d('2026-12-01'), 3600_000)
    expect(occ.map((o) => o.getDate())).toEqual([4, 11, 18, 25])
  })
  it('respeita "repetir até"', () => {
    const occ = occurrencesBetween(new Date('2026-11-01T09:00'), 'daily', 2, d('2026-11-07'), d('2026-11-01'), d('2026-12-01'))
    expect(occ.map((o) => o.getDate())).toEqual([1, 3, 5, 7])
  })
  it('evento único fora do intervalo não aparece', () => {
    expect(occurrencesBetween(new Date('2026-10-01T09:00'), null, 1, null, d('2026-11-01'), d('2026-12-01'))).toEqual([])
  })
})

describe('tarefas', () => {
  const base: Task = { id: '1', parent_id: null, title: 'x', notes: null, priority: 'medium', due_date: '2026-11-18', due_time: null, category_id: null, tags: [], recurrence_freq: null, recurrence_interval: 1, completed_at: null, position: 0 }
  it('filtra hoje, atrasadas e próximas sem incluir subtarefas', () => {
    const tasks = [base, { ...base, id: '2', due_date: '2026-11-10' }, { ...base, id: '3', due_date: '2026-11-20' }, { ...base, id: '4', parent_id: '1' }]
    expect(filterTasks(tasks, 'today', '2026-11-18').map((t) => t.id)).toEqual(['1'])
    expect(filterTasks(tasks, 'overdue', '2026-11-18').map((t) => t.id)).toEqual(['2'])
    expect(filterTasks(tasks, 'upcoming', '2026-11-18').map((t) => t.id)).toEqual(['3'])
  })
  it('calcula a próxima data de tarefa mensal', () => {
    expect(nextDueDate({ ...base, recurrence_freq: 'monthly' })).toBe('2026-12-18')
  })
})

describe('hábitos', () => {
  const h: Habit = { id: 'h', name: 'Água', icon: 'x', color: 'sky', days_of_week: [0, 1, 2, 3, 4, 5, 6], target_per_day: 1, unit: null, period: 'anytime', archived_at: null, position: 0, created_at: '2026-11-01T00:00:00Z' }
  const logs = (days: string[]) => logIndex(days.map((k, i) => ({ id: String(i), habit_id: 'h', log_date: k, count: 1 })))
  it('não quebra a sequência enquanto o dia de hoje não terminou', () => {
    expect(currentStreak(h, logs(['2026-11-16', '2026-11-17']), new Date('2026-11-18T10:00'))).toBe(2)
  })
  it('conta hoje quando concluído', () => {
    expect(currentStreak(h, logs(['2026-11-17', '2026-11-18']), new Date('2026-11-18T10:00'))).toBe(2)
  })
  it('ignora dias não programados', () => {
    const weekdays = { ...h, days_of_week: [1, 3, 5] } // seg, qua, sex
    expect(currentStreak(weekdays, logs(['2026-11-13', '2026-11-16']), new Date('2026-11-17T10:00'))).toBe(2)
  })
  it('percentual de 30 dias', () => {
    expect(completionRate(h, logs(['2026-11-17']), 3, new Date('2026-11-18T10:00'))).toBe(50)
  })
})
