import { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Confirm } from '@/components/ui/confirm'
import { Segmented } from '@/components/ui/misc'
import { useTable, useTableMutations } from '@/hooks/useData'
import { fromDateKey, todayKey } from '@/lib/dates'
import { mealsForDay, STATUS_LABEL } from '@/lib/food'
import type { MealLog, MealStatus } from '@/data/types'
import { useMealLog } from './useMealLog'

export function MealLogForm({ open, onOpenChange, item, defaults }: {
  open: boolean; onOpenChange: (o: boolean) => void; item?: MealLog | null; defaults?: Partial<MealLog>
}) {
  const { data: meals = [] } = useTable('meals')
  const { data: logs = [] } = useTable('meal_logs')
  const { update, remove } = useTableMutations('meal_logs')
  const { save: upsert } = useMealLog()
  const [date, setDate] = useState(todayKey())
  const [mealId, setMealId] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<MealStatus>('as_planned')
  const [description, setDescription] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const dayMeals = useMemo(() => mealsForDay(meals, fromDateKey(date)), [meals, date])

  const fill = (l: Partial<MealLog>) => {
    setDate(l.log_date ?? todayKey()); setMealId(l.meal_id ?? ''); setName(l.name ?? '')
    setStatus(l.status ?? (l.meal_id ? 'as_planned' : 'different')); setDescription(l.description ?? '')
    setTime(l.time ?? ''); setNotes(l.notes ?? ''); setError('')
  }
  useEffect(() => {
    if (!open) return
    if (item) return fill(item)
    // se já existe registro dessa refeição no dia, edita ele
    const existing = defaults?.meal_id ? logs.find((l) => l.meal_id === defaults.meal_id && l.log_date === (defaults.log_date ?? todayKey())) : null
    fill(existing ?? defaults ?? {})
  }, [open, item?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const meal = meals.find((m) => m.id === mealId)
  const pickMeal = (id: string) => {
    setMealId(id)
    const m = meals.find((x) => x.id === id)
    if (m) { setName(m.name); if (status === 'as_planned') setDescription(m.planned ?? '') } else setStatus('different')
  }
  const pickStatus = (s: MealStatus) => {
    setStatus(s)
    if (s === 'as_planned' && meal && !description.trim()) setDescription(meal.planned ?? '')
  }

  const save = async () => {
    const finalName = (meal?.name ?? name).trim()
    if (!finalName) return setError('Dê um nome (ex.: Lanche, Café).')
    const row: Partial<MealLog> = {
      log_date: date, meal_id: mealId || null, name: finalName, status: mealId ? status : 'different',
      description: status === 'skipped' ? null : description.trim() || null, time: time || null, notes: notes.trim() || null,
    }
    setSaving(true)
    try {
      if (item && (item.meal_id ?? '') === (row.meal_id ?? '') && item.log_date === row.log_date) await update.mutateAsync({ id: item.id, patch: row, success: 'Refeição atualizada.' })
      else {
        if (item) await remove.mutateAsync({ id: item.id, silent: true })
        await upsert(row, 'Refeição registrada.')
      }
      onOpenChange(false)
    } catch { /* aviso já exibido */ } finally { setSaving(false) }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={item ? 'Editar refeição' : 'Registrar refeição'}
      footer={<>
        {item && <Confirm title="Excluir registro?" onConfirm={() => { remove.mutate({ id: item.id, success: 'Registro excluído.' }); onOpenChange(false) }}
          trigger={<Button variant="ghost" size="icon" aria-label="Excluir registro" className="text-danger"><Trash2 /></Button>} />}
        <Button variant="secondary" className="ml-auto" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
      </>}>
      <div className="space-y-5 pt-1">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">{(p) => <Input type="date" {...p} value={date} max={todayKey()} onChange={(e) => setDate(e.target.value || todayKey())} />}</Field>
          <Field label="Hora">{(p) => <Input type="time" {...p} value={time} onChange={(e) => setTime(e.target.value)} />}</Field>
          <Field label="Refeição" className="col-span-2">{(p) => (
            <Select {...p} value={mealId} onChange={(e) => pickMeal(e.target.value)}>
              <option value="">Fora do plano (lanche, beliscada…)</option>
              {dayMeals.map((m) => <option key={m.id} value={m.id}>{m.time ? `${m.time} · ` : ''}{m.name}</option>)}
            </Select>)}
          </Field>
          {!mealId && <Field label="Nome" className="col-span-2" error={error || undefined}>{(p) => <Input {...p} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Lanche, Café com amigas" />}</Field>}
        </div>
        {meal?.planned && <p className="rounded-xl bg-muted/60 p-3 text-sm"><span className="text-muted-foreground">Planejado: </span>{meal.planned}</p>}
        {mealId && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground/85">Como foi?</legend>
            <Segmented className="w-full" label="Como foi" value={status} onChange={pickStatus}
              options={(['as_planned', 'different', 'skipped'] as MealStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
          </fieldset>
        )}
        {status !== 'skipped' && <Field label="O que comeu" hint="Opcional. Sem contar calorias: só para você se lembrar.">{(p) => <Textarea {...p} value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: arroz, feijão, frango e salada" className="min-h-20" />}</Field>}
        <Field label="Como se sentiu / anotações">{(p) => <Input {...p} value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional: com muita fome, satisfeita, comi rápido…" />}</Field>
      </div>
    </Sheet>
  )
}
