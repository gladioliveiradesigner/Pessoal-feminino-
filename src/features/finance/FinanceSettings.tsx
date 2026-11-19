import { useState } from 'react'
import { Archive, Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/field'
import { Confirm } from '@/components/ui/confirm'
import { Dot, Segmented } from '@/components/ui/misc'
import { useTable, useTableMutations } from '@/hooks/useData'
import { COLOR_OPTIONS } from '@/lib/colors'
import { PAYMENT_KIND_LABEL } from '@/lib/finance'
import { cn } from '@/lib/utils'
import type { FinanceCategory, MoneyKind, PaymentKind, PaymentMethod } from '@/data/types'

function Colors({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <div className="flex flex-wrap gap-1.5">{Object.entries(COLOR_OPTIONS).map(([k, c]) => (
    <button key={k} type="button" aria-label={c.label} aria-pressed={value === k} onClick={() => onChange(k)} className={cn('size-7 rounded-full ring-offset-2 ring-offset-card', c.dot, value === k && 'ring-2 ring-foreground/60')} />
  ))}</div>
}

function CatRow({ c, all }: { c: FinanceCategory; all: FinanceCategory[] }) {
  const { update, remove } = useTableMutations('finance_categories')
  const [edit, setEdit] = useState(false)
  const [name, setName] = useState(c.name)
  const [color, setColor] = useState(c.color)
  const dup = all.some((x) => x.id !== c.id && x.kind === c.kind && x.name.toLowerCase() === name.trim().toLowerCase())
  if (!edit) return (
    <li className="flex items-center gap-3 px-2 py-1.5"><Dot color={c.color} /><span className="flex-1">{c.name}</span>
      <Button variant="ghost" size="icon-sm" aria-label={`Editar ${c.name}`} onClick={() => setEdit(true)}><Pencil /></Button>
      <Confirm title={`Excluir “${c.name}”?`} text="Os lançamentos ficam sem categoria e o orçamento dela é removido." onConfirm={() => remove.mutate({ id: c.id, success: 'Categoria excluída.' })}
        trigger={<Button variant="ghost" size="icon-sm" aria-label={`Excluir ${c.name}`} className="text-danger"><Trash2 /></Button>} />
    </li>
  )
  return (
    <li className="space-y-2 rounded-2xl border p-3">
      <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-label="Nome" className="h-10" aria-invalid={dup} />
      {dup && <p className="text-xs text-danger">Já existe com esse nome.</p>}
      <Colors value={color} onChange={setColor} />
      <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setEdit(false)}>Cancelar</Button>
        <Button size="sm" disabled={!name.trim() || dup} onClick={() => { update.mutate({ id: c.id, patch: { name: name.trim(), color }, success: 'Categoria atualizada.' }); setEdit(false) }}><Check />Salvar</Button></div>
    </li>
  )
}

function MethodRow({ m, all }: { m: PaymentMethod; all: PaymentMethod[] }) {
  const { update, remove } = useTableMutations('payment_methods')
  const [edit, setEdit] = useState(false)
  const [name, setName] = useState(m.name)
  const [kind, setKind] = useState<PaymentKind>(m.kind)
  const dup = all.some((x) => x.id !== m.id && x.name.toLowerCase() === name.trim().toLowerCase())
  if (!edit) return (
    <li className={cn('flex items-center gap-3 px-2 py-1.5', m.archived_at && 'opacity-60')}>
      <span className="flex-1">{m.name} <span className="text-xs text-muted-foreground">· {PAYMENT_KIND_LABEL[m.kind]}{m.archived_at ? ' · arquivada' : ''}</span></span>
      <Button variant="ghost" size="icon-sm" aria-label={`Editar ${m.name}`} onClick={() => setEdit(true)}><Pencil /></Button>
      <Button variant="ghost" size="icon-sm" aria-label={m.archived_at ? `Reativar ${m.name}` : `Arquivar ${m.name}`} title={m.archived_at ? 'Reativar' : 'Arquivar'}
        onClick={() => update.mutate({ id: m.id, patch: { archived_at: m.archived_at ? null : new Date().toISOString() }, success: m.archived_at ? 'Reativada.' : 'Arquivada. O histórico é mantido.' })}><Archive /></Button>
      <Confirm title={`Excluir “${m.name}”?`} text="Os lançamentos ficam sem forma de pagamento." onConfirm={() => remove.mutate({ id: m.id, success: 'Forma de pagamento excluída.' })}
        trigger={<Button variant="ghost" size="icon-sm" aria-label={`Excluir ${m.name}`} className="text-danger"><Trash2 /></Button>} />
    </li>
  )
  return (
    <li className="space-y-2 rounded-2xl border p-3">
      <div className="flex gap-2"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-label="Nome" className="h-10" />
        <Select value={kind} onChange={(e) => setKind(e.target.value as PaymentKind)} className="h-10 w-36" aria-label="Tipo">{Object.entries(PAYMENT_KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></div>
      {dup && <p className="text-xs text-danger">Já existe com esse nome.</p>}
      <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setEdit(false)}>Cancelar</Button>
        <Button size="sm" disabled={!name.trim() || dup} onClick={() => { update.mutate({ id: m.id, patch: { name: name.trim(), kind }, success: 'Atualizada.' }); setEdit(false) }}><Check />Salvar</Button></div>
    </li>
  )
}

export function FinanceSettings({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: cats = [] } = useTable('finance_categories')
  const { data: methods = [] } = useTable('payment_methods')
  const catM = useTableMutations('finance_categories')
  const pmM = useTableMutations('payment_methods')
  const [tab, setTab] = useState<'expense' | 'income' | 'methods'>('expense')
  const [name, setName] = useState('')
  const [color, setColor] = useState('lavender')
  const [pk, setPk] = useState<PaymentKind>('credit')
  const list = tab === 'methods' ? [] : cats.filter((c) => c.kind === tab)
  const dup = tab === 'methods' ? methods.some((m) => m.name.toLowerCase() === name.trim().toLowerCase()) : list.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())
  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || dup) return
    if (tab === 'methods') pmM.create.mutate({ row: { name: name.trim(), kind: pk, position: methods.length }, success: 'Forma de pagamento criada.' })
    else catM.create.mutate({ row: { name: name.trim(), kind: tab as MoneyKind, color, position: list.length }, success: 'Categoria criada.' })
    setName('')
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Ajustes de finanças">
      <Segmented label="Seção" className="mb-3 w-full" value={tab} onChange={setTab}
        options={[{ value: 'expense', label: 'Despesas' }, { value: 'income', label: 'Receitas' }, { value: 'methods', label: 'Pagamento' }]} />
      <ul className="space-y-1">{tab === 'methods' ? methods.map((m) => <MethodRow key={m.id} m={m} all={methods} />) : list.map((c) => <CatRow key={c.id} c={c} all={cats} />)}</ul>
      <form onSubmit={add} className="mt-4 space-y-2 rounded-2xl bg-muted/50 p-3">
        <p className="text-sm font-medium">{tab === 'methods' ? 'Nova forma de pagamento' : 'Nova categoria'}</p>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="h-10" aria-label="Nome" placeholder={tab === 'methods' ? 'Ex.: Cartão Nubank' : 'Ex.: Pets'} />
          {tab === 'methods' && <Select value={pk} onChange={(e) => setPk(e.target.value as PaymentKind)} className="h-10 w-32" aria-label="Tipo">{Object.entries(PAYMENT_KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>}
          <Button type="submit" size="icon-sm" className="size-10 shrink-0" aria-label="Adicionar" disabled={!name.trim() || dup}><Plus /></Button>
        </div>
        {dup && name && <p className="text-xs text-danger">Já existe com esse nome.</p>}
        {tab !== 'methods' && <Colors value={color} onChange={setColor} />}
      </form>
    </Sheet>
  )
}
