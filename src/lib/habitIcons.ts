import { Apple, BedDouble, BookOpen, Brain, Dumbbell, Footprints, GlassWater, Heart, Home, Leaf, Moon, Music, PenLine, PersonStanding, Sparkles, Sun, type LucideIcon } from 'lucide-react'

export const HABIT_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  'glass-water': { icon: GlassWater, label: 'Água' },
  'person-standing': { icon: PersonStanding, label: 'Alongar' },
  dumbbell: { icon: Dumbbell, label: 'Exercício' },
  footprints: { icon: Footprints, label: 'Caminhar' },
  'book-open': { icon: BookOpen, label: 'Ler' },
  'pen-line': { icon: PenLine, label: 'Estudar' },
  brain: { icon: Brain, label: 'Meditar' },
  'bed-double': { icon: BedDouble, label: 'Dormir' },
  sparkles: { icon: Sparkles, label: 'Pele' },
  home: { icon: Home, label: 'Casa' },
  apple: { icon: Apple, label: 'Alimentação' },
  leaf: { icon: Leaf, label: 'Natureza' },
  music: { icon: Music, label: 'Música' },
  heart: { icon: Heart, label: 'Carinho' },
  sun: { icon: Sun, label: 'Sol' },
  moon: { icon: Moon, label: 'Noite' },
}

export function habitIcon(key: string) {
  return HABIT_ICONS[key]?.icon ?? Sparkles
}
