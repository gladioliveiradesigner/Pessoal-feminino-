import { addDays, setHours, setMinutes, startOfDay } from 'date-fns'
import { toDateKey } from '@/lib/dates'
import { uid } from '@/lib/utils'
import { DEFAULT_WIDGETS, type DataSource, type Profile, type TableName, type Tables } from './types'

/**
 * Fonte de dados de DEMONSTRAÇÃO.
 * Os dados são fictícios, ficam só na memória desta aba e somem ao recarregar.
 * Nunca são enviados ao servidor nem tratados como dados reais da usuária.
 */

const DEFAULTS: { [K in TableName]: Partial<Tables[K]> } = {
  categories: { color: 'rose', position: 0 },
  events: { description: null, location: null, all_day: false, category_id: null, recurrence_freq: null, recurrence_interval: 1, recurrence_until: null, reminder_minutes: [] },
  tasks: { parent_id: null, notes: null, priority: 'medium', due_date: null, due_time: null, category_id: null, tags: [], recurrence_freq: null, recurrence_interval: 1, completed_at: null, position: 0 },
  habits: { icon: 'sparkles', color: 'sage', days_of_week: [0, 1, 2, 3, 4, 5, 6], target_per_day: 1, unit: null, period: 'anytime', archived_at: null, position: 0 },
  habit_logs: { count: 1 },
  mood_entries: { energy: null, note: null },
}

function seed() {
  const now = new Date()
  const today = startOfDay(now)
  const at = (dayOffset: number, h: number, m = 0) => setMinutes(setHours(addDays(today, dayOffset), h), m).toISOString()
  const cats = ['Pessoal:rose', 'Trabalho:lavender', 'Casa:sage', 'Estudos:sky', 'Saúde:mint', 'Compras:sand'].map((s, i) => {
    const [name, color] = s.split(':')
    return { id: uid(), name, color, position: i }
  })
  const c = (n: string) => cats.find((x) => x.name === n)!.id
  const ev = (title: string, start: string, end: string, cat: string, extra: Partial<Tables['events']> = {}) =>
    ({ ...DEFAULTS.events, id: uid(), title, starts_at: start, ends_at: end, category_id: c(cat), ...extra }) as Tables['events']
  const events = [
    ev('Reunião de planejamento', at(0, 10), at(0, 11), 'Trabalho', { location: 'Online' }),
    ev('Pilates', at(0, 18, 30), at(0, 19, 30), 'Saúde', { recurrence_freq: 'weekly', location: 'Studio Equilíbrio' }),
    ev('Almoço com a Carol', at(1, 12, 30), at(1, 14), 'Pessoal', { location: 'Café Jardim' }),
    ev('Consulta odontológica', at(3, 9), at(3, 10), 'Saúde', { reminder_minutes: [60] }),
    ev('Aula de inglês', at(-1, 19), at(-1, 20), 'Estudos', { recurrence_freq: 'weekly' }),
  ]
  const tk = (title: string, due: number | null, cat: string, extra: Partial<Tables['tasks']> = {}) =>
    ({ ...DEFAULTS.tasks, id: uid(), title, due_date: due === null ? null : toDateKey(addDays(today, due)), category_id: c(cat), ...extra }) as Tables['tasks']
  const relatorio = tk('Enviar relatório mensal', 0, 'Trabalho', { priority: 'high', due_time: '17:00' })
  const tasks = [
    relatorio,
    tk('Revisar números', null, 'Trabalho', { parent_id: relatorio.id, position: 0 }),
    tk('Escrever resumo', null, 'Trabalho', { parent_id: relatorio.id, position: 1, completed_at: now.toISOString() }),
    tk('Comprar presente de aniversário', 1, 'Compras', { tags: ['presente'] }),
    tk('Regar as plantas', 0, 'Casa', { recurrence_freq: 'weekly', priority: 'low' }),
    tk('Agendar exame de rotina', -2, 'Saúde', { priority: 'medium' }),
    tk('Ler capítulo 4', 2, 'Estudos'),
    tk('Pagar conta de luz', -5, 'Casa', { completed_at: addDays(now, -5).toISOString() }),
  ]
  const hb = (name: string, icon: string, color: string, period: Tables['habits']['period'], extra: Partial<Tables['habits']> = {}) =>
    ({ ...DEFAULTS.habits, id: uid(), name, icon, color, period, ...extra }) as Tables['habits']
  const habits = [
    hb('Beber água', 'glass-water', 'sky', 'anytime', { target_per_day: 8, unit: 'copos' }),
    hb('Alongamento', 'person-standing', 'sage', 'morning'),
    hb('Ler 20 minutos', 'book-open', 'lavender', 'evening'),
    hb('Cuidar da pele', 'sparkles', 'rose', 'evening'),
    hb('Caminhada', 'footprints', 'mint', 'afternoon', { days_of_week: [1, 3, 5] }),
  ]
  const habit_logs: Tables['habit_logs'][] = []
  for (let d = 1; d <= 20; d++) {
    habits.forEach((h, i) => {
      if ((d + i) % 4 !== 0 && h.days_of_week.includes(addDays(today, -d).getDay()))
        habit_logs.push({ id: uid(), habit_id: h.id, log_date: toDateKey(addDays(today, -d)), count: h.target_per_day })
    })
  }
  habit_logs.push({ id: uid(), habit_id: habits[0].id, log_date: toDateKey(today), count: 3 })
  return { categories: cats, events, tasks, habits, habit_logs, mood_entries: [] as Tables['mood_entries'][] }
}

export function createDemoSource(): DataSource {
  const db: { [K in TableName]: Tables[K][] } = seed() as never
  let profile: Profile = {
    id: 'demo',
    display_name: 'Ana',
    goals: ['Ter mais tempo para mim', 'Organizar a rotina'],
    areas: ['agenda', 'tasks', 'habits'],
    theme: 'system',
    accent: 'rose',
    enabled_modules: ['agenda', 'tasks', 'habits'],
    dashboard_widgets: DEFAULT_WIDGETS,
    week_starts_on: 0,
    onboarded_at: new Date().toISOString(),
  }
  const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 80))
  const stamp = () => new Date().toISOString()

  return {
    kind: 'demo',
    list: (table) => delay(db[table] as never),
    async insert(table, row) {
      const full = { ...DEFAULTS[table], ...row, id: uid(), created_at: stamp(), updated_at: stamp() }
      ;(db[table] as unknown[]).push(full)
      return delay(full as never)
    },
    async update(table, id, patch) {
      const rows = db[table] as { id: string }[]
      const i = rows.findIndex((r) => r.id === id)
      if (i < 0) throw new Error('Registro não encontrado.')
      rows[i] = { ...rows[i], ...patch, updated_at: stamp() }
      return delay(rows[i] as never)
    },
    async remove(table, id) {
      const rows = db[table] as { id: string; parent_id?: string | null; habit_id?: string }[]
      // replica o "on delete cascade" do banco
      const doomed = new Set([id])
      if (table === 'tasks') rows.forEach((r) => r.parent_id === id && doomed.add(r.id))
      ;(db as Record<string, unknown[]>)[table] = rows.filter((r) => !doomed.has(r.id))
      if (table === 'habits') db.habit_logs = db.habit_logs.filter((l) => l.habit_id !== id)
      return delay(undefined)
    },
    async upsert(table, row, onConflict) {
      const keys = onConflict.split(',').map((k) => k.trim()).filter((k) => k !== 'user_id')
      const rows = db[table] as unknown as Record<string, unknown>[]
      const existing = rows.find((r) => keys.every((k) => r[k] === (row as Record<string, unknown>)[k]))
      if (existing) return this.update(table, existing.id as string, row)
      return this.insert(table, row)
    },
    getProfile: () => delay(profile),
    async updateProfile(patch) {
      profile = { ...profile, ...patch }
      return delay(profile)
    },
    async exportAll() {
      return { aviso: 'Dados de demonstração (fictícios)', profile, ...db }
    },
    async deleteAccount() {
      throw new Error('No modo demonstração não há conta para excluir.')
    },
  }
}
