import { LayoutGrid, type LucideIcon } from 'lucide-react'
import { coreModules, type CoreDef } from '@/lib/cores'

export interface NavItem { to: string; label: string; icon: LucideIcon }

/** Nomes curtos dos módulos para abas e menu. */
const SHORT_LABEL: Record<string, string> = {
  agenda: 'Agenda', tasks: 'Tarefas', habits: 'Rotina', finance: 'Finanças', workout: 'Treinos', food: 'Alimentação',
}

/** Abas de um núcleo: visão geral + módulos ativos. Núcleos de um módulo só não têm abas. */
export function coreTabs(core: CoreDef, enabled: string[] | undefined): NavItem[] {
  if (core.modules.length <= 1) return []
  const { active } = coreModules(core, enabled)
  return [
    { to: core.path, label: 'Visão geral', icon: LayoutGrid },
    ...active.map((m) => ({ to: m.path!, label: SHORT_LABEL[m.id] ?? m.label, icon: m.icon })),
  ]
}
