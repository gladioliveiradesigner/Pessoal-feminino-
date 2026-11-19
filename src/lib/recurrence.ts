import { addDays, addMonths, addWeeks, addYears, differenceInCalendarDays, differenceInCalendarMonths, differenceInCalendarWeeks, differenceInCalendarYears } from 'date-fns'
import type { RecurrenceFreq } from '@/data/types'

export const FREQ_LABEL: Record<RecurrenceFreq, string> = {
  daily: 'Todo dia',
  weekly: 'Toda semana',
  monthly: 'Todo mês',
  yearly: 'Todo ano',
}

export function freqLabel(freq: RecurrenceFreq | null, interval = 1) {
  if (!freq) return 'Não se repete'
  if (interval <= 1) return FREQ_LABEL[freq]
  const unit = { daily: 'dias', weekly: 'semanas', monthly: 'meses', yearly: 'anos' }[freq]
  return `A cada ${interval} ${unit}`
}

export function addStep(d: Date, freq: RecurrenceFreq, n: number) {
  switch (freq) {
    case 'daily': return addDays(d, n)
    case 'weekly': return addWeeks(d, n)
    case 'monthly': return addMonths(d, n)
    case 'yearly': return addYears(d, n)
  }
}

function stepsBetween(a: Date, b: Date, freq: RecurrenceFreq) {
  switch (freq) {
    case 'daily': return differenceInCalendarDays(b, a)
    case 'weekly': return differenceInCalendarWeeks(b, a)
    case 'monthly': return differenceInCalendarMonths(b, a)
    case 'yearly': return differenceInCalendarYears(b, a)
  }
}

/**
 * Retorna as datas de início de todas as ocorrências que começam em [from, to).
 * `until` é inclusivo (data local).
 */
export function occurrencesBetween(
  start: Date,
  freq: RecurrenceFreq | null,
  interval: number,
  until: Date | null,
  from: Date,
  to: Date,
  durationMs = 0,
): Date[] {
  if (!freq) {
    const end = new Date(start.getTime() + durationMs)
    return start < to && end >= from ? [start] : []
  }
  const step = Math.max(1, interval)
  const out: Date[] = []
  // pula direto para perto de `from`
  let k = Math.max(0, Math.floor(stepsBetween(start, from, freq) / step) - 1) * step
  const limit = until ? addDays(until, 1) : null
  for (let guard = 0; guard < 1000; guard++) {
    const occ = addStep(start, freq, k)
    if (occ >= to || (limit && occ >= limit)) break
    if (occ.getTime() + durationMs >= from.getTime()) out.push(occ)
    k += step
  }
  return out
}
