import { Link } from 'react-router'
import { Plus, Wallet } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import { useTable } from '@/hooks/useData'
import { useEditors } from '@/features/shared/editors'
import { useRecurringSync } from '@/features/finance/useRecurringSync'
import { budgetFor, inMonth, totals } from '@/lib/finance'
import { formatBRL } from '@/lib/money'
import { fromDateKey, friendlyDay, todayKey } from '@/lib/dates'
import { addDays } from 'date-fns'
import { toDateKey } from '@/lib/dates'

export function FinanceWidget() {
  useRecurringSync()
  const { data: txs, isLoading } = useTable('transactions')
  const { data: budgets = [] } = useTable('budgets')
  const { openTransaction } = useEditors()
  const now = new Date()
  const month = (txs ?? []).filter((t) => inMonth(t, now))
  const t = totals(month)
  const budget = budgetFor(budgets, now, null)
  const spent = t.expense + t.pendingExpense
  const soon = toDateKey(addDays(now, 7))
  const bills = (txs ?? []).filter((x) => x.kind === 'expense' && x.status === 'pending' && x.occurred_on <= soon)
    .sort((a, b) => (a.occurred_on < b.occurred_on ? -1 : 1))
  const today = todayKey()
  return (
    <Card>
      <CardHeader title="Finanças do mês" icon={<Wallet />} action={<Link to="/financas" className="text-sm font-medium text-primary hover:underline">Abrir</Link>} />
      {isLoading ? <Skeleton className="h-20" /> : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-muted/60 p-2"><p className="text-[11px] text-muted-foreground">Entrou</p><p className="text-sm font-semibold tabular-nums">{formatBRL(t.income)}</p></div>
            <div className="rounded-xl bg-muted/60 p-2"><p className="text-[11px] text-muted-foreground">Saiu</p><p className="text-sm font-semibold tabular-nums">{formatBRL(t.expense)}</p></div>
            <div className="rounded-xl bg-muted/60 p-2"><p className="text-[11px] text-muted-foreground">Saldo</p><p className={`text-sm font-semibold tabular-nums ${t.balance < 0 ? 'text-danger' : ''}`}>{formatBRL(t.balance)}</p></div>
          </div>
          {budget && (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (spent / budget.amount_cents) * 100)}%` }} /></div>
              <p className="mt-1 text-xs text-muted-foreground">{spent <= budget.amount_cents ? `Ainda cabem ${formatBRL(budget.amount_cents - spent)} no orçamento.` : `${formatBRL(spent - budget.amount_cents)} acima do orçamento.`}</p>
            </div>
          )}
          {bills.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {bills.slice(0, 3).map((b) => (
                <li key={b.id}><button onClick={() => openTransaction(b)} className="flex w-full justify-between gap-2 rounded-lg px-1 py-1 text-left hover:bg-muted/60">
                  <span className="min-w-0 truncate">{b.description} <span className={b.occurred_on < today ? 'text-danger' : 'text-muted-foreground'}>· {b.occurred_on < today ? 'venceu' : 'vence'} {friendlyDay(fromDateKey(b.occurred_on)).toLowerCase()}</span></span>
                  <span className="shrink-0 tabular-nums">{formatBRL(b.amount_cents)}</span>
                </button></li>
              ))}
            </ul>
          )}
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => openTransaction(null, { kind: 'expense' })}><Plus />Registrar despesa</Button>
        </>
      )}
    </Card>
  )
}
