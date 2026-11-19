import { Angry, Frown, Laugh, Meh, Smile, BatteryLow, BatteryMedium, BatteryFull, Battery, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export const MOODS = [
  { v: 1, label: 'Muito mal', icon: Angry },
  { v: 2, label: 'Para baixo', icon: Frown },
  { v: 3, label: 'Neutra', icon: Meh },
  { v: 4, label: 'Bem', icon: Smile },
  { v: 5, label: 'Ótima', icon: Laugh },
]
export const ENERGIES = [
  { v: 1, label: 'Esgotada', icon: Battery },
  { v: 2, label: 'Baixa', icon: BatteryLow },
  { v: 3, label: 'Média', icon: BatteryMedium },
  { v: 4, label: 'Boa', icon: BatteryFull },
  { v: 5, label: 'Muita', icon: Zap },
]

function Picker({ items, value, onChange, label }: { items: typeof MOODS; value: number | null; onChange: (v: number) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5">
      {items.map(({ v, label: l, icon: I }) => (
        <button key={v} role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={cn('flex flex-col items-center gap-1 rounded-2xl border px-1 py-2.5 text-[11px] transition',
            value === v ? 'animate-pop border-primary bg-primary/10 font-semibold text-foreground' : 'border-transparent bg-muted/60 text-muted-foreground hover:bg-muted')}>
          <I className={cn('size-6', value === v && 'text-primary')} strokeWidth={1.6} />
          {l}
        </button>
      ))}
    </div>
  )
}

export const MoodPicker = (p: { value: number | null; onChange: (v: number) => void }) => <Picker items={MOODS} label="Humor" {...p} />
export const EnergyPicker = (p: { value: number | null; onChange: (v: number) => void }) => <Picker items={ENERGIES} label="Energia" {...p} />
