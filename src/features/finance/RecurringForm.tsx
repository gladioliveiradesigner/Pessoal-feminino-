import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { Confirm } from '@/components/ui/confirm'
import { Segmented, Switch } from '@/components/ui/misc'
import { useTable, useTableMutations } from '@/hooks/useData'
import { centsToInput, parseBRL } from '@/lib/money'
import { todayKey } from '@/lib/dates'
import type { RecurringTransaction } from '@/data/types'
import { MoneyInput } from './MoneyInput'

const schema = z.object({
  kind: z.enum(['income', 'expense']),
  amount: z.string().refine((v) => (parseBRL(v) ?? 0) > 0, 'Informe um valor maior que zero'),
  description: z.string().trim().min(1, 'Descreva').max(140),
  freq: z.enum(['weekly', 'monthly', 'yearly']),
  start_date: z.string().min(1, 'Escolha a data'),
  end_date: z.string().optional(),
  category_id: z.string().optional(),
  payment_method_id: z.string().optional(),
  active: z.boolean(),
}).refine((v) => !v.end_date || v.end_date >= v.start_date, { message: 'Deve ser depois do início', path: ['end_date'] })
type F = z.infer<typeof schema>

/** Contas fixas e receitas recorrentes. Alterações valem para os próximos lançamentos. */
export function RecurringForm({ open, onOpenChange, item }: { open: boolean; onOpenChange: (o: boolean) => void; item?: RecurringTransaction | null }) {
  const { data: cats = [] } = useTable('finance_categories')
  const { data: methods = [] } = useTable('payment_methods')
  const { create, update, remove } = useTableMutations('recurring_transactions')
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<F>({ resolver: zodResolver(schema) })
  const kind = watch('kind')
  const active = watch('active')

  useEffect(() => {
    if (!open) return
    const r: Partial<RecurringTransaction> = item ?? {}
    reset({
      kind: r.kind ?? 'expense', amount: centsToInput(r.amount_cents), description: r.description ?? '',
      freq: (r.freq as F['freq']) ?? 'monthly', start_date: r.start_date ?? todayKey(), end_date: r.end_date ?? '',
      category_id: r.category_id ?? '', payment_method_id: r.payment_method_id ?? '', active: r.active ?? true,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id])

  const onSubmit = async (v: F) => {
    setSaving(true)
    const row: Partial<RecurringTransaction> = {
      kind: v.kind, amount_cents: parseBRL(v.amount)!, description: v.description, freq: v.freq, interval_count: 1,
      start_date: v.start_date, end_date: v.end_date || null, category_id: v.category_id || null,
      payment_method_id: v.payment_method_id || null, active: v.active,
    }
    try {
      if (item) await update.mutateAsync({ id: item.id, patch: row, success: 'Conta fixa atualizada. Vale para os próximos lançamentos.' })
      else await create.mutateAsync({ row, success: 'Conta fixa criada!' })
      onOpenChange(false)
    } catch { /* aviso exibido */ } finally { setSaving(false) }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={item ? 'Editar conta fixa' : 'Nova conta fixa'} description="Lançamentos que se repetem, como aluguel, salário e assinaturas."
      footer={<>
        {item && <Confirm title="Excluir conta fixa?" text="Os próximos lançamentos deixam de ser criados. O histórico já registrado é mantido."
          onConfirm={() => { remove.mutate({ id: item.id, success: 'Conta fixa excluída.' }); onOpenChange(false) }}
          trigger={<Button variant="ghost" size="icon" aria-label="Excluir conta fixa" className="text-danger"><Trash2 /></Button>} />}
        <Button variant="secondary" className="ml-auto" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button type="submit" form="rec-form" disabled={saving}>Salvar</Button>
      </>}>
      <form id="rec-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1" noValidate>
        <Segmented label="Tipo" className="w-full" value={kind ?? 'expense'} onChange={(v) => { setValue('kind', v); setValue('category_id', '') }}
          options={[{ value: 'expense', label: 'Despesa' }, { value: 'income', label: 'Receita' }]} />
        <Field label="Valor" error={errors.amount?.message}>{(p) => <MoneyInput {...p} {...register('amount')} />}</Field>
        <Field label="Descrição" error={errors.description?.message}>{(p) => <Input {...p} {...register('description')} placeholder="Ex.: Aluguel" />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Repete">{(p) => <Select {...p} {...register('freq')}><option value="monthly">Todo mês</option><option value="weekly">Toda semana</option><option value="yearly">Todo ano</option></Select>}</Field>
          <Field label="Primeiro vencimento" error={errors.start_date?.message}>{(p) => <Input type="date" {...p} {...register('start_date')} />}</Field>
          <Field label="Categoria">{(p) => (
            <Select {...p} {...register('category_id')}><option value="">Sem categoria</option>
              {cats.filter((c) => c.kind === kind).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>)}
          </Field>
          <Field label="Forma de pagamento">{(p) => (
            <Select {...p} {...register('payment_method_id')}><option value="">Não informar</option>
              {methods.filter((m) => !m.archived_at).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>)}
          </Field>
          <Field label="Termina em" hint="Opcional" error={errors.end_date?.message} className="col-span-2">{(p) => <Input type="date" {...p} {...register('end_date')} />}</Field>
        </div>
        {item && (
          <label className="flex items-center justify-between gap-3 text-sm font-medium">
            {active ? 'Ativa' : 'Pausada'}
            <Switch label="Ativa" checked={!!active} onCheckedChange={(v) => setValue('active', v)} />
          </label>
        )}
      </form>
    </Sheet>
  )
}
