import { addDays, endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import type { Budget, RecurringTransaction, Transaction } from '@/data/types'
import { fromDateKey, toDateKey } from './dates'
import { occurrencesBetween } from './recurrence'

export const monthKey = (d: Date) => format(startOfMonth(d), 'yyyy-MM-dd')

export function inMonth(t: Transaction, month: Date) {
  const s = toDateKey(startOfMonth(month)), e = toDateKey(endOfMonth(month))
  return t.occurred_on >= s && t.occurred_on <= e
}

export function totals(list: Transaction[]) {
  let income = 0, expense = 0, pendingExpense = 0, pendingIncome = 0
  for (const t of list) {
    if (t.kind === 'income') { if (t.status === 'paid') income += t.amount_cents; else pendingIncome += t.amount_cents }
    else { if (t.status === 'paid') expense += t.amount_cents; else pendingExpense += t.amount_cents }
  }
  return { income, expense, pendingExpense, pendingIncome, balance: income - expense, projected: income + pendingIncome - expense - pendingExpense }
}

/** Saldo acumulado de tudo que já foi pago/recebido. */
export function overallBalance(all: Transaction[]) {
  return all.reduce((s, t) => (t.status === 'paid' ? s + (t.kind === 'income' ? t.amount_cents : -t.amount_cents) : s), 0)
}

/** Despesas por categoria (pagas + pendentes) no conjunto, maior primeiro. */
export function expensesByCategory(list: Transaction[]) {
  const m = new Map<string | null, number>()
  for (const t of list) if (t.kind === 'expense') m.set(t.category_id, (m.get(t.category_id) ?? 0) + t.amount_cents)
  return [...m.entries()].map(([category_id, cents]) => ({ category_id, cents })).sort((a, b) => b.cents - a.cents)
}

export function lastMonthsSeries(all: Transaction[], ref: Date, n = 6) {
  return Array.from({ length: n }, (_, i) => {
    const m = subMonths(startOfMonth(ref), n - 1 - i)
    const t = totals(all.filter((x) => inMonth(x, m) && x.status === 'paid'))
    return { month: m, income: t.income, expense: t.expense }
  })
}

export function budgetFor(budgets: Budget[], month: Date, categoryId: string | null) {
  const mk = monthKey(month)
  return budgets.find((b) => b.month === mk && b.category_id === categoryId) ?? null
}

/**
 * Ocorrências de lançamentos recorrentes que ainda não existem como lançamento,
 * do início da recorrência (ou de 2 meses atrás) até `until`. Geração idempotente:
 * o banco tem índice único (recurring_id, occurred_on).
 */
export function missingRecurring(recs: RecurringTransaction[], existing: Transaction[], until: Date) {
  const have = new Set(existing.filter((t) => t.recurring_id).map((t) => `${t.recurring_id}:${t.occurred_on}`))
  const floor = subMonths(startOfMonth(new Date()), 2)
  const out: Partial<Transaction>[] = []
  for (const r of recs) {
    if (!r.active) continue
    const start = fromDateKey(r.start_date)
    const from = start > floor ? start : floor
    const end = r.end_date ? fromDateKey(r.end_date) : null
    for (const d of occurrencesBetween(start, r.freq, r.interval_count, end, from, addDays(until, 1))) {
      const k = toDateKey(d)
      if (have.has(`${r.id}:${k}`)) continue
      out.push({
        kind: r.kind, description: r.description, amount_cents: r.amount_cents, occurred_on: k,
        category_id: r.category_id, payment_method_id: r.payment_method_id, recurring_id: r.id,
        status: 'pending', source: 'recurring',
      })
    }
  }
  return out
}

export const PAYMENT_KIND_LABEL = { cash: 'Dinheiro', debit: 'Débito', credit: 'Crédito', pix: 'Pix', transfer: 'Transferência', other: 'Outro' } as const

/** Cores dos gráficos, validadas para daltonismo e contraste (claro/escuro). */
export const CHART = {
  light: { income: '#5A6FD0', expense: '#D9707F' },
  dark: { income: '#6E7FDC', expense: '#D66878' },
}
