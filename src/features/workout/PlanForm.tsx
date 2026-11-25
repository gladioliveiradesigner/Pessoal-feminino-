import { useEffect, useState } from 'react'
import { Archive, ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Confirm } from '@/components/ui/confirm'
import { useTableMutations } from '@/hooks/useData'
import { COLOR_OPTIONS } from '@/lib/colors'
import { WEEKDAYS_SHORT } from '@/lib/dates'
import { newExercise, parseDecimal, PLAN_TEMPLATES } from '@/lib/workout'
import { cn } from '@/lib/utils'
import type { WorkoutExercise, WorkoutPlan } from '@/data/types'

export function PlanForm({ open, onOpenChange, plan, nextPosition = 0 }: {
  open: boolean; onOpenChange: (o: boolean) => void; plan?: WorkoutPlan | null; nextPosition?: number
}) {
  const { create, update, remove } = useTableMutations('workout_plans')
  const [name, setName] = useState('')
  const [color, setColor] = useState('rose')
  const [days, setDays] = useState<number[]>([])
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<WorkoutExercise[]>([])
  const [weights, setWeights] = useState<string[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const fill = (p: Partial<WorkoutPlan>) => {
    setName(p.name ?? ''); setColor(p.color ?? 'rose'); setDays(p.days_of_week ?? []); setNotes(p.notes ?? '')
    const ex = p.exercises?.length ? p.exercises : [newExercise()]
    setExercises(ex); setWeights(ex.map((e) => (e.weight_kg === null ? '' : String(e.weight_kg).replace('.', ',')))); setError('')
  }
  useEffect(() => { if (open) fill(plan ?? {}) }, [open, plan?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const setEx = (i: number, patch: Partial<WorkoutExercise>) => setExercises((es) => es.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= exercises.length) return
    const swap = <T,>(arr: T[]) => { const a = [...arr]; [a[i], a[j]] = [a[j], a[i]]; return a }
    setExercises(swap); setWeights(swap)
  }
  const removeEx = (i: number) => { setExercises((es) => es.filter((_, j) => j !== i)); setWeights((w) => w.filter((_, j) => j !== i)) }

  const save = async () => {
    if (!name.trim()) return setError('Dê um nome à ficha (ex.: Treino A).')
    const ex = exercises.map((e, i) => ({ ...e, name: e.name.trim(), weight_kg: parseDecimal(weights[i]), sets: Math.max(1, Math.min(20, Number(e.sets) || 1)) })).filter((e) => e.name)
    const row: Partial<WorkoutPlan> = { name: name.trim(), color, days_of_week: [...days].sort(), notes: notes.trim() || null, exercises: ex }
    setSaving(true)
    try {
      if (plan) await update.mutateAsync({ id: plan.id, patch: row, success: 'Ficha atualizada.' })
      else await create.mutateAsync({ row: { ...row, position: nextPosition }, success: 'Ficha criada!' })
      onOpenChange(false)
    } catch { /* aviso já exibido */ } finally { setSaving(false) }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={plan ? 'Editar ficha' : 'Nova ficha de treino'}
      footer={<>
        {plan && <>
          <Confirm title="Excluir ficha?" text="Os treinos já registrados continuam no histórico. Se quiser só pausar, arquive."
            onConfirm={() => { remove.mutate({ id: plan.id, success: 'Ficha excluída.' }); onOpenChange(false) }}
            trigger={<Button variant="ghost" size="icon" aria-label="Excluir ficha" className="text-danger"><Trash2 /></Button>} />
          <Button variant="ghost" size="icon" aria-label={plan.archived_at ? 'Reativar ficha' : 'Arquivar ficha'} title={plan.archived_at ? 'Reativar' : 'Arquivar'}
            onClick={() => { update.mutate({ id: plan.id, patch: { archived_at: plan.archived_at ? null : new Date().toISOString() }, success: plan.archived_at ? 'Ficha reativada.' : 'Ficha arquivada.' }); onOpenChange(false) }}>
            <Archive />
          </Button>
        </>}
        <Button variant="secondary" className="ml-auto" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
      </>}>
      <div className="space-y-5 pt-1">
        {!plan && (
          <div>
            <p className="mb-2 text-sm font-medium text-foreground/85">Começar de um modelo</p>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {PLAN_TEMPLATES.map((t) => (
                <button type="button" key={t.name} onClick={() => fill({ name: t.name, color: t.color, exercises: t.exercises.map((e) => newExercise(e)) })}
                  className="h-9 shrink-0 rounded-full border bg-card px-3 text-sm hover:bg-muted">{t.name}</button>
              ))}
            </div>
          </div>
        )}
        <Field label="Nome" error={error || undefined}>{(p) => <Input {...p} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Treino A · Pernas" />}</Field>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground/85">Cor</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(COLOR_OPTIONS).map(([k, c]) => (
              <button type="button" key={k} aria-label={c.label} aria-pressed={color === k} onClick={() => setColor(k)}
                className={cn('size-9 rounded-full ring-offset-2 ring-offset-card transition', c.dot, color === k && 'ring-2 ring-foreground/60')} />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground/85">Dias de fazer esta ficha <span className="font-normal text-muted-foreground">(opcional)</span></legend>
          <div className="flex gap-1.5">
            {WEEKDAYS_SHORT.map((d, i) => {
              const on = days.includes(i)
              return (
                <button type="button" key={d} aria-pressed={on} onClick={() => setDays(on ? days.filter((x) => x !== i) : [...days, i])}
                  className={cn('h-10 flex-1 rounded-xl border text-xs font-semibold transition', on ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                  {d}
                </button>
              )
            })}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Nesses dias a ficha aparece em “Treino de hoje”.</p>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground/85">Exercícios</legend>
          <ul className="space-y-2">
            {exercises.map((e, i) => (
              <li key={e.id} className="rounded-2xl border p-3">
                <div className="flex items-center gap-1">
                  <Input value={e.name} onChange={(ev) => setEx(i, { name: ev.target.value.slice(0, 80) })} placeholder="Nome do exercício" aria-label={`Exercício ${i + 1}`} className="h-9 flex-1" />
                  <Button variant="ghost" size="icon-sm" aria-label="Mover para cima" disabled={i === 0} onClick={() => move(i, -1)}><ChevronUp /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Mover para baixo" disabled={i === exercises.length - 1} onClick={() => move(i, 1)}><ChevronDown /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Remover ${e.name || 'exercício'}`} onClick={() => removeEx(i)}><X /></Button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <label className="text-xs text-muted-foreground">Séries
                    <Input type="number" min={1} max={20} inputMode="numeric" value={e.sets} onChange={(ev) => setEx(i, { sets: Number(ev.target.value) })} className="mt-1 h-9" />
                  </label>
                  <label className="text-xs text-muted-foreground">Repetições
                    <Input value={e.reps} onChange={(ev) => setEx(i, { reps: ev.target.value.slice(0, 20) })} placeholder="12" className="mt-1 h-9" />
                  </label>
                  <label className="text-xs text-muted-foreground">Carga (kg)
                    <Input inputMode="decimal" value={weights[i] ?? ''} onChange={(ev) => setWeights((w) => w.map((x, j) => (j === i ? ev.target.value : x)))} placeholder="—" className="mt-1 h-9" />
                  </label>
                </div>
              </li>
            ))}
          </ul>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => { setExercises((es) => [...es, newExercise()]); setWeights((w) => [...w, '']) }}><Plus />Adicionar exercício</Button>
        </fieldset>

        <Field label="Observações">{(p) => <Textarea {...p} value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: aquecer 10 min na esteira antes" className="min-h-20" />}</Field>
      </div>
    </Sheet>
  )
}
