import {
  CalendarDays, CheckSquare, Repeat, Wallet, Target, NotebookPen, Home, Dumbbell, Baby,
  HeartPulse, Smile, Flower2, Pill, Droplets, PawPrint, type LucideIcon,
} from 'lucide-react'

export type ModuleId =
  | 'agenda' | 'tasks' | 'habits'
  | 'finance' | 'goals' | 'journal' | 'home' | 'workout' | 'kids' | 'pets'
  | 'wellbeing' | 'cycle' | 'meds' | 'skincare'

export interface ModuleDef {
  id: ModuleId
  label: string
  description: string
  icon: LucideIcon
  path?: string
  phase: 1 | 2 | 3
  /** Disponível nesta versão do app. Módulos indisponíveis aparecem como "em breve" e não têm ações. */
  available: boolean
  sensitive?: boolean
}

export const MODULES: ModuleDef[] = [
  { id: 'agenda', label: 'Agenda', description: 'Compromissos, calendário e lembretes', icon: CalendarDays, path: '/agenda', phase: 1, available: true },
  { id: 'tasks', label: 'Tarefas', description: 'Pendências pessoais e profissionais', icon: CheckSquare, path: '/tarefas', phase: 1, available: true },
  { id: 'habits', label: 'Hábitos e rotinas', description: 'Constância com leveza, sem culpa', icon: Repeat, path: '/rotina', phase: 1, available: true },
  { id: 'finance', label: 'Finanças', description: 'Receitas, despesas, orçamento e metas', icon: Wallet, phase: 2, available: false },
  { id: 'goals', label: 'Metas e sonhos', description: 'Objetivos com etapas e progresso', icon: Target, phase: 2, available: false },
  { id: 'journal', label: 'Diário', description: 'Registros e anotações privadas', icon: NotebookPen, phase: 2, available: false },
  { id: 'home', label: 'Casa', description: 'Compras, tarefas e manutenção', icon: Home, phase: 2, available: false },
  { id: 'workout', label: 'Treino e academia', description: 'Fichas, exercícios, cargas e evolução', icon: Dumbbell, phase: 2, available: false },
  { id: 'kids', label: 'Filhos', description: 'Rotina, escola, saúde e compromissos', icon: Baby, phase: 2, available: false },
  { id: 'pets', label: 'Pets', description: 'Perfil, vacinas, veterinário, ração e remédios', icon: PawPrint, phase: 2, available: false },
  { id: 'wellbeing', label: 'Bem-estar', description: 'Humor, energia, sono e autocuidado', icon: Smile, phase: 3, available: false, sensitive: true },
  { id: 'cycle', label: 'Ciclo menstrual', description: 'Registros e estimativas do ciclo', icon: Droplets, phase: 3, available: false, sensitive: true },
  { id: 'meds', label: 'Remédios', description: 'Horários, doses e estoque', icon: Pill, phase: 3, available: false, sensitive: true },
  { id: 'skincare', label: 'Skin care', description: 'Rotinas, produtos e validade', icon: Flower2, phase: 3, available: false },
]

export const OPTIONAL_HEALTH_ICON = HeartPulse

export function moduleById(id: string) {
  return MODULES.find((m) => m.id === id)
}
