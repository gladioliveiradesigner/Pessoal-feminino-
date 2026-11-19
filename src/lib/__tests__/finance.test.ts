import { describe, expect, it } from 'vitest'
import { centsToInput, formatBRL, parseBRL } from '../money'
import { missingRecurring, totals } from '../finance'
import type { RecurringTransaction, Transaction } from '@/data/types'

describe('dinheiro', () => {
  it('entende os jeitos comuns de digitar valores', () => {
    expect(parseBRL('1.234,56')).toBe(123456)
    expect(parseBRL('1234,5')).toBe(123450)
    expect(parseBRL('1234.56')).toBe(123456)
    expect(parseBRL('R$ 50')).toBe(5000)
    expect(parseBRL('1.234')).toBe(123400)
    expect(parseBRL('0,99')).toBe(99)
    expect(parseBRL('abc')).toBeNull()
    expect(parseBRL('')).toBeNull()
  })
  it('formata em reais', () => {
    expect(formatBRL(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56')
    expect(centsToInput(5000)).toBe('50,00')
  })
})

describe('finanças', () => {
  const tx = (p: Partial<Transaction>): Transaction => ({ id: Math.random().toString(), kind: 'expense', description: 'x', amount_cents: 100, occurred_on: '2026-11-10', status: 'paid', paid_at: null, category_id: null, payment_method_id: null, recurring_id: null, notes: null, source: 'manual', ...p })
  it('separa pago de pendente no saldo', () => {
    const t = totals([tx({ kind: 'income', amount_cents: 1000 }), tx({ amount_cents: 300 }), tx({ amount_cents: 200, status: 'pending' })])
    expect(t.balance).toBe(700)
    expect(t.projected).toBe(500)
  })
  it('gera só as ocorrências que faltam', () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 10)
    const sk = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-10`
    const r: RecurringTransaction = { id: 'r', kind: 'expense', description: 'Aluguel', amount_cents: 1000, category_id: null, payment_method_id: null, freq: 'monthly', interval_count: 1, start_date: sk, end_date: null, active: true }
    const until = new Date(now.getFullYear(), now.getMonth() + 1, 28)
    const first = missingRecurring([r], [], until)
    expect(first.length).toBe(3) // mês passado, atual e próximo
    const again = missingRecurring([r], first.map((f) => tx(f)), until)
    expect(again.length).toBe(0)
    expect(missingRecurring([{ ...r, active: false }], [], until).length).toBe(0)
  })
})
