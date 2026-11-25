import { useState } from 'react'
import { addDays, isAfter, startOfDay, subDays } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Clock3, Pencil, Plus, Salad } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, PageHeader, PageLoader, Segmented } from '@/components/ui/misc'
import { useSource } from '@/auth/session'
import { useTable } from '@/hooks/useData'
import { useEditors } from '@/features/shared/editors'
import { capitalize, fmt, friendlyDay, toDateKey, WEEKDAYS_SHORT } from '@/lib/dates'
import { byTime, dayTimeline, daySummary, MEAL_TEMPLATE } from '@/lib/food'
import type { Meal, MealLog } from '@/data/types'
import { MealForm } from './MealForm'
import { MealRow } from './MealRow'

type Tab = 'day' | 'plan' | 'week'

function DayView({ meals, logs, day, onCreatePlan }: { meals: Meal[]; logs: MealLog[]; day: Date; onCreatePlan: () => void }) {
  const { openMealLog } = useEditors()
  const key = toDateKey(day)
  const t = dayTimeline(meals, logs, day, key)
  const s = daySummary(meals, logs, day, key)
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card className="p-3 sm:p-4">
        {t.planned.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">Nenhuma refeição planejada para este dia. <button className="text-primary hover:underline" onClick={onCreatePlan}>Ajustar o plano</button></p>
        ) : <ul>{t.planned.map(({ meal, log }) => <MealRow key={meal.id} meal={meal} log={log} dateKey={key} />)}</ul>}
        {t.extras.length > 0 && (
          <>
            <p className="mt-3 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Fora do plano</p>
            <ul>
              {t.extras.map((l) => (
                <li key={l.id}>
                  <button onClick={() => openMealLog(l)} className="flex w-full items-start gap-3 rounded-2xl p-2 text-left hover:bg-muted/60">
                    <span className="w-12 shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-muted-foreground">{l.time ?? '—'}</span>
                    <span className="min-w-0 flex-1"><span className="block text-[15px] font-medium">{l.name}</span>{l.description && <span className="block text-sm text-muted-foreground">{l.description}</span>}</span>
                    <Pencil className="mt-1 size-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => openMealLog(null, { log_date: key, meal_id: null, status: 'different' })}><Plus />Algo fora do plano</Button>
      </Card>
      <Card>
        <CardHeader title="Resumo do dia" icon={<Salad />} />
        {s.planned > 0 ? (
          <>
            <p className="text-3xl font-semibold tabular-nums">{s.logged}<span className="text-lg text-muted-foreground">/{s.planned}</span></p>
            <p className="text-sm text-muted-foreground">refeições feitas{s.asPlanned ? `, ${s.asPlanned} como planejado` : ''}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-sage" style={{ width: `${(s.logged / s.planned) * 100}%` }} /></div>
          </>
        ) : <p className="text-sm text-muted-foreground">Sem plano para este dia.</p>}
        <p className="mt-4 text-xs text-muted-foreground">Aqui não tem contagem de calorias: o foco é ritmo, constância e como você se sente.</p>
      </Card>
    </div>
  )
}

function PlanView({ meals, onEdit }: { meals: Meal[]; onEdit: (m: Meal | null) => void }) {
  return (
    <Card className="p-3 sm:p-4">
      <ul>
        {[...meals].sort(byTime).map((m) => (
          <li key={m.id}>
            <button onClick={() => onEdit(m)} className="flex w-full items-start gap-3 rounded-2xl p-2 text-left hover:bg-muted/60">
              <span className="flex w-14 shrink-0 items-center gap-1 pt-0.5 text-sm font-semibold tabular-nums"><Clock3 className="size-3.5 text-muted-foreground" />{m.time ?? '—'}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">{m.name}</span>
                <span className="block text-sm text-muted-foreground">{m.planned ?? 'Sem descrição'}</span>
                <span className="block text-xs text-muted-foreground">{m.days_of_week.length === 7 ? 'Todos os dias' : m.days_of_week.map((d) => WEEKDAYS_SHORT[d]).join(', ')}</span>
              </span>
              <Pencil className="mt-1 size-4 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
      <Button variant="outline" size="sm" className="mt-2" onClick={() => onEdit(null)}><Plus />Adicionar refeição</Button>
    </Card>
  )
}

function WeekView({ meals, logs, onPick }: { meals: Meal[]; logs: MealLog[]; onPick: (d: Date) => void }) {
  const today = startOfDay(new Date())
  const days = Array.from({ length: 7 }, (_, i) => subDays(today, i))
  return (
    <Card className="p-3 sm:p-4">
      <ul>
        {days.map((d) => {
          const s = daySummary(meals, logs, d, toDateKey(d))
          return (
            <li key={toDateKey(d)}>
              <button onClick={() => onPick(d)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-muted/60">
                <span className="w-28 shrink-0 text-sm font-medium">{friendlyDay(d)}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-sage" style={{ width: s.planned ? `${(s.logged / s.planned) * 100}%` : 0 }} /></span>
                <span className="w-32 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{s.planned ? `${s.logged}/${s.planned} · ${s.asPlanned} no plano` : 'Sem plano'}{s.extras ? ` · +${s.extras}` : ''}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export function FoodPage() {
  const mealsQ = useTable('meals')
  const logsQ = useTable('meal_logs')
  const source = useSource()
  const qc = useQueryClient()
  const { openMealLog } = useEditors()
  const [tab, setTab] = useState<Tab>('day')
  const [day, setDay] = useState(startOfDay(new Date()))
  const [editing, setEditing] = useState<Meal | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  if (mealsQ.isError || logsQ.isError) return <ErrorState onRetry={() => { mealsQ.refetch(); logsQ.refetch() }} />
  if (mealsQ.isLoading || logsQ.isLoading) return <PageLoader />
  const meals = mealsQ.data ?? []
  const logs = logsQ.data ?? []
  const edit = (m: Meal | null) => { setEditing(m); setFormOpen(true) }
  const applyTemplate = async () => {
    setBusy(true)
    try {
      await source.insertMany('meals', MEAL_TEMPLATE.map((m) => ({ ...m, days_of_week: [0, 1, 2, 3, 4, 5, 6] })))
      toast.success('Plano criado! Toque em uma refeição para ajustar.')
    } catch { toast.error('Não foi possível criar o plano agora.') } finally {
      setBusy(false); qc.invalidateQueries({ queryKey: [source.kind, 'meals'] })
    }
  }
  const isToday = toDateKey(day) === toDateKey(new Date())

  return (
    <div>
      <PageHeader title="Alimentação" subtitle="Sua rotina de refeições, sem neura"
        action={<Button onClick={() => openMealLog(null, { log_date: toDateKey(day) })}><Plus />Registrar</Button>} />
      {meals.length === 0 && tab !== 'week' ? (
        <Card><EmptyState icon={<Salad />} title="Monte seu plano de refeições" text="Defina horários e o que pretende comer. Depois é só marcar ao longo do dia."
          action={<div className="flex flex-wrap justify-center gap-2">
            <Button onClick={applyTemplate} disabled={busy}>Usar modelo com 5 refeições</Button>
            <Button variant="outline" onClick={() => edit(null)}><Plus />Criar do zero</Button>
          </div>} /></Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Segmented label="Seção" value={tab} onChange={setTab}
              options={[{ value: 'day', label: 'Dia' }, { value: 'plan', label: 'Plano' }, { value: 'week', label: 'Semana' }]} />
            {tab === 'day' && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" aria-label="Dia anterior" onClick={() => setDay(subDays(day, 1))}><ChevronLeft /></Button>
                <span className="min-w-36 text-center text-sm font-semibold" aria-live="polite">{isToday ? 'Hoje' : capitalize(fmt(day, "EEE, d 'de' MMM"))}</span>
                <Button variant="ghost" size="icon-sm" aria-label="Próximo dia" disabled={isToday || isAfter(day, new Date())} onClick={() => setDay(addDays(day, 1))}><ChevronRight /></Button>
              </div>
            )}
          </div>
          {tab === 'day' && <DayView meals={meals} logs={logs} day={day} onCreatePlan={() => setTab('plan')} />}
          {tab === 'plan' && <PlanView meals={meals} onEdit={edit} />}
          {tab === 'week' && <WeekView meals={meals} logs={logs} onPick={(d) => { setDay(d); setTab('day') }} />}
        </>
      )}
      <MealForm open={formOpen} onOpenChange={setFormOpen} meal={editing} nextPosition={meals.length} />
    </div>
  )
}
