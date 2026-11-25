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
  habits: { frequency: 'daily', target_per_period: 1, icon: 'sparkles', color: 'sage', days_of_week: [0, 1, 2, 3, 4, 5, 6], target_per_day: 1, unit: null, period: 'anytime', archived_at: null, position: 0 },
  habit_logs: { count: 1 },
  mood_entries: { energy: null, note: null },
  payment_methods: { kind: 'other', archived_at: null, position: 0 },
  finance_categories: { color: 'graphite', position: 0 },
  transactions: { status: 'paid', paid_at: null, category_id: null, payment_method_id: null, recurring_id: null, notes: null, source: 'manual' },
  recurring_transactions: { category_id: null, payment_method_id: null, freq: 'monthly', interval_count: 1, end_date: null, active: true },
  budgets: { category_id: null },
  savings_goals: { saved_cents: 0, deadline: null, color: 'sage', achieved_at: null },
  workout_plans: { color: 'rose', days_of_week: [], notes: null, exercises: [], archived_at: null, position: 0 },
  workout_sessions: { plan_id: null, duration_min: null, effort: null, notes: null, entries: [] },
  meals: { time: null, planned: null, days_of_week: [0, 1, 2, 3, 4, 5, 6], position: 0 },
  meal_logs: { meal_id: null, status: 'different', description: null, time: null, notes: null },
}

function seedWorkout(today: Date) {
  const ex = (name: string, sets: number, reps: string, weight_kg: number | null) => ({ id: uid(), name, sets, reps, weight_kg, rest_seconds: null, notes: null })
  const a: Tables['workout_plans'] = { ...(DEFAULTS.workout_plans as Tables['workout_plans']), id: uid(), name: 'Treino A · Inferiores', color: 'rose', days_of_week: [1, 4], position: 0,
    exercises: [ex('Agachamento livre', 4, '10', 30), ex('Leg press', 3, '12', 90), ex('Cadeira extensora', 3, '12', 35), ex('Elevação pélvica', 4, '10', 50)] }
  const b: Tables['workout_plans'] = { ...(DEFAULTS.workout_plans as Tables['workout_plans']), id: uid(), name: 'Treino B · Superiores', color: 'lavender', days_of_week: [2, 5], position: 1,
    exercises: [ex('Puxada frontal', 3, '12', 35), ex('Remada baixa', 3, '12', 30), ex('Desenvolvimento', 3, '10', 8), ex('Tríceps na polia', 3, '12', 15)] }
  const workout_sessions: Tables['workout_sessions'][] = []
  // seis semanas de histórico com progressão de carga
  for (let w = 6; w >= 1; w--) {
    for (const plan of [a, b]) {
      for (const dow of plan.days_of_week) {
        const d = addDays(today, -w * 7 + (dow - today.getDay()))
        if (d >= today) continue
        const bump = (6 - w) * (plan === a ? 2.5 : 1)
        workout_sessions.push({ ...(DEFAULTS.workout_sessions as Tables['workout_sessions']), id: uid(), plan_id: plan.id, name: plan.name, performed_on: toDateKey(d), duration_min: 50 + (w % 3) * 5, effort: 3 + (w % 2),
          entries: plan.exercises.map((e) => ({ exercise_id: e.id, name: e.name, sets: e.sets, reps: e.reps, weight_kg: e.weight_kg === null ? null : Math.max(2, e.weight_kg - 15 + bump), done: true })) })
      }
    }
  }
  workout_sessions.push({ ...(DEFAULTS.workout_sessions as Tables['workout_sessions']), id: uid(), name: 'Caminhada no parque', performed_on: toDateKey(addDays(today, -2)), duration_min: 40, effort: 2 })
  return { workout_plans: [a, b], workout_sessions }
}

function seedFood(today: Date) {
  const m = (name: string, time: string, planned: string, position: number) => ({ ...(DEFAULTS.meals as Tables['meals']), id: uid(), name, time, planned, position })
  const meals = [
    m('Café da manhã', '07:30', 'Pão integral com ovo mexido, 1 fruta e café', 0),
    m('Lanche da manhã', '10:00', 'Iogurte natural com granola', 1),
    m('Almoço', '12:30', 'Arroz, feijão, proteína e salada colorida', 2),
    m('Lanche da tarde', '16:00', 'Fruta e castanhas', 3),
    m('Jantar', '19:30', 'Omelete com legumes ou sopa', 4),
  ]
  const meal_logs: Tables['meal_logs'][] = []
  for (let d = 0; d <= 6; d++) {
    const key = toDateKey(addDays(today, -d))
    meals.forEach((meal, i) => {
      if (d === 0 && i > 1) return
      const status = (d + i) % 5 === 0 ? 'different' : (d + i) % 7 === 3 ? 'skipped' : 'as_planned'
      meal_logs.push({ ...(DEFAULTS.meal_logs as Tables['meal_logs']), id: uid(), log_date: key, meal_id: meal.id, name: meal.name, status,
        description: status === 'as_planned' ? meal.planned : status === 'different' ? 'Comi fora: sanduíche natural' : null })
    })
  }
  meal_logs.push({ ...(DEFAULTS.meal_logs as Tables['meal_logs']), id: uid(), log_date: toDateKey(addDays(today, -1)), name: 'Brigadeiro no aniversário', time: '15:00', description: 'Dois docinhos 🎉' })
  return { meals, meal_logs }
}

function seedFinance(today: Date) {
  const fc = (name: string, kind: 'income' | 'expense', color: string, position: number) => ({ id: uid(), name, kind, color, position })
  const finance_categories = [
    fc('Salário', 'income', 'sage', 0), fc('Renda extra', 'income', 'mint', 1), fc('Outras receitas', 'income', 'sky', 2),
    fc('Moradia', 'expense', 'lavender', 0), fc('Mercado', 'expense', 'sage', 1), fc('Transporte', 'expense', 'sky', 2),
    fc('Saúde', 'expense', 'mint', 3), fc('Lazer', 'expense', 'rose', 4), fc('Beleza e cuidados', 'expense', 'rose', 5),
    fc('Educação', 'expense', 'sand', 6), fc('Contas e assinaturas', 'expense', 'graphite', 7), fc('Outros', 'expense', 'graphite', 8),
  ]
  const pm = (name: string, kind: Tables['payment_methods']['kind'], position: number) => ({ id: uid(), name, kind, position, archived_at: null })
  const payment_methods = [pm('Pix', 'pix', 0), pm('Cartão de débito', 'debit', 1), pm('Cartão de crédito', 'credit', 2), pm('Dinheiro', 'cash', 3)]
  const cat = (n: string) => finance_categories.find((c) => c.name === n)!.id
  const pay = (n: string) => payment_methods.find((p) => p.name === n)!.id
  const month0 = new Date(today.getFullYear(), today.getMonth(), 1)
  const dk = (m: number, d: number) => toDateKey(new Date(month0.getFullYear(), month0.getMonth() - m, d))
  const recurring_transactions: Tables['recurring_transactions'][] = [
    { ...(DEFAULTS.recurring_transactions as Tables['recurring_transactions']), id: uid(), kind: 'income', description: 'Salário', amount_cents: 650000, category_id: cat('Salário'), start_date: dk(5, 5) },
    { ...(DEFAULTS.recurring_transactions as Tables['recurring_transactions']), id: uid(), kind: 'expense', description: 'Aluguel', amount_cents: 180000, category_id: cat('Moradia'), payment_method_id: pay('Pix'), start_date: dk(5, 10) },
    { ...(DEFAULTS.recurring_transactions as Tables['recurring_transactions']), id: uid(), kind: 'expense', description: 'Internet', amount_cents: 11990, category_id: cat('Contas e assinaturas'), payment_method_id: pay('Cartão de crédito'), start_date: dk(5, 20) },
  ]
  const transactions: Tables['transactions'][] = []
  const tx = (m: number, d: number, kind: 'income' | 'expense', description: string, cents: number, c: string, p?: string, extra: Partial<Tables['transactions']> = {}) =>
    transactions.push({ ...(DEFAULTS.transactions as Tables['transactions']), id: uid(), kind, description, amount_cents: cents, occurred_on: dk(m, d), category_id: cat(c), payment_method_id: p ? pay(p) : null, ...extra })
  for (let m = 5; m >= 1; m--) {
    tx(m, 5, 'income', 'Salário', 650000, 'Salário', undefined, { recurring_id: recurring_transactions[0].id, source: 'recurring' })
    tx(m, 10, 'expense', 'Aluguel', 180000, 'Moradia', 'Pix', { recurring_id: recurring_transactions[1].id, source: 'recurring' })
    tx(m, 20, 'expense', 'Internet', 11990, 'Contas e assinaturas', 'Cartão de crédito', { recurring_id: recurring_transactions[2].id, source: 'recurring' })
    tx(m, 8, 'expense', 'Mercado do mês', 85000 + m * 7300, 'Mercado', 'Cartão de débito')
    tx(m, 15, 'expense', 'Combustível', 32000 - m * 1500, 'Transporte', 'Cartão de crédito')
    tx(m, 22, 'expense', 'Jantar com amigas', 15000 + m * 4000, 'Lazer', 'Pix')
    if (m % 2) tx(m, 18, 'income', 'Projeto freelance', 120000, 'Renda extra')
  }
  const day = today.getDate()
  const cur = (d: number) => Math.min(d, 28)
  if (day >= 5) tx(0, 5, 'income', 'Salário', 650000, 'Salário', undefined, { recurring_id: recurring_transactions[0].id, source: 'recurring' })
  if (day >= 10) tx(0, 10, 'expense', 'Aluguel', 180000, 'Moradia', 'Pix', { recurring_id: recurring_transactions[1].id, source: 'recurring' })
  tx(0, cur(Math.max(1, day - 3)), 'expense', 'Mercado', 42370, 'Mercado', 'Cartão de débito')
  tx(0, cur(Math.max(1, day - 1)), 'expense', 'Farmácia', 8790, 'Saúde', 'Pix')
  tx(0, cur(Math.max(1, day - 6)), 'expense', 'Manicure', 6000, 'Beleza e cuidados', 'Pix')
  tx(0, cur(Math.min(28, day + 4)), 'expense', 'Fatura do cartão', 98000, 'Contas e assinaturas', undefined, { status: 'pending' })
  const mk = toDateKey(month0)
  const budgets: Tables['budgets'][] = [
    { id: uid(), month: mk, category_id: null, amount_cents: 450000 },
    { id: uid(), month: mk, category_id: cat('Mercado'), amount_cents: 110000 },
    { id: uid(), month: mk, category_id: cat('Lazer'), amount_cents: 40000 },
  ]
  const savings_goals: Tables['savings_goals'][] = [
    { ...(DEFAULTS.savings_goals as Tables['savings_goals']), id: uid(), name: 'Viagem para a praia', target_cents: 600000, saved_cents: 245000, deadline: dk(-6, 1), color: 'sky' },
    { ...(DEFAULTS.savings_goals as Tables['savings_goals']), id: uid(), name: 'Reserva de emergência', target_cents: 2000000, saved_cents: 830000, color: 'sage' },
  ]
  return { finance_categories, payment_methods, recurring_transactions, transactions, budgets, savings_goals }
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
    hb('Academia', 'dumbbell', 'rose', 'anytime', { frequency: 'weekly', target_per_period: 3 }),
    hb('Faxina pesada', 'home', 'sage', 'anytime', { frequency: 'monthly', target_per_period: 1 }),
  ]
  const habit_logs: Tables['habit_logs'][] = []
  for (let d = 1; d <= 20; d++) {
    habits.forEach((h, i) => {
      if (h.frequency !== 'daily') {
        if ((h.frequency === 'weekly' && d % 2 === 1 && d < 14) || (h.frequency === 'monthly' && d === 12))
          habit_logs.push({ id: uid(), habit_id: h.id, log_date: toDateKey(addDays(today, -d)), count: 1 })
        return
      }
      if ((d + i) % 4 !== 0 && h.days_of_week.includes(addDays(today, -d).getDay()))
        habit_logs.push({ id: uid(), habit_id: h.id, log_date: toDateKey(addDays(today, -d)), count: h.target_per_day })
    })
  }
  habit_logs.push({ id: uid(), habit_id: habits[0].id, log_date: toDateKey(today), count: 3 })
  return { categories: cats, events, tasks, habits, habit_logs, mood_entries: [] as Tables['mood_entries'][], ...seedFinance(today), ...seedWorkout(today), ...seedFood(today) }
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
    enabled_modules: ['agenda', 'tasks', 'habits', 'finance', 'workout', 'food'],
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
      if (table === 'finance_categories') {
        db.budgets = db.budgets.filter((b) => b.category_id !== id)
        db.transactions = db.transactions.map((t) => (t.category_id === id ? { ...t, category_id: null } : t))
      }
      if (table === 'payment_methods') db.transactions = db.transactions.map((t) => (t.payment_method_id === id ? { ...t, payment_method_id: null } : t))
      if (table === 'workout_plans') db.workout_sessions = db.workout_sessions.map((x) => (x.plan_id === id ? { ...x, plan_id: null } : x))
      if (table === 'meals') db.meal_logs = db.meal_logs.map((x) => (x.meal_id === id ? { ...x, meal_id: null } : x))
      if (table === 'recurring_transactions') db.transactions = db.transactions.map((t) => (t.recurring_id === id ? { ...t, recurring_id: null } : t))
      if (table === 'categories') {
        db.tasks = db.tasks.map((t) => (t.category_id === id ? { ...t, category_id: null } : t))
        db.events = db.events.map((t) => (t.category_id === id ? { ...t, category_id: null } : t))
      }
      return delay(undefined)
    },
    async insertMany(table, rows) {
      for (const r of rows) {
        const tr = r as unknown as Tables['transactions']
        const dup = table === 'transactions' && tr.recurring_id &&
          db.transactions.some((t) => t.recurring_id === tr.recurring_id && t.occurred_on === tr.occurred_on)
        if (!dup) (db[table] as unknown[]).push({ ...DEFAULTS[table], ...r, id: uid(), created_at: stamp(), updated_at: stamp() })
      }
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
