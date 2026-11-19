import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Confirm } from '@/components/ui/confirm'
import { Segmented } from '@/components/ui/misc'
import { useTable, useTableMutations } from '@/hooks/useData'
import { useSource } from '@/auth/session'
import { useQueryClient } from '@tanstack/react-query'
import { centsToInput, parseBRL } from '@/lib/money'
import { todayKey } from '@/lib/dates'
import type { MoneyKind, Transaction } from '@/data/types'
import { MoneyInput } from './MoneyInput'

const schema = z.object({
  kind: z.enum(['income', 'expense']),
  amount: z.string().refine((v) => (parseBRL(v) ?? 0) > 0, 'Informe um valor maior que zero'),
  description: z.string().trim().min(1, 'Descreva o lançamento').max(140),
  occurred_on: z.string().min(1, 'Escolha a data'),
  category_id: z.string().optional(),
  payment_method_id: z.string().optional(),
  pending: z.boolean(),
  repeat: z.boolean(),
  notes: z.string().max(2000).optional(),
})
type F = z.infer<typeof schema>

export function TransactionForm({ open, onOpenChange, item, defaults }: {
  open: boolean; onOpenChange: (o: boolean) => void; item?: Transaction | null; defaults?: Partial<Transaction>
}) {
  const { data: cats = [] } = useTable('finance_categories')
  const { data: methods = [] } = useTable('payment_methods')
  const { create, update, remove } = useTableMutations('transactions')
  const source = useSource()
  const qc = useQueryClient()
  const [more, setMore] = useState(false)
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<F>({ resolver: zodResolver(schema) })
  const kind = watch('kind') as MoneyKind | undefined

  useEffect(() => {
    if (!open) return
    const t = item ?? defaults ?? {}
    reset({
      kind: t.kind ?? 'expense', amount: centsToInput(t.amount_cents), description: t.description ?? '',
      occurred_on: t.occurred_on ?? todayKey(), category_id: t.category_id ?? '', payment_method_id: t.payment_method_id ?? '',
      pending: t.status === 'pending', repeat: false, notes: t.notes ?? '',
    })
    setMore(!!item && !!(item.notes || item.payment_method_id || item.status === 'pending'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id])

  const onSubmit = async (v: F) => {
    setSaving(true)
    const amount_cents = parseBRL(v.amount)!
    const row: Partial<Transaction> = {
      kind: v.kind, amount_cents, description: v.description, occurred_on: v.occurred_on,
      category_id: v.category_id || null, payment_method_id: v.payment_method_id || null,
      status: v.pending ? 'pending' : 'paid', paid_at: v.pending ? null : (item?.paid_at ?? todayKey()), notes: v.notes?.trim() || null,
    }
    try {
      if (item) await update.mutateAsync({ id: item.id, patch: row, success: 'Lançamento atualizado.' })
      else if (v.repeat) {
        const rec = await source.insert('recurring_transactions', {
          kind: v.kind, description: v.description, amount_cents, category_id: row.category_id, payment_method_id: row.payment_method_id,
          freq: 'monthly', interval_count: 1, start_date: v.occurred_on,
        })
        await create.mutateAsync({ row: { ...row, recurring_id: rec.id, source: 'recurring' }, success: 'Salvo! Ele vai se repetir todo mês.' })
        qc.invalidateQueries({ queryKey: [source.kind, 'recurring_transactions'] })
      } else await create.mutateAsync({ row, success: v.kind === 'income' ? 'Receita registrada!' : 'Despesa registrada!' })
      onOpenChange(false)
    } catch { /* aviso exibido */ } finally { setSaving(false) }
  }

  const title = item ? 'Editar lançamento' : kind === 'income' ? 'Nova receita' : 'Nova despesa'
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title}
      footer={<>
        {item && (
          <Confirm title="Excluir lançamento?" onConfirm={() => { remove.mutate({ id: item.id, success: 'Lançamento excluído.' }); onOpenChange(false) }}
            text={item.recurring_id ? 'Só este mês será excluído. A repetição continua; para encerrá-la, use "Contas fixas".' : undefined}
            trigger={<Button variant="ghost" size="icon" aria-label="Excluir lançamento" className="text-danger"><Trash2 /></Button>} />
        )}
        <Button variant="secondary" className="ml-auto" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button type="submit" form="txn-form" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
      </>}>
      <form id="txn-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1" noValidate>
        <Segmented label="Tipo" className="w-full" value={kind ?? 'expense'} onChange={(v) => { setValue('kind', v); setValue('category_id', '') }}
          options={[{ value: 'expense', label: 'Despesa' }, { value: 'income', label: 'Receita' }]} />
        <Field label="Valor" error={errors.amount?.message}>{(p) => <MoneyInput big autoFocus {...p} {...register('amount')} />}</Field>
        <Field label="Descrição" error={errors.description?.message}>{(p) => <Input {...p} {...register('description')} placeholder={kind === 'income' ? 'Ex.: Salário' : 'Ex.: Mercado'} />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">{(p) => (
            <Select {...p} {...register('category_id')}>
              <option value="">Sem categoria</option>
              {cats.filter((c) => c.kind === (kind ?? 'expense')).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>)}
          </Field>
          <Field label="Data" error={errors.occurred_on?.message}>{(p) => <Input type="date" {...p} {...register('occurred_on')} />}</Field>
        </div>
        {!more ? (
          <button type="button" onClick={() => setMore(true)} className="flex items-center gap-1 text-sm font-medium text-primary"><ChevronDown className="size-4" />Mais opções</button>
        ) : (
          <div className="space-y-4">
            <Field label="Forma de pagamento">{(p) => (
              <Select {...p} {...register('payment_method_id')}>
                <option value="">Não informar</option>
                {methods.filter((m) => !m.archived_at || m.id === item?.payment_method_id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>)}
            </Field>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 size-5 accent-[var(--primary)]" {...register('pending')} />
              <span><b className="font-medium">{kind === 'income' ? 'Ainda não recebi' : 'Ainda não paguei'}</b><span className="block text-muted-foreground">{kind === 'income' ? 'Fica como valor a receber.' : 'Vira uma conta a pagar, com vencimento na data acima.'}</span></span>
            </label>
            {!item && (
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" className="mt-0.5 size-5 accent-[var(--primary)]" {...register('repeat')} />
                <span><b className="font-medium">Repetir todo mês</b><span className="block text-muted-foreground">Para salário, aluguel, assinaturas e contas fixas.</span></span>
              </label>
            )}
            <Field label="Observações">{(p) => <Textarea {...p} {...register('notes')} className="min-h-20" />}</Field>
          </div>
        )}
      </form>
    </Sheet>
  )
}
