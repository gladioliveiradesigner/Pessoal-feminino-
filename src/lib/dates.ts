import { format, parseISO, isToday, isTomorrow, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const locale = ptBR

/** Data local no formato YYYY-MM-DD (sem fuso). */
export function toDateKey(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

export function todayKey() {
  return toDateKey(new Date())
}

/** Converte YYYY-MM-DD para Date local (meia-noite local). */
export function fromDateKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function fmt(d: Date | string, pattern: string) {
  const date = typeof d === 'string' ? parseISO(d) : d
  return format(date, pattern, { locale: ptBR })
}

export function friendlyDay(d: Date) {
  if (isToday(d)) return 'Hoje'
  if (isTomorrow(d)) return 'Amanhã'
  if (isYesterday(d)) return 'Ontem'
  return capitalize(format(d, "EEEE, d 'de' MMM", { locale: ptBR }))
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function greeting(d = new Date()) {
  const h = d.getHours()
  if (h < 5) return 'Boa noite'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const WEEKDAYS_MIN = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
