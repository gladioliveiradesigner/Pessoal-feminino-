export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type Priority = 'low' | 'medium' | 'high'
export type DayPeriod = 'morning' | 'afternoon' | 'evening' | 'anytime'
export type ThemePref = 'light' | 'dark' | 'system'
export type Accent = 'rose' | 'lavender' | 'sage' | 'graphite'

export interface WidgetPref { id: WidgetId; visible: boolean }
export type WidgetId = 'tasks' | 'events' | 'habits' | 'finance' | 'workout' | 'food' | 'mood' | 'reminders'

export interface Profile {
  id: string
  display_name: string
  goals: string[]
  areas: string[]
  theme: ThemePref
  accent: Accent
  enabled_modules: string[]
  dashboard_widgets: WidgetPref[]
  week_starts_on: 0 | 1
  onboarded_at: string | null
  created_at?: string
  updated_at?: string
}

interface Owned {
  id: string
  user_id?: string
  created_at?: string
  updated_at?: string
}

export interface Category extends Owned {
  name: string
  color: string
  position: number
}

export interface EventRow extends Owned {
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string
  all_day: boolean
  category_id: string | null
  recurrence_freq: RecurrenceFreq | null
  recurrence_interval: number
  recurrence_until: string | null
  reminder_minutes: number[]
}

export interface Task extends Owned {
  parent_id: string | null
  title: string
  notes: string | null
  priority: Priority
  due_date: string | null
  due_time: string | null
  category_id: string | null
  tags: string[]
  recurrence_freq: RecurrenceFreq | null
  recurrence_interval: number
  completed_at: string | null
  position: number
}

export type HabitFrequency = 'daily' | 'weekly' | 'monthly'

export interface Habit extends Owned {
  name: string
  /** daily: usa days_of_week e target_per_day. weekly/monthly: X vezes por semana/mês (target_per_period). */
  frequency: HabitFrequency
  target_per_period: number
  icon: string
  color: string
  days_of_week: number[]
  target_per_day: number
  unit: string | null
  period: DayPeriod
  archived_at: string | null
  position: number
}

export interface HabitLog extends Owned {
  habit_id: string
  log_date: string
  count: number
}

export interface MoodEntry extends Owned {
  entry_date: string
  mood: number
  energy: number | null
  note: string | null
}

// ---------------- Finanças ----------------
export type MoneyKind = 'income' | 'expense'
export type PaymentKind = 'cash' | 'debit' | 'credit' | 'pix' | 'transfer' | 'other'

export interface PaymentMethod extends Owned {
  name: string
  kind: PaymentKind
  archived_at: string | null
  position: number
}

export interface FinanceCategory extends Owned {
  name: string
  kind: MoneyKind
  color: string
  position: number
}

export interface Transaction extends Owned {
  kind: MoneyKind
  description: string
  amount_cents: number
  occurred_on: string
  status: 'paid' | 'pending'
  paid_at: string | null
  category_id: string | null
  payment_method_id: string | null
  recurring_id: string | null
  notes: string | null
  source: 'manual' | 'recurring' | 'import'
}

export interface RecurringTransaction extends Owned {
  kind: MoneyKind
  description: string
  amount_cents: number
  category_id: string | null
  payment_method_id: string | null
  freq: RecurrenceFreq
  interval_count: number
  start_date: string
  end_date: string | null
  active: boolean
}

export interface Budget extends Owned {
  month: string
  category_id: string | null
  amount_cents: number
}

export interface SavingsGoal extends Owned {
  name: string
  target_cents: number
  saved_cents: number
  deadline: string | null
  color: string
  achieved_at: string | null
}

// ---------------- Treinos ----------------
export interface WorkoutExercise {
  id: string
  name: string
  sets: number
  reps: string
  weight_kg: number | null
  rest_seconds: number | null
  notes: string | null
}

export interface WorkoutPlan extends Owned {
  name: string
  color: string
  days_of_week: number[]
  notes: string | null
  exercises: WorkoutExercise[]
  archived_at: string | null
  position: number
}

export interface WorkoutEntry {
  exercise_id: string | null
  name: string
  sets: number
  reps: string
  weight_kg: number | null
  done: boolean
}

export interface WorkoutSession extends Owned {
  plan_id: string | null
  name: string
  performed_on: string
  duration_min: number | null
  /** Como foi: 1 (leve) a 5 (puxado). */
  effort: number | null
  notes: string | null
  entries: WorkoutEntry[]
}

// ---------------- Alimentação ----------------
export interface Meal extends Owned {
  name: string
  time: string | null
  planned: string | null
  days_of_week: number[]
  position: number
}

export type MealStatus = 'as_planned' | 'different' | 'skipped'

export interface MealLog extends Owned {
  log_date: string
  meal_id: string | null
  name: string
  status: MealStatus
  description: string | null
  time: string | null
  notes: string | null
}

/** Mapeamento tabela → tipo de linha. Novas tabelas (finanças, metas...) entram aqui. */
export interface Tables {
  categories: Category
  events: EventRow
  tasks: Task
  habits: Habit
  habit_logs: HabitLog
  mood_entries: MoodEntry
  payment_methods: PaymentMethod
  finance_categories: FinanceCategory
  transactions: Transaction
  recurring_transactions: RecurringTransaction
  budgets: Budget
  savings_goals: SavingsGoal
  workout_plans: WorkoutPlan
  workout_sessions: WorkoutSession
  meals: Meal
  meal_logs: MealLog
}

export const ALL_TABLES: TableName[] = [
  'categories', 'events', 'tasks', 'habits', 'habit_logs', 'mood_entries',
  'payment_methods', 'finance_categories', 'transactions', 'recurring_transactions', 'budgets', 'savings_goals',
  'workout_plans', 'workout_sessions', 'meals', 'meal_logs',
]
export type TableName = keyof Tables

/**
 * Fonte de dados. Há duas implementações:
 * - Supabase (dados reais, protegidos por RLS)
 * - Demonstração (memória, dados fictícios, nada é salvo)
 */
export interface DataSource {
  kind: 'supabase' | 'demo'
  list<T extends TableName>(table: T): Promise<Tables[T][]>
  insert<T extends TableName>(table: T, row: Partial<Tables[T]>): Promise<Tables[T]>
  update<T extends TableName>(table: T, id: string, patch: Partial<Tables[T]>): Promise<Tables[T]>
  remove(table: TableName, id: string): Promise<void>
  /** Insere várias linhas de uma vez; conflitos de unicidade são ignorados. */
  insertMany<T extends TableName>(table: T, rows: Partial<Tables[T]>[]): Promise<void>
  upsert<T extends TableName>(table: T, row: Partial<Tables[T]>, onConflict: string): Promise<Tables[T]>
  getProfile(): Promise<Profile | null>
  updateProfile(patch: Partial<Profile>): Promise<Profile>
  exportAll(): Promise<Record<string, unknown>>
  deleteAccount(): Promise<void>
}

export const DEFAULT_WIDGETS: WidgetPref[] = [
  { id: 'tasks', visible: true },
  { id: 'events', visible: true },
  { id: 'habits', visible: true },
  { id: 'finance', visible: true },
  { id: 'workout', visible: true },
  { id: 'food', visible: true },
  { id: 'mood', visible: true },
  { id: 'reminders', visible: true },
]
