import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Confirm } from '@/components/ui/confirm'
import { useTableMutations } from '@/hooks/useData'
import { WEEKDAYS_SHORT } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Meal } from '@/data/types'

const ALL = [0, 1, 2, 3, 4, 5, 6]

export function MealForm({ open, onOpenChange, meal, nextPosition = 0 }: { open: boolean; onOpenChange: (o: boolean) => void; meal?: Meal | null; nextPosition?: number }) {
  const { create, update, remove } = useTableMutations('meals')
  const [name, setName] = useState('')
  const [time, setTime] = useState('')
  const [planned, setPlanned] = useState('')
  const [days, setDays] = useState<number[]>(ALL)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!open) return
    setName(meal?.name ?? ''); setTime(meal?.time ?? ''); setPlanned(meal?.planned ?? ''); setDays(meal?.days_of_week ?? ALL); setError('')
  }, [open, meal?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!name.trim()) return setError('Dê um nome (ex.: Almoço).')
    if (!days.length) return setError('Escolha pelo menos um dia.')
    const row: Partial<Meal> = { name: name.trim(), time: time || null, planned: planned.trim() || null, days_of_week: [...days].sort() }
    setSaving(true)
    try {
      if (meal) await update.mutateAsync({ id: meal.id, patch: row, success: 'Refeição atualizada.' })
      else await create.mutateAsync({ row: { ...row, position: nextPosition }, success: 'Refeição adicionada ao plano.' })
      onOpenChange(false)
    } catch { /* aviso já exibido */ } finally { setSaving(false) }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={meal ? 'Editar refeição do plano' : 'Nova refeição no plano'}
      footer={<>
        {meal && <Confirm title="Tirar do plano?" text="Os registros antigos desta refeição continuam no histórico."
          onConfirm={() => { remove.mutate({ id: meal.id, success: 'Refeição removida do plano.' }); onOpenChange(false) }}
          trigger={<Button variant="ghost" size="icon" aria-label="Remover refeição" className="text-danger"><Trash2 /></Button>} />}
        <Button variant="secondary" className="ml-auto" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
      </>}>
      <div className="space-y-5 pt-1">
        <div className="grid grid-cols-[1fr_8rem] gap-3">
          <Field label="Nome" error={error && !name.trim() ? error : undefined}>{(p) => <Input {...p} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Almoço" />}</Field>
          <Field label="Horário">{(p) => <Input type="time" {...p} value={time} onChange={(e) => setTime(e.target.value)} />}</Field>
        </div>
        <Field label="O que planeja comer" hint="Opcional. Ex.: o que a nutricionista passou.">{(p) => <Textarea {...p} value={planned} maxLength={1000} onChange={(e) => setPlanned(e.target.value)} placeholder="Ex.: 2 ovos mexidos, 1 fruta e café sem açúcar" className="min-h-20" />}</Field>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground/85">Dias</legend>
          <div className="flex gap-1.5">
            {WEEKDAYS_SHORT.map((d, i) => {
              const on = days.includes(i)
              return (
                <button type="button" key={d} aria-pressed={on} onClick={() => setDays(on ? days.filter((x) => x !== i) : [...days, i])}
                  className={cn('h-10 flex-1 rounded-xl border text-xs font-semibold transition', on ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>{d}</button>
              )
            })}
          </div>
          <div className="mt-2 flex gap-3 text-xs">
            <button type="button" className="text-primary hover:underline" onClick={() => setDays(ALL)}>Todos os dias</button>
            <button type="button" className="text-primary hover:underline" onClick={() => setDays([1, 2, 3, 4, 5])}>Dias úteis</button>
            <button type="button" className="text-primary hover:underline" onClick={() => setDays([0, 6])}>Fim de semana</button>
          </div>
          {error && name.trim() && <p className="mt-1 text-xs text-danger" role="alert">{error}</p>}
        </fieldset>
      </div>
    </Sheet>
  )
}
