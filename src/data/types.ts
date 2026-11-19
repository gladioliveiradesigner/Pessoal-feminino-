export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type Priority = 'low' | 'medium' | 'high'
export type DayPeriod = 'morning' | 'afternoon' | 'evening' | 'anytime'
export type ThemePref = 'light' | 'dark' | 'system'
export type Accent = 'rose' | 'lavender' | 'sage' | 'graphite'

export interface WidgetPref { id: WidgetId; visible: boolean }
export type WidgetId = 'tasks' | 'events' | 'habits' | 'mood' | 'reminders'

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

export interface Habit extends Owned {
  name: string
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

/** Mapeamento tabela → tipo de linha. Novas tabelas (finanças, metas...) entram aqui. */
export interface Tables {
  categories: Category
  events: EventRow
  tasks: Task
  habits: Habit
  habit_logs: HabitLog
  mood_entries: MoodEntry
}
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
  { id: 'mood', visible: true },
  { id: 'reminders', visible: true },
]
