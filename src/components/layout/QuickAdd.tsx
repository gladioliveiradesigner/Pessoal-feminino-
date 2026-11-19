import { CalendarPlus, CheckSquare, Repeat, Smile, Wallet } from 'lucide-react'
import { Sheet } from '@/components/ui/dialog'
import { useEditors } from '@/features/shared/editors'
import { useProfile } from '@/hooks/useData'

export function QuickAdd({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const ed = useEditors()
  const { data: profile } = useProfile()
  const enabled = profile?.enabled_modules ?? []
  const items = [
    { label: 'Tarefa', icon: CheckSquare, color: 'bg-rose/25 text-[#8a4f5a] dark:text-rose', run: () => ed.openTask(), show: enabled.includes('tasks') },
    { label: 'Compromisso', icon: CalendarPlus, color: 'bg-lavender/30 text-[#5b4f8a] dark:text-lavender', run: () => ed.openEvent(), show: enabled.includes('agenda') },
    { label: 'Despesa', icon: Wallet, color: 'bg-[#A9C4D8]/30 text-[#3f5f78] dark:text-[#A9C4D8]', run: () => ed.openTransaction(null, { kind: 'expense' }), show: enabled.includes('finance') },
    { label: 'Hábito', icon: Repeat, color: 'bg-sage/30 text-[#4b664b] dark:text-sage', run: () => ed.openHabit(), show: enabled.includes('habits') },
    { label: 'Como estou', icon: Smile, color: 'bg-[#E1C49B]/30 text-[#7a5a2c] dark:text-[#E1C49B]', run: () => ed.openMood(), show: true },
  ].filter((i) => i.show)

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Adicionar" description="O que você quer registrar?">
      <div className="grid grid-cols-2 gap-3 pt-2 pb-2">
        {items.map(({ label, icon: I, color, run }) => (
          <button key={label} onClick={() => { onOpenChange(false); setTimeout(run, 120) }}
            className="flex flex-col items-start gap-3 rounded-2xl border bg-card p-4 text-left transition hover:bg-muted active:scale-[.98]">
            <span className={`grid size-11 place-items-center rounded-xl ${color}`}><I className="size-5" /></span>
            <span className="font-semibold">{label}</span>
          </button>
        ))}
      </div>
      <p className="pb-2 text-xs text-muted-foreground">Anotações entram aqui quando o Diário for lançado.</p>
    </Sheet>
  )
}
