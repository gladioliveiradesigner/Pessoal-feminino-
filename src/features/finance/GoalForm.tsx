import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Confirm } from '@/components/ui/confirm'
import { useTableMutations } from '@/hooks/useData'
import { centsToInput, formatBRL, parseBRL } from '@/lib/money'
import { COLOR_OPTIONS } from '@/lib/colors'
import { cn } from '@/lib/utils'
import type { SavingsGoal } from '@/data/types'
import { MoneyInput } from './MoneyInput'

export function GoalForm({ open, onOpenChange, item }: { open: boolean; onOpenChange: (o: boolean) => void; item?: SavingsGoal | null }) {
  const { create, update, remove } = useTableMutations('savings_goals')
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [saved, setSaved] = useState('')
  const [deadline, setDeadline] = useState('')
  const [color, setColor] = useState('sage')
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (!open) return
    setName(item?.name ?? ''); setTarget(centsToInput(item?.target_cents)); setSaved(centsToInput(item?.saved_cents ?? 0))
    setDeadline(item?.deadline ?? ''); setColor(item?.color ?? 'sage'); setTouched(false)
  }, [open, item])
  const t = parseBRL(target), s = parseBRL(saved) ?? 0
  const errName = touched && !name.trim() ? 'Dê um nome à meta' : undefined
  const errTarget = touched && !(t && t > 0) ? 'Informe o valor da meta' : undefined
  const save = async () => {
    setTouched(true)
    if (!name.trim() || !t) return
    const row = { name: name.trim(), target_cents: t, saved_cents: s, deadline: deadline || null, color, achieved_at: s >= t ? (item?.achieved_at ?? new Date().toISOString()) : null }
    try {
      if (item) await update.mutateAsync({ id: item.id, patch: row, success: 'Meta atualizada.' })
      else await create.mutateAsync({ row, success: 'Meta criada! Cada valor guardado conta.' })
      onOpenChange(false)
    } catch { /* aviso exibido */ }
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={item ? 'Editar meta' : 'Nova meta de economia'}
      footer={<>
        {item && <Confirm title="Excluir meta?" onConfirm={() => { remove.mutate({ id: item.id, success: 'Meta excluída.' }); onOpenChange(false) }}
          trigger={<Button variant="ghost" size="icon" aria-label="Excluir meta" className="text-danger"><Trash2 /></Button>} />}
        <Button variant="secondary" className="ml-auto" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button onClick={save}>Salvar</Button>
      </>}>
      <div className="space-y-4 pt-1">
        <Field label="Para quê?" error={errName}>{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ex.: Viagem, reserva de emergência" />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor da meta" error={errTarget}>{(p) => <MoneyInput {...p} value={target} onChange={(e) => setTarget(e.target.value)} />}</Field>
          <Field label="Já guardado">{(p) => <MoneyInput {...p} value={saved} onChange={(e) => setSaved(e.target.value)} />}</Field>
          <Field label="Prazo" hint="Opcional" className="col-span-2">{(p) => <Input type="date" {...p} value={deadline} onChange={(e) => setDeadline(e.target.value)} />}</Field>
        </div>
        <fieldset><legend className="mb-2 text-sm font-medium text-foreground/85">Cor</legend>
          <div className="flex flex-wrap gap-2">{Object.entries(COLOR_OPTIONS).map(([k, c]) => (
            <button key={k} type="button" aria-label={c.label} aria-pressed={color === k} onClick={() => setColor(k)} className={cn('size-8 rounded-full ring-offset-2 ring-offset-card', c.dot, color === k && 'ring-2 ring-foreground/60')} />
          ))}</div>
        </fieldset>
        {t && t > 0 && <p className="text-sm text-muted-foreground">Faltam {formatBRL(Math.max(0, t - s))}.</p>}
      </div>
    </Sheet>
  )
}

/** Guardar ou retirar dinheiro de uma meta. */
export function GoalDeposit({ goal, open, onOpenChange }: { goal: SavingsGoal | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { update } = useTableMutations('savings_goals')
  const [value, setValue] = useState('')
  const [mode, setMode] = useState<'add' | 'remove'>('add')
  useEffect(() => { if (open) { setValue(''); setMode('add') } }, [open])
  if (!goal) return null
  const cents = parseBRL(value) ?? 0
  const next = Math.max(0, goal.saved_cents + (mode === 'add' ? cents : -cents))
  const run = () => {
    if (!cents) return
    const done = next >= goal.target_cents
    update.mutate({ id: goal.id, patch: { saved_cents: next, achieved_at: done ? (goal.achieved_at ?? new Date().toISOString()) : null },
      success: done && !goal.achieved_at ? `Meta “${goal.name}” alcançada! Parabéns!` : mode === 'add' ? 'Valor guardado.' : 'Valor retirado.' })
    onOpenChange(false)
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={goal.name} description={`${formatBRL(goal.saved_cents)} de ${formatBRL(goal.target_cents)}`}
      footer={<><Button variant="secondary" className="ml-auto" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={run} disabled={!cents}>Confirmar</Button></>}>
      <div className="space-y-4 pt-1">
        <div className="grid grid-cols-2 gap-2">
          {(['add', 'remove'] as const).map((m) => (
            <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)} className={cn('h-11 rounded-xl border text-sm font-medium', mode === m ? 'border-primary bg-primary/10' : 'hover:bg-muted')}>{m === 'add' ? 'Guardar' : 'Retirar'}</button>
          ))}
        </div>
        <Field label="Valor">{(p) => <MoneyInput big autoFocus {...p} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} />}</Field>
        {cents > 0 && <p className="text-sm text-muted-foreground">Novo saldo da meta: {formatBRL(next)}</p>}
      </div>
    </Sheet>
  )
}
