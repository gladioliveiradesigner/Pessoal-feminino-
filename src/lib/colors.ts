/** Paleta de cores para categorias, hábitos e destaques. */
export const COLOR_OPTIONS = {
  rose: { label: 'Rosa antigo', dot: 'bg-[#D9A6AF]', soft: 'bg-[#D9A6AF]/18 text-[#8a4f5a] dark:text-[#ecc3ca]', hex: '#D9A6AF' },
  lavender: { label: 'Lavanda', dot: 'bg-[#B9AEDC]', soft: 'bg-[#B9AEDC]/22 text-[#5b4f8a] dark:text-[#d3cbf0]', hex: '#B9AEDC' },
  sage: { label: 'Sálvia', dot: 'bg-[#A8BDA8]', soft: 'bg-[#A8BDA8]/25 text-[#4b664b] dark:text-[#c9dbc9]', hex: '#A8BDA8' },
  sky: { label: 'Céu', dot: 'bg-[#A9C4D8]', soft: 'bg-[#A9C4D8]/25 text-[#3f5f78] dark:text-[#c8dceb]', hex: '#A9C4D8' },
  mint: { label: 'Menta', dot: 'bg-[#9FCDBF]', soft: 'bg-[#9FCDBF]/25 text-[#356b5c] dark:text-[#c3e4da]', hex: '#9FCDBF' },
  sand: { label: 'Areia', dot: 'bg-[#E1C49B]', soft: 'bg-[#E1C49B]/28 text-[#7a5a2c] dark:text-[#eedcbf]', hex: '#E1C49B' },
  graphite: { label: 'Grafite', dot: 'bg-[#6E6A78]', soft: 'bg-[#6E6A78]/15 text-[#33313A] dark:text-[#d6d3dd]', hex: '#6E6A78' },
} as const

export type ColorKey = keyof typeof COLOR_OPTIONS

export function colorOf(key: string | null | undefined) {
  return COLOR_OPTIONS[(key as ColorKey) ?? 'graphite'] ?? COLOR_OPTIONS.graphite
}
