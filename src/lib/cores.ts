import { Briefcase, GraduationCap, HeartPulse, Sparkles, Wallet, type LucideIcon } from 'lucide-react'
import { MODULES, type ModuleDef, type ModuleId } from './modules'
import type { ColorKey } from './colors'
import type { Category } from '@/data/types'

/**
 * Núcleos: os grandes setores da vida que organizam a navegação (dock).
 * Cada módulo pertence a um núcleo. Trabalho e Estudo ainda não têm módulos próprios:
 * reúnem tarefas e compromissos da categoria correspondente.
 */
export type CoreId = 'pessoal' | 'saude' | 'trabalho' | 'estudo' | 'financas'

export interface CoreDef {
  id: CoreId
  label: string
  description: string
  icon: LucideIcon
  color: ColorKey
  /** Página do núcleo. */
  path: string
  modules: ModuleId[]
  /** Nomes de categoria (sem acento, minúsculos) cujas tarefas e compromissos aparecem neste núcleo. */
  categoryNames?: string[]
  /** Nome usado ao criar a categoria, se ela ainda não existir. */
  categoryLabel?: string
}

export const CORES: CoreDef[] = [
  {
    id: 'pessoal', label: 'Pessoal', description: 'Agenda, tarefas, rotina e a vida em casa', icon: Sparkles, color: 'rose', path: '/pessoal',
    modules: ['agenda', 'tasks', 'habits', 'goals', 'journal', 'home', 'kids', 'pets'],
  },
  {
    id: 'saude', label: 'Saúde', description: 'Corpo, alimentação, ciclo e autocuidado', icon: HeartPulse, color: 'mint', path: '/saude',
    modules: ['workout', 'food', 'wellbeing', 'cycle', 'meds', 'skincare'],
  },
  {
    id: 'trabalho', label: 'Trabalho', description: 'Tarefas e compromissos profissionais', icon: Briefcase, color: 'lavender', path: '/trabalho',
    modules: [], categoryNames: ['trabalho', 'profissional', 'work'], categoryLabel: 'Trabalho',
  },
  {
    id: 'estudo', label: 'Estudo', description: 'Aulas, cursos, provas e leituras', icon: GraduationCap, color: 'sky', path: '/estudo',
    modules: [], categoryNames: ['estudo', 'estudos', 'faculdade', 'curso', 'cursos', 'escola'], categoryLabel: 'Estudos',
  },
  {
    id: 'financas', label: 'Finanças', description: 'Dinheiro, contas, orçamento e metas', icon: Wallet, color: 'sand', path: '/financas',
    modules: ['finance'],
  },
]

export function coreById(id: string | undefined) {
  return CORES.find((c) => c.id === id)
}

export function coreOfModule(id: string) {
  return CORES.find((c) => (c.modules as string[]).includes(id))
}

/** Módulos do núcleo, separados em ativos, desativados e "em breve". */
export function coreModules(core: CoreDef, enabled: string[] | undefined) {
  const all = core.modules.map((id) => MODULES.find((m) => m.id === id)).filter(Boolean) as ModuleDef[]
  const on = enabled ?? []
  return {
    active: all.filter((m) => m.available && on.includes(m.id)),
    off: all.filter((m) => m.available && !on.includes(m.id)),
    soon: all.filter((m) => !m.available),
  }
}

/**
 * Núcleos que aparecem na dock. Um núcleo que é só um módulo (Finanças) some quando o módulo está desligado;
 * Trabalho e Estudo dependem de Agenda ou Tarefas.
 */
export function visibleCores(enabled: string[] | undefined) {
  const on = enabled ?? []
  return CORES.filter((c) => {
    if (c.categoryNames) return on.includes('tasks') || on.includes('agenda')
    if (c.modules.length === 1) return on.includes(c.modules[0])
    return true
  })
}

/** Núcleo da tela atual. `from` (estado da navegação) mantém o núcleo de origem, ex.: Trabalho → Tarefas. */
export function activeCore(pathname: string, from?: unknown): CoreDef | undefined {
  const viaState = typeof from === 'string' ? coreById(from) : undefined
  if (viaState) return viaState
  const direct = CORES.find((c) => pathname === c.path || pathname.startsWith(c.path + '/'))
  if (direct) return direct
  const mod = MODULES.find((m) => m.path && (pathname === m.path || pathname.startsWith(m.path + '/')))
  return mod ? coreOfModule(mod.id) : undefined
}

export function normalizeName(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
}

/** Categorias da usuária que pertencem a um núcleo (Trabalho, Estudos...). */
export function coreCategories(core: CoreDef, categories: Category[]) {
  if (!core.categoryNames) return []
  return categories.filter((c) => core.categoryNames!.includes(normalizeName(c.name)))
}
