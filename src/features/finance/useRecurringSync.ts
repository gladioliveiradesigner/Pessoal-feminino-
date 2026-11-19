import { useEffect, useRef } from 'react'
import { addMonths } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { useSource } from '@/auth/session'
import { useTable } from '@/hooks/useData'
import { missingRecurring } from '@/lib/finance'

/**
 * Cria os lançamentos das recorrências (salário, aluguel, assinaturas...) até o fim do próximo mês,
 * como "pendentes". Idempotente: o banco impede duplicar a mesma ocorrência.
 */
export function useRecurringSync() {
  const source = useSource()
  const qc = useQueryClient()
  const recs = useTable('recurring_transactions')
  const txs = useTable('transactions')
  const running = useRef(false)

  useEffect(() => {
    if (!recs.data || !txs.data || running.current) return
    const missing = missingRecurring(recs.data, txs.data, addMonths(new Date(), 1))
    if (!missing.length) return
    running.current = true
    source.insertMany('transactions', missing)
      .then(() => qc.invalidateQueries({ queryKey: [source.kind, 'transactions'] }))
      .catch(() => { /* tenta de novo na próxima visita */ })
      .finally(() => { running.current = false })
  }, [recs.data, txs.data, source, qc])
}
