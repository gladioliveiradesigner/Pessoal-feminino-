import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, X } from 'lucide-react'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Confirm } from '@/components/ui/confirm'
import { CategorySelect, FreqSelectOptions } from '@/features/shared/CategorySelect'
import { useTable, useTableMutations } from '@/hooks/useData'
import { useSource } from '@/auth/session'
import { subtasksOf } from '@/lib/domain'
import type { Task } from '@/data/types'
import { uid } from '@/lib/utils'

const schema = z.object({
  title: z.string().trim().min(1, 'Dê um nome para a tarefa').max(200, 'Máximo de 200 caracteres'),
  notes: z.string().max(4000).optional(),
  priority: z.enum(['low', 'medium', 'high']),
  due_date: z.string().optional(),
  due_time: z.string().optional(),
  category_id: z.string().optional(),
  tags: z.string().max(300).optional(),
  recurrence_freq: z.string().optional(),
  recurrence_interval: z.coerce.number().int().min(1).max(365),
}).refine((v) => !v.recurrence_freq || v.due_date, { message: 'Defina uma data para repetir a tarefa', path: ['due_date'] })
  .refine((v) => !v.due_time || v.due_date, { message: 'Defina a data junto com o horário', path: ['due_date'] })

type FormIn = z.input<typeof schema>
type FormOut = z.output<typeof schema>
interface Sub { id?: string; key: string; title: string; done: boolean }

export function TaskForm({ open, onOpenChange, task, defaults }: {
  open: boolean; onOpenChange: (o: boolean) => void; task?: Task | null; defaults?: Partial<Task>
}) {
  const { data: all = [] } = useTable('tasks')
  const { create, update, remove } = useTableMutations('tasks')
  const source = useSource()
  const qc = useQueryClient()
  const [subs, setSubs] = useState<Sub[]>([])
  const [newSub, setNewSub] = useState('')
  const [saving, setSaving] = useState(false)

  const form = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(schema) })
  const { register, handleSubmit, reset, formState: { errors } } = form

  useEffect(() => {
    if (!open) return
    const t = task ?? defaults ?? {}
    reset({
      title: t.title ?? '', notes: t.notes ?? '', priority: t.priority ?? 'medium',
      due_date: t.due_date ?? '', due_time: t.due_time?.slice(0, 5) ?? '', category_id: t.category_id ?? '',
      tags: (t.tags ?? []).join(', '), recurrence_freq: t.recurrence_freq ?? '', recurrence_interval: t.recurrence_interval ?? 1,
    })
    setSubs(task ? subtasksOf(all, task.id).map((s) => ({ id: s.id, key: s.id, title: s.title, done: !!s.completed_at })) : [])
    setNewSub('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.id])

  const onSubmit = async (v: FormOut) => {
    setSaving(true)
    const row: Partial<Task> = {
      title: v.title, notes: v.notes?.trim() || null, priority: v.priority,
      due_date: v.due_date || null, due_time: v.due_time || null, category_id: v.category_id || null,
      tags: (v.tags ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      recurrence_freq: (v.recurrence_freq || null) as Task['recurrence_freq'], recurrence_interval: v.recurrence_interval,
    }
    try {
      const saved = task
        ? await update.mutateAsync({ id: task.id, patch: row, success: 'Tarefa atualizada.' })
        : await create.mutateAsync({ row, success: 'Tarefa criada!' })
      // sincroniza subtarefas
      const pending = newSub.trim() ? [...subs, { key: uid(), title: newSub.trim(), done: false }] : subs
      const before = task ? subtasksOf(all, task.id) : []
      await Promise.all([
        ...before.filter((b) => !pending.some((s) => s.id === b.id)).map((b) => source.remove('tasks', b.id)),
        ...pending.map((s, i) => {
          const patch = { title: s.title, position: i, completed_at: s.done ? (before.find((b) => b.id === s.id)?.completed_at ?? new Date().toISOString()) : null }
          return s.id ? source.update('tasks', s.id, patch) : source.insert('tasks', { ...patch, parent_id: saved.id })
        }),
      ])
      onOpenChange(false)
    } catch {
      // o erro já foi exibido em um aviso
    } finally {
      setSaving(false)
      qc.invalidateQueries({ queryKey: [source.kind, 'tasks'] })
    }
  }

  const addSub = () => {
    if (!newSub.trim()) return
    setSubs((s) => [...s, { key: uid(), title: newSub.trim(), done: false }])
    setNewSub('')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={task ? 'Editar tarefa' : 'Nova tarefa'}
      footer={<>
        {task && (
          <Confirm title="Excluir tarefa?" text="A tarefa e suas subtarefas serão excluídas."
            onConfirm={() => { remove.mutate({ id: task.id, success: 'Tarefa excluída.' }); onOpenChange(false) }}
            trigger={<Button variant="ghost" size="icon" aria-label="Excluir tarefa" className="text-danger"><Trash2 /></Button>} />
        )}
        <Button variant="secondary" className="ml-auto" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button type="submit" form="task-form" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
      </>}>
      <form id="task-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1" noValidate>
        <Field label="O que precisa ser feito?" error={errors.title?.message}>
          {(p) => <Input {...p} {...register('title')} autoFocus placeholder="Ex.: Marcar consulta" />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" error={errors.due_date?.message}>{(p) => <Input type="date" {...p} {...register('due_date')} />}</Field>
          <Field label="Horário">{(p) => <Input type="time" {...p} {...register('due_time')} />}</Field>
          <Field label="Prioridade">{(p) => (
            <Select {...p} {...register('priority')}>
              <option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option>
            </Select>)}
          </Field>
          <Field label="Categoria">{(p) => <CategorySelect {...p} {...register('category_id')} />}</Field>
          <Field label="Repetir">{(p) => <Select {...p} {...register('recurrence_freq')}><FreqSelectOptions /></Select>}</Field>
          <Field label="Intervalo" hint="Ex.: 2 = a cada 2">{(p) => <Input type="number" min={1} max={365} inputMode="numeric" {...p} {...register('recurrence_interval')} />}</Field>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-medium text-foreground/85">Subtarefas</legend>
          {subs.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={s.done} aria-label={`Concluir ${s.title}`}
                onChange={(e) => setSubs((arr) => arr.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))} />
              <Input value={s.title} className="h-10" aria-label="Subtarefa"
                onChange={(e) => setSubs((arr) => arr.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
              <Button variant="ghost" size="icon-sm" aria-label="Remover subtarefa" onClick={() => setSubs((arr) => arr.filter((_, j) => j !== i))}><X /></Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="Adicionar subtarefa" className="h-10" aria-label="Nova subtarefa"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSub() } }} />
            <Button variant="outline" size="icon-sm" className="size-10" aria-label="Adicionar subtarefa" onClick={addSub}><Plus /></Button>
          </div>
        </fieldset>

        <Field label="Etiquetas" hint="Separe por vírgula">{(p) => <Input {...p} {...register('tags')} placeholder="ex.: urgente, banco" />}</Field>
        <Field label="Anotações">{(p) => <Textarea {...p} {...register('notes')} placeholder="Detalhes, links, ideias…" />}</Field>
      </form>
    </Sheet>
  )
}
