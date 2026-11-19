import { useMemo, useState } from 'react'
import { addMonths, endOfMonth, startOfMonth, subMonths, isSameMonth } from 'date-fns'
import { ArrowDownRight, ArrowUpRight, CalendarClock, ChevronLeft, ChevronRight, Copy, PiggyBank, Plus, Repeat, Search, Settings2, Target, Wallet } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/field'
import { Badge, Chip, EmptyState, ErrorState, PageHeader, PageLoader, Segmented } from '@/components/ui/misc'
import { useTable, useTableMutations } from '@/hooks/useData'
import { useEditors } from '@/features/shared/editors'
import { capitalize, fmt, fromDateKey, friendlyDay, todayKey, toDateKey } from '@/lib/dates'
import { formatBRL, parseBRL, centsToInput } from '@/lib/money'
import { budgetFor, expensesByCategory, inMonth, lastMonthsSeries, monthKey, overallBalance, totals, PAYMENT_KIND_LABEL } from '@/lib/finance'
import { freqLabel } from '@/lib/recurrence'
import { cn } from '@/lib/utils'
import type { RecurringTransaction, SavingsGoal, Transaction } from '@/data/types'
import { CategoryBars, MonthlyChart } from './FinanceCharts'
import { FinanceSettings } from './FinanceSettings'
import { RecurringForm } from './RecurringForm'
import { GoalDeposit, GoalForm } from './GoalForm'
import { MoneyInput } from './MoneyInput'
import { useRecurringSync } from './useRecurringSync'
import { colorOf } from '@/lib/colors'

type Tab = 'summary' | 'list' | 'bills' | 'budget' | 'goals'

function MonthNav({ month, setMonth }: { month: Date; setMonth: (d: Date) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon-sm" aria-label="Mês anterior" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft /></Button>
      <span className="min-w-32 text-center text-sm font-semibold" aria-live="polite">{capitalize(fmt(month, 'MMMM yyyy'))}</span>
      <Button variant="ghost" size="icon-sm" aria-label="Próximo mês" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight /></Button>
      {!isSameMonth(month, new Date()) && <Button variant="outline" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>Atual</Button>}
    </div>
  )
}

function Stat({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone?: 'income' | 'expense' }) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className={cn('[&_svg]:size-4', tone === 'income' && 'text-[#5A6FD0] dark:text-[#8f9ce6]', tone === 'expense' && 'text-[#C25566] dark:text-[#e38a98]')}>{icon}</span>{label}
      </p>
      <p className={cn('mt-1.5 text-xl font-semibold tabular-nums sm:text-2xl', value < 0 && 'text-danger')}>{formatBRL(value)}</p>
    </Card>
  )
}

function TxnRow({ t, onOpen, catName, catColor, showDate }: { t: Transaction; onOpen: () => void; catName?: string; catColor?: string; showDate?: boolean }) {
  return (
    <li>
      <button onClick={onOpen} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-muted/60">
        <span className="grid size-9 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${colorOf(catColor).hex} 25%, transparent)` }}>
          {t.kind === 'income' ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px]">{t.description}</span>
          <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {catName ?? 'Sem categoria'}
            {showDate && <span>· {fmt(fromDateKey(t.occurred_on), "d 'de' MMM")}</span>}
            {t.recurring_id && <Repeat className="size-3" aria-label="Recorrente" />}
            {t.status === 'pending' && <Badge color="sand">{t.kind === 'income' ? 'A receber' : 'A pagar'}</Badge>}
          </span>
        </span>
        <span className={cn('shrink-0 text-[15px] font-semibold tabular-nums', t.kind === 'income' ? 'text-[#4a5fc0] dark:text-[#9aa6ea]' : 'text-foreground')}>
          {t.kind === 'income' ? '+' : '−'} {formatBRL(t.amount_cents)}
        </span>
      </button>
    </li>
  )
}

export function FinancePage() {
  useRecurringSync()
  const { data: txs, isLoading, isError, refetch } = useTable('transactions')
  const { data: cats = [] } = useTable('finance_categories')
  const { data: methods = [] } = useTable('payment_methods')
  const { data: recs = [] } = useTable('recurring_transactions')
  const { data: budgets = [] } = useTable('budgets')
  const { data: goals = [] } = useTable('savings_goals')
  const txM = useTableMutations('transactions')
  const budgetM = useTableMutations('budgets')
  const { openTransaction } = useEditors()
  const [tab, setTab] = useState<Tab>('summary')
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [settings, setSettings] = useState(false)
  const [rec, setRec] = useState<{ open: boolean; item: RecurringTransaction | null }>({ open: false, item: null })
  const [goal, setGoal] = useState<{ open: boolean; item: SavingsGoal | null }>({ open: false, item: null })
  const [deposit, setDeposit] = useState<SavingsGoal | null>(null)
  // filtros de lançamentos
  const [kindF, setKindF] = useState<'all' | 'income' | 'expense'>('all')
  const [catF, setCatF] = useState('')
  const [pmF, setPmF] = useState('')
  const [q, setQ] = useState('')
  const [custom, setCustom] = useState(false)
  const [from, setFrom] = useState(() => toDateKey(startOfMonth(new Date())))
  const [to, setTo] = useState(() => toDateKey(endOfMonth(new Date())))

  const all = useMemo(() => txs ?? [], [txs])
  const monthTx = useMemo(() => all.filter((t) => inMonth(t, month)), [all, month])
  const tot = totals(monthTx)
  const catOf = (id: string | null) => cats.find((c) => c.id === id)
  const totalBudget = budgetFor(budgets, month, null)
  const byCat = expensesByCategory(monthTx)
  const catBudgets = new Map(budgets.filter((b) => b.month === monthKey(month) && b.category_id).map((b) => [b.category_id, b.amount_cents]))
  const today = todayKey()

  const listed = useMemo(() => {
    let l = custom ? all.filter((t) => t.occurred_on >= from && t.occurred_on <= to) : monthTx
    if (kindF !== 'all') l = l.filter((t) => t.kind === kindF)
    if (catF) l = l.filter((t) => t.category_id === catF)
    if (pmF) l = l.filter((t) => t.payment_method_id === pmF)
    if (q.trim()) { const s = q.trim().toLowerCase(); l = l.filter((t) => t.description.toLowerCase().includes(s) || t.notes?.toLowerCase().includes(s)) }
    return [...l].sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : a.occurred_on > b.occurred_on ? -1 : 0))
  }, [all, monthTx, custom, from, to, kindF, catF, pmF, q])
  const listedGroups = useMemo(() => {
    const m = new Map<string, Transaction[]>()
    listed.forEach((t) => m.set(t.occurred_on, [...(m.get(t.occurred_on) ?? []), t]))
    return [...m.entries()]
  }, [listed])
  const listedTot = totals(listed)

  const pending = all.filter((t) => t.status === 'pending').sort((a, b) => (a.occurred_on < b.occurred_on ? -1 : 1))
  const payables = pending.filter((t) => t.kind === 'expense')
  const receivables = pending.filter((t) => t.kind === 'income')
  const markPaid = (t: Transaction) => txM.update.mutate({ id: t.id, patch: { status: 'paid', paid_at: today }, success: t.kind === 'income' ? 'Marcado como recebido.' : 'Conta paga! Uma a menos.' })

  const setBudget = (categoryId: string | null, raw: string) => {
    const cents = parseBRL(raw)
    const existing = budgetFor(budgets, month, categoryId)
    if (!cents) { if (existing) budgetM.remove.mutate({ id: existing.id, success: 'Orçamento removido.' }); return }
    if (existing) { if (existing.amount_cents !== cents) budgetM.update.mutate({ id: existing.id, patch: { amount_cents: cents }, success: 'Orçamento salvo.' }) }
    else budgetM.create.mutate({ row: { month: monthKey(month), category_id: categoryId, amount_cents: cents }, success: 'Orçamento salvo.' })
  }
  const copyBudgets = () => {
    const prev = budgets.filter((b) => b.month === monthKey(subMonths(month, 1)))
    const missing = prev.filter((p) => !budgetFor(budgets, month, p.category_id))
    if (!missing.length) return
    missing.forEach((p) => budgetM.create.mutate({ row: { month: monthKey(month), category_id: p.category_id, amount_cents: p.amount_cents }, silent: true }))
  }
  const prevHasBudgets = budgets.some((b) => b.month === monthKey(subMonths(month, 1)))

  if (isError) return <ErrorState onRetry={refetch} />
  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader title="Finanças" subtitle={`Saldo geral: ${formatBRL(overallBalance(all))}`}
        action={<div className="flex gap-2">
          <Button variant="ghost" size="icon" aria-label="Ajustes de finanças" onClick={() => setSettings(true)}><Settings2 /></Button>
          <Button aria-label="Novo lançamento" onClick={() => openTransaction(null)}><Plus /><span className="hidden sm:inline">Lançamento</span></Button>
        </div>} />

      <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Segmented label="Seções" value={tab} onChange={setTab} className="min-w-max"
          options={[{ value: 'summary', label: 'Resumo' }, { value: 'list', label: 'Lançamentos' }, { value: 'bills', label: 'Contas' }, { value: 'budget', label: 'Orçamento' }, { value: 'goals', label: 'Metas' }]} />
      </div>

      {(tab === 'summary' || tab === 'budget' || (tab === 'list' && !custom)) && <div className="mb-4"><MonthNav month={month} setMonth={setMonth} /></div>}

      {tab === 'summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Receitas" value={tot.income} icon={<ArrowUpRight />} tone="income" />
            <Stat label="Despesas" value={tot.expense} icon={<ArrowDownRight />} tone="expense" />
            <Stat label="Saldo do mês" value={tot.balance} icon={<Wallet />} />
            <Stat label="Previsto no fim do mês" value={tot.projected} icon={<CalendarClock />} />
          </div>
          {totalBudget && (
            <Card className="p-4">
              <div className="mb-2 flex items-baseline justify-between text-sm">
                <span className="font-medium">Orçamento do mês</span>
                <span className="tabular-nums">{formatBRL(tot.expense + tot.pendingExpense)} de {formatBRL(totalBudget.amount_cents)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, ((tot.expense + tot.pendingExpense) / totalBudget.amount_cents) * 100)}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {tot.expense + tot.pendingExpense <= totalBudget.amount_cents
                  ? `Ainda cabem ${formatBRL(totalBudget.amount_cents - tot.expense - tot.pendingExpense)} neste mês, contando as contas a pagar.`
                  : `O mês passou ${formatBRL(tot.expense + tot.pendingExpense - totalBudget.amount_cents)} do planejado. Vale olhar as categorias abaixo.`}
              </p>
            </Card>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader title="Receitas e despesas" /><MonthlyChart data={lastMonthsSeries(all, month)} /></Card>
            <Card>
              <CardHeader title="Para onde foi o dinheiro" />
              {byCat.length ? <CategoryBars rows={byCat} cats={cats} budgets={catBudgets} /> : <p className="text-sm text-muted-foreground">Nenhuma despesa neste mês.</p>}
            </Card>
          </div>
          {payables.length > 0 && (
            <Card>
              <CardHeader title="Próximas contas" icon={<CalendarClock />} action={<button className="text-sm font-medium text-primary hover:underline" onClick={() => setTab('bills')}>Ver todas</button>} />
              <ul className="-mx-2">{payables.slice(0, 4).map((t) => <TxnRow key={t.id} t={t} showDate onOpen={() => openTransaction(t)} catName={catOf(t.category_id)?.name} catColor={catOf(t.category_id)?.color} />)}</ul>
            </Card>
          )}
        </div>
      )}

      {tab === 'list' && (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {(['all', 'expense', 'income'] as const).map((k) => <Chip key={k} active={kindF === k} onClick={() => setKindF(k)}>{{ all: 'Todos', expense: 'Despesas', income: 'Receitas' }[k]}</Chip>)}
            <Chip active={custom} onClick={() => setCustom(!custom)}>Período personalizado</Chip>
          </div>
          {custom && (
            <div className="mb-3 grid grid-cols-2 gap-2 sm:max-w-md">
              <label className="text-xs text-muted-foreground">De<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
              <label className="text-xs text-muted-foreground">Até<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
            </div>
          )}
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            <div className="relative sm:col-span-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" aria-label="Buscar lançamentos" className="pl-10" />
            </div>
            <Select value={catF} onChange={(e) => setCatF(e.target.value)} aria-label="Filtrar por categoria">
              <option value="">Todas as categorias</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.kind === 'income' ? 'receita' : 'despesa'})</option>)}
            </Select>
            <Select value={pmF} onChange={(e) => setPmF(e.target.value)} aria-label="Filtrar por forma de pagamento">
              <option value="">Todas as formas de pagamento</option>
              {methods.map((m) => <option key={m.id} value={m.id}>{m.name} · {PAYMENT_KIND_LABEL[m.kind]}</option>)}
            </Select>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">{listed.length} lançamento{listed.length === 1 ? '' : 's'} · entradas {formatBRL(listedTot.income + listedTot.pendingIncome)} · saídas {formatBRL(listedTot.expense + listedTot.pendingExpense)}</p>
          <Card className="p-3">
            {listed.length === 0 ? (
              <EmptyState icon={<Wallet />} title="Nenhum lançamento aqui" text="Registre receitas e despesas em segundos pelo botão +." action={<Button variant="outline" onClick={() => openTransaction(null)}><Plus />Novo lançamento</Button>} />
            ) : listedGroups.map(([day, items]) => (
              <section key={day} className="mb-2 last:mb-0">
                <h2 className="px-2 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{friendlyDay(fromDateKey(day))}</h2>
                <ul>{items.map((t) => <TxnRow key={t.id} t={t} onOpen={() => openTransaction(t)} catName={catOf(t.category_id)?.name} catColor={catOf(t.category_id)?.color} />)}</ul>
              </section>
            ))}
          </Card>
        </div>
      )}

      {tab === 'bills' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Contas a pagar" icon={<CalendarClock />} />
            {payables.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma conta pendente. Tudo em dia!</p> : (
              <ul className="-mx-2 space-y-1">
                {payables.map((t) => {
                  const late = t.occurred_on < today
                  return (
                    <li key={t.id} className="flex items-center gap-2">
                      <button className="min-w-0 flex-1 rounded-xl px-2 py-2 text-left hover:bg-muted/60" onClick={() => openTransaction(t)}>
                        <span className="block truncate text-[15px]">{t.description}</span>
                        <span className={cn('text-xs', late ? 'font-medium text-danger' : 'text-muted-foreground')}>{late ? 'Venceu' : 'Vence'} {friendlyDay(fromDateKey(t.occurred_on)).toLowerCase()} · {formatBRL(t.amount_cents)}</span>
                      </button>
                      <Button size="sm" variant="outline" onClick={() => markPaid(t)}>Paguei</Button>
                    </li>
                  )
                })}
              </ul>
            )}
            {receivables.length > 0 && (
              <>
                <h3 className="mt-5 mb-1 text-sm font-semibold">A receber</h3>
                <ul className="-mx-2 space-y-1">
                  {receivables.map((t) => (
                    <li key={t.id} className="flex items-center gap-2">
                      <button className="min-w-0 flex-1 rounded-xl px-2 py-2 text-left hover:bg-muted/60" onClick={() => openTransaction(t)}>
                        <span className="block truncate text-[15px]">{t.description}</span>
                        <span className="text-xs text-muted-foreground">{friendlyDay(fromDateKey(t.occurred_on))} · {formatBRL(t.amount_cents)}</span>
                      </button>
                      <Button size="sm" variant="outline" onClick={() => markPaid(t)}>Recebi</Button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
          <Card>
            <CardHeader title="Contas fixas e recorrentes" icon={<Repeat />} action={<Button size="sm" variant="outline" onClick={() => setRec({ open: true, item: null })}><Plus />Nova</Button>} />
            {recs.length === 0 ? <p className="text-sm text-muted-foreground">Cadastre aluguel, salário, assinaturas e contas que se repetem. O app cria os lançamentos sozinho.</p> : (
              <ul className="-mx-2">
                {recs.map((r) => (
                  <li key={r.id}>
                    <button onClick={() => setRec({ open: true, item: r })} className={cn('flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-muted/60', !r.active && 'opacity-60')}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px]">{r.description}</span>
                        <span className="text-xs text-muted-foreground">{freqLabel(r.freq, r.interval_count)} · desde {fmt(fromDateKey(r.start_date), "d 'de' MMM")}{!r.active ? ' · pausada' : ''}</span>
                      </span>
                      <span className="text-[15px] font-semibold tabular-nums">{r.kind === 'income' ? '+' : '−'} {formatBRL(r.amount_cents)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === 'budget' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Orçamento total do mês" icon={<PiggyBank />} action={prevHasBudgets ? <Button size="sm" variant="ghost" onClick={copyBudgets}><Copy />Copiar do mês anterior</Button> : undefined} />
            <BudgetInput key={`total-${monthKey(month)}-${totalBudget?.amount_cents}`} initial={totalBudget?.amount_cents} onSave={(v) => setBudget(null, v)} label="Orçamento total" />
            <p className="mt-2 text-sm text-muted-foreground">Gasto até agora: {formatBRL(tot.expense)}{tot.pendingExpense ? ` + ${formatBRL(tot.pendingExpense)} a pagar` : ''}.</p>
          </Card>
          <Card>
            <CardHeader title="Por categoria" />
            <p className="-mt-2 mb-3 text-sm text-muted-foreground">Defina limites só para as categorias que quer acompanhar de perto.</p>
            <ul className="divide-y">
              {cats.filter((c) => c.kind === 'expense').map((c) => {
                const spent = monthTx.filter((t) => t.kind === 'expense' && t.category_id === c.id).reduce((s, t) => s + t.amount_cents, 0)
                const b = catBudgets.get(c.id)
                const pct = b ? Math.min(100, (spent / b) * 100) : 0
                return (
                  <li key={c.id} className="grid grid-cols-[1fr_9rem] items-center gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px]">{c.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{formatBRL(spent)}{b ? ` de ${formatBRL(b)}` : ' gastos'}</p>
                      {b ? <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full', spent > b ? 'bg-danger' : 'bg-primary')} style={{ width: `${pct}%` }} /></div> : null}
                    </div>
                    <BudgetInput key={`${c.id}-${monthKey(month)}-${b}`} initial={b} onSave={(v) => setBudget(c.id, v)} label={`Orçamento de ${c.name}`} compact />
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      )}

      {tab === 'goals' && (
        <div>
          <div className="mb-4 flex justify-end"><Button variant="outline" onClick={() => setGoal({ open: true, item: null })}><Plus />Nova meta</Button></div>
          {goals.length === 0 ? (
            <Card><EmptyState icon={<Target />} title="Qual é o seu próximo sonho?" text="Uma viagem, uma reserva, um curso. Defina o valor e acompanhe cada passo." action={<Button onClick={() => setGoal({ open: true, item: null })}><Plus />Criar meta</Button>} /></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {goals.map((g) => {
                const pct = Math.min(100, Math.round((g.saved_cents / g.target_cents) * 100))
                const hex = colorOf(g.color).hex
                return (
                  <Card key={g.id} className="flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <button className="text-left" onClick={() => setGoal({ open: true, item: g })}>
                        <p className="font-semibold">{g.name}</p>
                        <p className="text-xs text-muted-foreground">{g.deadline ? `Até ${fmt(fromDateKey(g.deadline), "d 'de' MMM 'de' yyyy")}` : 'Sem prazo'}</p>
                      </button>
                      {g.achieved_at && <Badge color="sage">Conquistada</Badge>}
                    </div>
                    <p className="mt-4 text-2xl font-semibold tabular-nums">{formatBRL(g.saved_cents)}</p>
                    <p className="text-sm text-muted-foreground">de {formatBRL(g.target_cents)} · {pct}%</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso de ${g.name}`}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: hex }} />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => setDeposit(g)}><PiggyBank />Guardar</Button>
                      <Button size="sm" variant="outline" onClick={() => setGoal({ open: true, item: g })}>Editar</Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      <FinanceSettings open={settings} onOpenChange={setSettings} />
      <RecurringForm open={rec.open} onOpenChange={(o) => setRec((r) => ({ ...r, open: o }))} item={rec.item} />
      <GoalForm open={goal.open} onOpenChange={(o) => setGoal((g) => ({ ...g, open: o }))} item={goal.item} />
      <GoalDeposit goal={deposit} open={!!deposit} onOpenChange={(o) => !o && setDeposit(null)} />
    </div>
  )
}

function BudgetInput({ initial, onSave, label, compact }: { initial?: number; onSave: (v: string) => void; label: string; compact?: boolean }) {
  const [v, setV] = useState(centsToInput(initial))
  const changed = (parseBRL(v) ?? 0) !== (initial ?? 0)
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); onSave(v) }}>
      <MoneyInput value={v} onChange={(e) => setV(e.target.value)} aria-label={label} className={compact ? 'h-10' : undefined} onBlur={() => changed && onSave(v)} />
      {!compact && <Button type="submit" variant="outline" disabled={!changed}>Salvar</Button>}
    </form>
  )
}
