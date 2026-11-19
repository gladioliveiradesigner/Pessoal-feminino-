const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlCompact = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })

/** 123456 → "R$ 1.234,56" */
export function formatBRL(cents: number) {
  return brl.format(cents / 100)
}

export function formatBRLCompact(cents: number) {
  return Math.abs(cents) < 100000 ? brl.format(Math.round(cents / 100)).replace(/,00$/, '') : brlCompact.format(cents / 100)
}

/**
 * Converte o que a usuária digitou em centavos.
 * Aceita "1.234,56", "1234,56", "1234.56", "R$ 50", "50".
 */
export function parseBRL(input: string): number | null {
  let s = input.replace(/[R$\s]/g, '')
  if (!s) return null
  const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.')
  if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.')
  else if (lastDot > lastComma && lastComma >= 0) s = s.replace(/,/g, '')
  else if (lastDot >= 0 && s.length - lastDot - 1 === 3 && lastComma < 0) s = s.replace(/\./g, '') // "1.234" = mil
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

/** Centavos → texto para o campo ("1234,56"). */
export function centsToInput(cents: number | null | undefined) {
  if (cents == null) return ''
  return (cents / 100).toFixed(2).replace('.', ',')
}
