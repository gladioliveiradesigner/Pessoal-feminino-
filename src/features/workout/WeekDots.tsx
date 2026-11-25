import { Check } from 'lucide-react'
import { useProfile } from '@/hooks/useData'
import { todayKey, WEEKDAYS_MIN } from '@/lib/dates'
import { weekActivity } from '@/lib/workout'
import { cn } from '@/lib/utils'
import type { WorkoutSession } from '@/data/types'

export function WeekDots({ sessions }: { sessions: WorkoutSession[] }) {
  const { data: profile } = useProfile()
  const week = weekActivity(sessions, new Date(), (profile?.week_starts_on ?? 0) as 0 | 1)
  const today = todayKey()
  return (
    <div className="flex gap-1.5" aria-label={`${week.filter((d) => d.trained).length} treinos nesta semana`}>
      {week.map((d) => (
        <span key={d.key} className="flex flex-1 flex-col items-center gap-1">
          <span className={cn('grid size-8 place-items-center rounded-full text-xs font-semibold',
            d.trained ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground', d.key === today && !d.trained && 'ring-1 ring-foreground/40')}>
            {d.trained ? <Check className="size-4" strokeWidth={3} /> : WEEKDAYS_MIN[d.date.getDay()]}
          </span>
        </span>
      ))}
    </div>
  )
}
