import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Archive, Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { Confirm } from '@/components/ui/confirm'
import { useTableMutations } from '@/hooks/useData'
import { HABIT_ICONS } from '@/lib/habitIcons'
import { COLOR_OPTIONS } from '@/lib/colors'
import { WEEKDAYS_SHORT } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Habit } from '@/data/types'

const schema = z.object({
  name: z.string().trim().min(1, 'Dê um nome ao hábito').max(80),
  icon: z.string(),
  color: z.string(),
  days_of_week: z.array(z.number()).min(1, 'Escolha pelo menos um dia'),
  target_per_day: z.coerce.number().int().min(1, 'Mínimo 1').max(50, 'Máximo 50'),
  unit: z.string().max(20).optional(),
  period: z.enum(['morning', 'afternoon', 'evening', 'anytime']),
})
type FormIn = z.input<typeof schema>
type FormOut = z.output<typeof schema>

export const HABIT_SUGGESTIONS: Partial<Habit>[] = [
  { name: 'Beber água', icon: 'glass-water', color: 'sky', target_per_day: 8, unit: 'copos' },
  { name: 'Praticar exercícios', icon: 'dumbbell', color: 'sage', days_of_week: [1, 3, 5] },
  { name: 'Ler', icon: 'book-open', color: 'lavender', period: 'evening' },
  { name: 'Estudar', icon: 'pen-line', color: 'sand' },
  { name: 'Meditar', icon: 'brain', color: 'mint', period: 'morning' },
  { name: 'Dormir melhor', icon: 'bed-double', color: 'lavender', period: 'evening' },
  { name: 'Cuidar da pele', icon: 'sparkles', color: 'rose', period: 'evening' },
  { name: 'Organizar a casa', icon: 'home', color: 'sage' },
]

export function HabitForm({ open, onOpenChange, habit, defaults }: {
  open: boolean; onOpenChange: (o: boolean) => void; habit?: Habit | null; defaults?: Partial<Habit>
}) {
  const { create, update, remove } = useTableMutations('habits')
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(schema) })

  const fill = (h: Partial<Habit>) => reset({
    name: h.name ?? '', icon: h.icon ?? 'sparkles', color: h.color ?? 'sage',
    days_of_week: h.days_of_week ?? [0, 1, 2, 3, 4, 5, 6], target_per_day: h.target_per_day ?? 1,
    unit: h.unit ?? '', period: h.period ?? 'anytime',
  })
  useEffect(() => { if (open) fill(habit ?? defaults ?? {}) // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, habit?.id])

  const onSubmit = async (v: FormOut) => {
    setSaving(true)
    const row = { ...v, unit: v.unit?.trim() || null, days_of_week: [...v.days_of_week].sort() }
    try {
      if (habit) await update.mutateAsync({ id: habit.id, patch: row, success: 'Hábito atualizado.' })
      else await create.mutateAsync({ row, success: 'Hábito criado! Um passo de cada vez.' })
      onOpenChange(false)
    } catch { /* aviso já exibido */ } finally { setSaving(false) }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={habit ? 'Editar hábito' : 'Novo hábito'}
      footer={<>
        {habit && <>
          <Confirm title="Excluir hábito?" text="O hábito e todo o histórico dele serão excluídos. Se quiser só pausar, arquive."
            onConfirm={() => { remove.mutate({ id: habit.id, success: 'Hábito excluído.' }); onOpenChange(false) }}
            trigger={<Button variant="ghost" size="icon" aria-label="Excluir hábito" className="text-danger"><Trash2 /></Button>} />
          <Button variant="ghost" size="icon" aria-label={habit.archived_at ? 'Reativar hábito' : 'Arquivar hábito'} title={habit.archived_at ? 'Reativar' : 'Arquivar'}
            onClick={() => { update.mutate({ id: habit.id, patch: { archived_at: habit.archived_at ? null : new Date().toISOString() }, success: habit.archived_at ? 'Hábito reativado.' : 'Hábito arquivado. O histórico foi mantido.' }); onOpenChange(false) }}>
            <Archive />
          </Button>
        </>}
        <Button variant="secondary" className="ml-auto" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button type="submit" form="habit-form" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
      </>}>
      <form id="habit-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-1" noValidate>
        {!habit && (
          <div>
            <p className="mb-2 text-sm font-medium text-foreground/85">Sugestões</p>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {HABIT_SUGGESTIONS.map((s) => (
                <button type="button" key={s.name} onClick={() => fill(s)} className="h-9 shrink-0 rounded-full border bg-card px-3 text-sm hover:bg-muted">{s.name}</button>
              ))}
            </div>
          </div>
        )}
        <Field label="Nome" error={errors.name?.message}>{(p) => <Input {...p} {...register('name')} placeholder="Ex.: Beber água" />}</Field>

        <Controller control={control} name="icon" render={({ field }) => (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground/85">Ícone</legend>
            <div className="grid grid-cols-8 gap-1.5">
              {Object.entries(HABIT_ICONS).map(([k, { icon: I, label }]) => (
                <button type="button" key={k} aria-label={label} aria-pressed={field.value === k} onClick={() => field.onChange(k)}
                  className={cn('grid aspect-square place-items-center rounded-xl border transition', field.value === k ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                  <I className="size-5" />
                </button>
              ))}
            </div>
          </fieldset>
        )} />

        <Controller control={control} name="color" render={({ field }) => (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground/85">Cor</legend>
            <div className="flex flex-wrap gap-2">
              {Object.entries(COLOR_OPTIONS).map(([k, c]) => (
                <button type="button" key={k} aria-label={c.label} aria-pressed={field.value === k} onClick={() => field.onChange(k)}
                  className={cn('size-9 rounded-full ring-offset-2 ring-offset-card transition', c.dot, field.value === k && 'ring-2 ring-foreground/60')} />
              ))}
            </div>
          </fieldset>
        )} />

        <Controller control={control} name="days_of_week" render={({ field }) => (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground/85">Dias</legend>
            <div className="flex gap-1.5">
              {WEEKDAYS_SHORT.map((d, i) => {
                const on = field.value?.includes(i)
                return (
                  <button type="button" key={d} aria-pressed={on} onClick={() => field.onChange(on ? field.value.filter((x) => x !== i) : [...(field.value ?? []), i])}
                    className={cn('h-10 flex-1 rounded-xl border text-xs font-semibold transition', on ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                    {d}
                  </button>
                )
              })}
            </div>
            <div className="mt-2 flex gap-3 text-xs">
              <button type="button" className="text-primary hover:underline" onClick={() => setValue('days_of_week', [0, 1, 2, 3, 4, 5, 6])}>Todos os dias</button>
              <button type="button" className="text-primary hover:underline" onClick={() => setValue('days_of_week', [1, 2, 3, 4, 5])}>Dias úteis</button>
            </div>
            {errors.days_of_week && <p className="mt-1 text-xs text-danger" role="alert">{errors.days_of_week.message}</p>}
          </fieldset>
        )} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Meta por dia" error={errors.target_per_day?.message}>{(p) => <Input type="number" min={1} max={50} inputMode="numeric" {...p} {...register('target_per_day')} />}</Field>
          <Field label="Unidade" hint="Opcional: copos, páginas…">{(p) => <Input {...p} {...register('unit')} />}</Field>
          <Field label="Momento do dia" className="col-span-2">{(p) => (
            <Select {...p} {...register('period')}>
              <option value="morning">Manhã</option><option value="afternoon">Tarde</option>
              <option value="evening">Noite</option><option value="anytime">Ao longo do dia</option>
            </Select>)}
          </Field>
        </div>
      </form>
    </Sheet>
  )
}
