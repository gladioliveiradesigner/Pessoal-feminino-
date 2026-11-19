import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { addHours, format, parseISO } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Confirm } from '@/components/ui/confirm'
import { CategorySelect, FreqSelectOptions } from '@/features/shared/CategorySelect'
import { useTableMutations } from '@/hooks/useData'
import { REMINDER_OPTIONS } from '@/lib/domain'
import type { EventRow } from '@/data/types'

const schema = z.object({
  title: z.string().trim().min(1, 'Dê um nome ao compromisso').max(140),
  date: z.string().min(1, 'Escolha a data'),
  end_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  all_day: z.boolean(),
  location: z.string().max(200).optional(),
  description: z.string().max(4000).optional(),
  category_id: z.string().optional(),
  recurrence_freq: z.string().optional(),
  recurrence_interval: z.coerce.number().int().min(1).max(365),
  recurrence_until: z.string().optional(),
  reminder: z.string().optional(),
}).superRefine((v, ctx) => {
  if (!v.all_day && !v.start_time) ctx.addIssue({ code: 'custom', path: ['start_time'], message: 'Informe o horário' })
  const s = toStart(v), e = toEnd(v)
  if (s && e && e < s) ctx.addIssue({ code: 'custom', path: ['end_time'], message: 'O fim precisa ser depois do início' })
  if (v.recurrence_until && v.recurrence_until < v.date) ctx.addIssue({ code: 'custom', path: ['recurrence_until'], message: 'Deve ser depois da data inicial' })
})

type FormIn = z.input<typeof schema>
type FormOut = z.output<typeof schema>

function toStart(v: Pick<FormOut, 'date' | 'start_time' | 'all_day'>) {
  if (!v.date) return null
  return new Date(`${v.date}T${v.all_day ? '00:00' : v.start_time || '00:00'}`)
}
function toEnd(v: Pick<FormOut, 'date' | 'end_date' | 'start_time' | 'end_time' | 'all_day'>) {
  if (!v.date) return null
  const d = v.end_date || v.date
  if (v.all_day) return new Date(`${d}T23:59`)
  if (!v.end_time) return v.start_time ? addHours(new Date(`${v.date}T${v.start_time}`), 1) : null
  return new Date(`${d}T${v.end_time}`)
}

export function EventForm({ open, onOpenChange, event, defaults }: {
  open: boolean; onOpenChange: (o: boolean) => void; event?: EventRow | null; defaults?: Partial<EventRow>
}) {
  const { create, update, remove } = useTableMutations('events')
  const [saving, setSaving] = useState(false)
  const form = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(schema) })
  const { register, handleSubmit, reset, watch, formState: { errors } } = form
  const allDay = watch('all_day')
  const freq = watch('recurrence_freq')

  useEffect(() => {
    if (!open) return
    let e: Partial<EventRow> = event ?? defaults ?? {}
    if (!e.starts_at) {
      const s = new Date(); s.setMinutes(0, 0, 0); s.setHours(s.getHours() + 1)
      e = { ...e, starts_at: s.toISOString(), ends_at: addHours(s, 1).toISOString() }
    }
    const start = e.starts_at ? parseISO(e.starts_at) : null
    const end = e.ends_at ? parseISO(e.ends_at) : null
    const sameDay = start && end && format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')
    reset({
      title: e.title ?? '',
      date: start ? format(start, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      end_date: end && !sameDay ? format(end, 'yyyy-MM-dd') : '',
      start_time: start && !e.all_day ? format(start, 'HH:mm') : '',
      end_time: end && !e.all_day ? format(end, 'HH:mm') : '',
      all_day: e.all_day ?? false,
      location: e.location ?? '', description: e.description ?? '', category_id: e.category_id ?? '',
      recurrence_freq: e.recurrence_freq ?? '', recurrence_interval: e.recurrence_interval ?? 1,
      recurrence_until: e.recurrence_until ?? '',
      reminder: e.reminder_minutes?.length ? String(e.reminder_minutes[0]) : '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event?.id])

  const onSubmit = async (v: FormOut) => {
    setSaving(true)
    const row: Partial<EventRow> = {
      title: v.title, all_day: v.all_day,
      starts_at: toStart(v)!.toISOString(), ends_at: toEnd(v)!.toISOString(),
      location: v.location?.trim() || null, description: v.description?.trim() || null,
      category_id: v.category_id || null,
      recurrence_freq: (v.recurrence_freq || null) as EventRow['recurrence_freq'],
      recurrence_interval: v.recurrence_interval, recurrence_until: v.recurrence_freq ? v.recurrence_until || null : null,
      reminder_minutes: v.reminder ? [Number(v.reminder)] : [],
    }
    try {
      if (event) await update.mutateAsync({ id: event.id, patch: row, success: 'Compromisso atualizado.' })
      else await create.mutateAsync({ row, success: 'Compromisso criado!' })
      onOpenChange(false)
    } catch { /* aviso já exibido */ } finally { setSaving(false) }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={event ? 'Editar compromisso' : 'Novo compromisso'}
      description={event?.recurrence_freq ? 'As alterações valem para todas as repetições.' : undefined}
      footer={<>
        {event && (
          <Confirm title="Excluir compromisso?" text={event.recurrence_freq ? 'Todas as repetições serão excluídas.' : undefined}
            onConfirm={() => { remove.mutate({ id: event.id, success: 'Compromisso excluído.' }); onOpenChange(false) }}
            trigger={<Button variant="ghost" size="icon" aria-label="Excluir compromisso" className="text-danger"><Trash2 /></Button>} />
        )}
        <Button variant="secondary" className="ml-auto" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button type="submit" form="event-form" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
      </>}>
      <form id="event-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1" noValidate>
        <Field label="Título" error={errors.title?.message}>{(p) => <Input {...p} {...register('title')} autoFocus placeholder="Ex.: Dentista" />}</Field>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="size-5 accent-[var(--primary)]" {...register('all_day')} /> Dia inteiro
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" error={errors.date?.message}>{(p) => <Input type="date" {...p} {...register('date')} />}</Field>
          <Field label="Data final" hint="Só se terminar outro dia">{(p) => <Input type="date" {...p} {...register('end_date')} />}</Field>
          {!allDay && <>
            <Field label="Início" error={errors.start_time?.message}>{(p) => <Input type="time" {...p} {...register('start_time')} />}</Field>
            <Field label="Fim" error={errors.end_time?.message} hint="Padrão: 1 hora">{(p) => <Input type="time" {...p} {...register('end_time')} />}</Field>
          </>}
          <Field label="Categoria">{(p) => <CategorySelect {...p} {...register('category_id')} />}</Field>
          <Field label="Lembrete">{(p) => (
            <Select {...p} {...register('reminder')}>{REMINDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>)}
          </Field>
          <Field label="Repetir">{(p) => <Select {...p} {...register('recurrence_freq')}><FreqSelectOptions /></Select>}</Field>
          {freq ? <Field label="A cada">{(p) => <Input type="number" min={1} inputMode="numeric" {...p} {...register('recurrence_interval')} />}</Field> : <div />}
          {freq && <Field label="Repetir até" hint="Opcional" error={errors.recurrence_until?.message} className="col-span-2">{(p) => <Input type="date" {...p} {...register('recurrence_until')} />}</Field>}
        </div>
        <Field label="Local">{(p) => <Input {...p} {...register('location')} placeholder="Endereço ou link" />}</Field>
        <Field label="Descrição">{(p) => <Textarea {...p} {...register('description')} />}</Field>
        <p className="text-xs text-muted-foreground">Os lembretes aparecem em “Meu dia”. Avisos no celular chegam na fase de notificações.</p>
      </form>
    </Sheet>
  )
}
