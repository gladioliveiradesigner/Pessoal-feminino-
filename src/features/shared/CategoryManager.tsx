import { useState } from 'react'
import { Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { Confirm } from '@/components/ui/confirm'
import { Dot } from '@/components/ui/misc'
import { useTable, useTableMutations } from '@/hooks/useData'
import { COLOR_OPTIONS } from '@/lib/colors'
import { cn } from '@/lib/utils'
import type { Category } from '@/data/types'

function ColorPick({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(COLOR_OPTIONS).map(([k, c]) => (
        <button key={k} type="button" aria-label={c.label} aria-pressed={value === k} onClick={() => onChange(k)}
          className={cn('size-7 rounded-full ring-offset-2 ring-offset-card', c.dot, value === k && 'ring-2 ring-foreground/60')} />
      ))}
    </div>
  )
}

function Row({ cat, all }: { cat: Category; all: Category[] }) {
  const { update, remove } = useTableMutations('categories')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(cat.name)
  const [color, setColor] = useState(cat.color)
  const dup = all.some((c) => c.id !== cat.id && c.name.toLowerCase() === name.trim().toLowerCase())
  if (!editing) return (
    <li className="flex items-center gap-3 rounded-xl px-2 py-1.5">
      <Dot color={cat.color} /><span className="flex-1">{cat.name}</span>
      <Button variant="ghost" size="icon-sm" aria-label={`Editar ${cat.name}`} onClick={() => setEditing(true)}><Pencil /></Button>
      <Confirm title={`Excluir “${cat.name}”?`} text="Tarefas e compromissos dessa categoria ficam sem categoria."
        onConfirm={() => remove.mutate({ id: cat.id, success: 'Categoria excluída.' })}
        trigger={<Button variant="ghost" size="icon-sm" aria-label={`Excluir ${cat.name}`} className="text-danger"><Trash2 /></Button>} />
    </li>
  )
  return (
    <li className="space-y-2 rounded-2xl border p-3">
      <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-label="Nome da categoria" aria-invalid={dup} className="h-10" />
      {dup && <p className="text-xs text-danger">Já existe uma categoria com esse nome.</p>}
      <ColorPick value={color} onChange={setColor} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setName(cat.name); setColor(cat.color) }}>Cancelar</Button>
        <Button size="sm" disabled={!name.trim() || dup} onClick={() => { update.mutate({ id: cat.id, patch: { name: name.trim(), color }, success: 'Categoria atualizada.' }); setEditing(false) }}><Check />Salvar</Button>
      </div>
    </li>
  )
}

export function CategoryManager({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: cats = [] } = useTable('categories')
  const { create } = useTableMutations('categories')
  const [name, setName] = useState('')
  const [color, setColor] = useState('lavender')
  const dup = cats.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())
  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || dup) return
    create.mutate({ row: { name: name.trim(), color, position: cats.length }, success: 'Categoria criada.' })
    setName('')
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Categorias" description="Usadas em tarefas e compromissos.">
      <ul className="space-y-1 pt-2">{cats.map((c) => <Row key={c.id} cat={c} all={cats} />)}</ul>
      <form onSubmit={add} className="mt-4 space-y-2 rounded-2xl bg-muted/50 p-3">
        <p className="text-sm font-medium">Nova categoria</p>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Viagem" maxLength={40} aria-label="Nome da nova categoria" className="h-10" />
          <Button type="submit" size="icon-sm" className="size-10" disabled={!name.trim() || dup} aria-label="Criar categoria"><Plus /></Button>
        </div>
        {dup && name && <p className="text-xs text-danger">Já existe uma categoria com esse nome.</p>}
        <ColorPick value={color} onChange={setColor} />
      </form>
    </Sheet>
  )
}
