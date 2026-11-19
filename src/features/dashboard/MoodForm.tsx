import { useEffect, useState } from 'react'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, Textarea } from '@/components/ui/field'
import { useTable, useTableMutations } from '@/hooks/useData'
import { todayKey } from '@/lib/dates'
import { MoodPicker, EnergyPicker } from './MoodPicker'

export function MoodForm({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: entries = [] } = useTable('mood_entries')
  const { create, update } = useTableMutations('mood_entries')
  const today = entries.find((e) => e.entry_date === todayKey())
  const [mood, setMood] = useState<number | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    setMood(today?.mood ?? null); setEnergy(today?.energy ?? null); setNote(today?.note ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const save = async () => {
    if (!mood) return
    const row = { entry_date: todayKey(), mood, energy, note: note.trim() || null }
    try {
      if (today) await update.mutateAsync({ id: today.id, patch: row, success: 'Registro atualizado.' })
      else await create.mutateAsync({ row, success: 'Obrigada por registrar como você está.' })
      onOpenChange(false)
    } catch { /* aviso já exibido */ }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Como você está hoje?" description="Só você vê esse registro."
      footer={<><Button variant="secondary" className="ml-auto" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={save} disabled={!mood}>Salvar</Button></>}>
      <div className="space-y-5 pt-2">
        <div><p className="mb-2 text-sm font-medium">Humor</p><MoodPicker value={mood} onChange={setMood} /></div>
        <div><p className="mb-2 text-sm font-medium">Energia</p><EnergyPicker value={energy} onChange={setEnergy} /></div>
        <Field label="Observações (opcional)">{(p) => <Textarea {...p} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />}</Field>
      </div>
    </Sheet>
  )
}
