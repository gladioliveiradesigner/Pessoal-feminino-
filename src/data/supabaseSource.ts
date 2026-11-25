import type { SupabaseClient } from '@supabase/supabase-js'
import { ALL_TABLES, type DataSource, type Profile, type TableName, type Tables } from './types'

const ORDER: Record<TableName, string> = {
  categories: 'position',
  events: 'starts_at',
  tasks: 'position',
  habits: 'position',
  habit_logs: 'log_date',
  mood_entries: 'entry_date',
  payment_methods: 'position',
  finance_categories: 'position',
  transactions: 'occurred_on',
  recurring_transactions: 'start_date',
  budgets: 'month',
  savings_goals: 'created_at',
  workout_plans: 'position',
  workout_sessions: 'performed_on',
  meals: 'time',
  meal_logs: 'log_date',
}

/** Mensagens amigáveis, sem expor detalhes (e sem registrar dados pessoais). */
function fail(error: { message: string; code?: string } | null): never {
  const msg = error?.message ?? ''
  if (/JWT|auth/i.test(msg)) throw new Error('Sua sessão expirou. Entre novamente.')
  if (/Failed to fetch|NetworkError/i.test(msg)) throw new Error('Sem conexão. Verifique sua internet e tente de novo.')
  throw new Error('Não foi possível salvar agora. Tente novamente.')
}

export function createSupabaseSource(sb: SupabaseClient, userId: string): DataSource {
  return {
    kind: 'supabase',
    async list<T extends TableName>(table: T) {
      const { data, error } = await sb.from(table).select('*').order(ORDER[table], { ascending: true })
      if (error) fail(error)
      return data as Tables[T][]
    },
    async insert<T extends TableName>(table: T, row: Partial<Tables[T]>) {
      const { data, error } = await sb.from(table).insert(row as never).select().single()
      if (error) fail(error)
      return data as Tables[T]
    },
    async update<T extends TableName>(table: T, id: string, patch: Partial<Tables[T]>) {
      const { data, error } = await sb.from(table).update(patch as never).eq('id', id).select().single()
      if (error) fail(error)
      return data as Tables[T]
    },
    async remove(table, id) {
      const { error } = await sb.from(table).delete().eq('id', id)
      if (error) fail(error)
    },
    async upsert<T extends TableName>(table: T, row: Partial<Tables[T]>, onConflict: string) {
      const { data, error } = await sb.from(table).upsert(row as never, { onConflict }).select().single()
      if (error) fail(error)
      return data as Tables[T]
    },
    async insertMany(table, rows) {
      // uma a uma: conflito (23505) = ocorrência já criada em outra aba/dispositivo, ignorar só ela
      const results = await Promise.all(rows.map((r) => sb.from(table).insert(r as never)))
      const err = results.find((r) => r.error && r.error.code !== '23505')?.error
      if (err) fail(err)
    },
    async getProfile() {
      const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (error) fail(error)
      return data as Profile | null
    },
    async updateProfile(patch) {
      const { data, error } = await sb.from('profiles').update(patch as never).eq('id', userId).select().single()
      if (error) fail(error)
      return data as Profile
    },
    async exportAll() {
      const out: Record<string, unknown> = { exported_at: new Date().toISOString(), profile: await this.getProfile() }
      for (const t of ALL_TABLES) out[t] = await this.list(t)
      return out
    },
    async deleteAccount() {
      const { error } = await sb.rpc('delete_my_account')
      if (error) fail(error)
      await sb.auth.signOut()
    },
  }
}
