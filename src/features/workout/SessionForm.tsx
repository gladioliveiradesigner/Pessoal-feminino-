import { useEffect, useState } from 'react'
import { Check, Plus, Trash2, X } from 'lucide-react'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Confirm } from '@/components/ui/confirm'
import { useTable, useTableMutations } from '@/hooks/useData'
import { todayKey, fromDateKey } from '@/lib/dates'
import { activePlans, applyLoadsToPlan, EFFORT_LABEL, parseDecimal, plansForDay, sessionFromPlan } from '@/lib/workout'
import { cn } from '@/lib/utils'
import type { WorkoutEntry, WorkoutSession } from '@/data/types'

const emptyEntry = (): WorkoutEntry => ({ exercise_id: null, name: '', sets: 3, reps: '12', weight_kg: null, done: true })

export function SessionForm({ open, onOpenChange, item, defaults }: {
  open: boolean; onOpenChange: (o: boolean) => void; item?: WorkoutSession | null; defaults?: Partial<WorkoutSession>
}) {
  const { data: plans = [] } = useTable('workout_plans')
  const { create, update, remove } = useTableMutations('workout_sessions')
  const planMut = useTableMutations('workout_plans')
  const [planId, setPlanId] = useState<string>('')
  const [name, setName] = useState('')
  const [date, setDate] = useState(todayKey())
  const [entries, setEntries] = useState<WorkoutEntry[]>([])
  const [weights, setWeights] = useState<string[]>([])
  const [duration, setDuration] = useState('')
  const [effort, setEffort] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [updatePlan, setUpdatePlan] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const fill = (s: Partial<WorkoutSession>) => {
    setPlanId(s.plan_id ?? '')
    setName(s.name ?? '')
    setDate(s.performed_on ?? todayKey())
    const es = s.entries ?? []
    setEntries(es)
    setWeights(es.map((e) => (e.weight_kg === null || e.weight_kg === undefined ? '' : String(e.weight_kg).replace('.', ','))))
    setDuration(s.duration_min ? String(s.duration_min) : '')
    setEffort(s.effort ?? null)
    setNotes(s.notes ?? '')
    setError('')
  }

  useEffect(() => {
    if (!open) return
    if (item) return fill(item)
    if (defaults) return fill(defaults)
    const today = plansForDay(plans, new Date())[0]
    fill(today ? sessionFromPlan(today, todayKey()) : { name: '', entries: [] })
  }, [open, item?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const choosePlan = (id: string) => {
    const p = plans.find((x) => x.id === id)
    if (!p) { setPlanId(''); return }
    fill({ ...sessionFromPlan(p, date), duration_min: parseDecimal(duration), effort, notes })
  }

  const setEntry = (i: number, patch: Partial<WorkoutEntry>) => setEntries((es) => es.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  const addEntry = () => { setEntries((es) => [...es, emptyEntry()]); setWeights((w) => [...w, '']) }
  const removeEntry = (i: number) => { setEntries((es) => es.filter((_, j) => j !== i)); setWeights((w) => w.filter((_, j) => j !== i)) }

  const plan = plans.find((p) => p.id === planId)
  const doneCount = entries.filter((e) => e.done).length

  const save = async () => {
    if (!name.trim()) return setError('Dê um nome ao treino (ex.: Treino A, Corrida, Pilates).')
    const dur = parseDecimal(duration)
    if (dur !== null && (dur < 1 || dur > 600)) return setError('Duração entre 1 e 600 minutos.')
    const clean = entries.map((e, i) => ({ ...e, name: e.name.trim(), weight_kg: parseDecimal(weights[i]), sets: Math.max(1, Math.min(20, Number(e.sets) || 1)) }))
      .filter((e) => e.name)
    const row: Partial<WorkoutSession> = {
      plan_id: planId || null, name: name.trim(), performed_on: date, duration_min: dur ? Math.round(dur) : null,
      effort, notes: notes.trim() || null, entries: clean,
    }
    setSaving(true)
    try {
      if (item) await update.mutateAsync({ id: item.id, patch: row, success: 'Treino atualizado.' })
      else await create.mutateAsync({ row, success: 'Treino registrado! 💪' })
      if (plan && updatePlan) await planMut.update.mutateAsync({ id: plan.id, patch: { exercises: applyLoadsToPlan(plan, clean) }, silent: true })
      onOpenChange(false)
    } catch { /* aviso já exibido */ } finally { setSaving(false) }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={item ? 'Editar treino' : 'Registrar treino'}
      description={entries.length ? `${doneCount} de ${entries.length} exercícios feitos` : undefined}
      footer={<>
        {item && <Confirm title="Excluir treino?" text="Este registro sai do histórico e da evolução."
          onConfirm={() => { remove.mutate({ id: item.id, success: 'Treino excluído.' }); onOpenChange(false) }}
          trigger={<Button variant="ghost" size="icon" aria-label="Excluir treino" className="text-danger"><Trash2 /></Button>} />}
        <Button variant="secondary" className="ml-auto" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
      </>}>
      <div className="space-y-5 pt-1">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ficha" className="col-span-2 sm:col-span-1">{(p) => (
            <Select {...p} value={planId} onChange={(e) => choosePlan(e.target.value)} disabled={!!item}>
              <option value="">Treino livre</option>
              {activePlans(plans).map((pl) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
            </Select>)}
          </Field>
          <Field label="Data" className="col-span-2 sm:col-span-1">{(p) => <Input type="date" {...p} value={date} max={todayKey()} onChange={(e) => setDate(e.target.value || todayKey())} />}</Field>
          {!planId && <Field label="Nome" className="col-span-2" error={error && !name.trim() ? error : undefined}>{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Corrida, Pilates, Funcional" />}</Field>}
        </div>

        <fieldset>
          <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium text-foreground/85">Exercícios
            {entries.length > 0 && doneCount < entries.length && <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setEntries((es) => es.map((e) => ({ ...e, done: true })))}>Marcar todos como feitos</button>}
          </legend>
          {entries.length === 0 && <p className="mb-2 text-sm text-muted-foreground">Opcional. Adicione exercícios para acompanhar as cargas.</p>}
          <ul className="space-y-2">
            {entries.map((e, i) => (
              <li key={i} className={cn('rounded-2xl border p-3 transition', e.done ? 'bg-card' : 'bg-muted/40')}>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEntry(i, { done: !e.done })} aria-pressed={e.done} aria-label={e.done ? `Desmarcar ${e.name || 'exercício'}` : `Marcar ${e.name || 'exercício'} como feito`}
                    className={cn('grid size-9 shrink-0 place-items-center rounded-full border-2 transition', e.done ? 'border-primary bg-primary text-primary-foreground' : 'border-input')}>
                    {e.done && <Check className="size-4" strokeWidth={3} />}
                  </button>
                  {e.exercise_id
                    ? <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{e.name}</span>
                    : <Input value={e.name} onChange={(ev) => setEntry(i, { name: ev.target.value })} placeholder="Nome do exercício" aria-label="Nome do exercício" className="h-9 flex-1" />}
                  <Button variant="ghost" size="icon-sm" aria-label={`Remover ${e.name || 'exercício'}`} onClick={() => removeEntry(i)}><X /></Button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 pl-11">
                  <label className="text-xs text-muted-foreground">Séries
                    <Input type="number" min={1} max={20} inputMode="numeric" value={e.sets} onChange={(ev) => setEntry(i, { sets: Number(ev.target.value) })} className="mt-1 h-9" />
                  </label>
                  <label className="text-xs text-muted-foreground">Repetições
                    <Input value={e.reps} onChange={(ev) => setEntry(i, { reps: ev.target.value.slice(0, 20) })} className="mt-1 h-9" />
                  </label>
                  <label className="text-xs text-muted-foreground">Carga (kg)
                    <Input inputMode="decimal" value={weights[i] ?? ''} onChange={(ev) => setWeights((w) => w.map((x, j) => (j === i ? ev.target.value : x)))} placeholder="—" className="mt-1 h-9" />
                  </label>
                </div>
              </li>
            ))}
          </ul>
          <Button variant="outline" size="sm" className="mt-2" onClick={addEntry}><Plus />Adicionar exercício</Button>
          {plan && !item && (
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1 size-4 accent-[var(--primary)]" checked={updatePlan} onChange={(e) => setUpdatePlan(e.target.checked)} />
              <span>Atualizar as cargas da ficha com as de hoje<span className="block text-xs text-muted-foreground">Assim o próximo treino já começa com os pesos novos.</span></span>
            </label>
          )}
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Duração (min)" error={error.startsWith('Duração') ? error : undefined}>{(p) => <Input {...p} inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Opcional" />}</Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground/85">Como foi?</legend>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} aria-pressed={effort === n} onClick={() => setEffort(effort === n ? null : n)}
                className={cn('h-10 flex-1 rounded-xl border text-xs font-semibold transition', effort === n ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                {n}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{effort ? EFFORT_LABEL[effort] : '1 = bem leve · 5 = muito puxado'}</p>
        </fieldset>
        <Field label="Anotações">{(p) => <Textarea {...p} value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: senti o joelho, aumentar carga no leg press" className="min-h-20" />}</Field>
        {error && !error.startsWith('Duração') && name.trim() && <p className="text-sm text-danger" role="alert">{error}</p>}
        {fromDateKey(date) > new Date() && <p className="text-sm text-danger">A data não pode ser no futuro.</p>}
      </div>
    </Sheet>
  )
}
