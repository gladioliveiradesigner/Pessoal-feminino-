import { Check, Shuffle, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/misc'
import { useEditors } from '@/features/shared/editors'
import { STATUS_LABEL } from '@/lib/food'
import { cn } from '@/lib/utils'
import type { Meal, MealLog } from '@/data/types'
import { useMealLog } from './useMealLog'

const STATUS_COLOR = { as_planned: 'sage', different: 'sand', skipped: 'graphite' } as const

function LogLine({ log }: { log: MealLog }) {
  return (
    <span className="mt-1 block text-sm">
      <Badge color={STATUS_COLOR[log.status]}>{STATUS_LABEL[log.status]}</Badge>
      {log.description && log.status !== 'as_planned' && <span className="ml-2 text-muted-foreground">{log.description}</span>}
      {log.notes && <span className="block text-xs text-muted-foreground italic">{log.notes}</span>}
    </span>
  )
}

export function MealRow({ meal, log, dateKey, compact }: { meal: Meal; log: MealLog | null; dateKey: string; compact?: boolean }) {
  const { quick } = useMealLog()
  const { openMealLog } = useEditors()
  return (
    <li className={cn('flex items-start gap-3 rounded-2xl p-2', log && 'opacity-90')}>
      <span className="w-12 shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-muted-foreground">{meal.time ?? '—'}</span>
      <button className="min-w-0 flex-1 text-left" onClick={() => openMealLog(log, { meal_id: meal.id, log_date: dateKey, name: meal.name })}>
        <span className={cn('block text-[15px] font-medium', log?.status === 'skipped' && 'line-through decoration-muted-foreground/60')}>{meal.name}</span>
        {!compact && meal.planned && <span className="block text-sm text-muted-foreground">{meal.planned}</span>}
        {log && <LogLine log={log} />}
      </button>
      {!log ? (
        <span className="flex shrink-0 gap-1">
          <Button variant="outline" size="icon-sm" aria-label={`${meal.name}: comi como planejei`} title="Como planejei" onClick={() => quick(meal, dateKey, 'as_planned')}><Check /></Button>
          <Button variant="ghost" size="icon-sm" aria-label={`${meal.name}: comi outra coisa`} title="Comi outra coisa" onClick={() => openMealLog(null, { meal_id: meal.id, log_date: dateKey, name: meal.name, status: 'different' })}><Shuffle /></Button>
          {!compact && <Button variant="ghost" size="icon-sm" aria-label={`${meal.name}: pulei`} title="Pulei" onClick={() => quick(meal, dateKey, 'skipped')}><SkipForward /></Button>}
        </span>
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-full text-white" style={{ background: log.status === 'skipped' ? '#9a96a3' : '#7f9c7f' }} aria-hidden>
          {log.status === 'skipped' ? <SkipForward className="size-4" /> : <Check className="size-4" strokeWidth={3} />}
        </span>
      )}
    </li>
  )
}
