import { describe, expect, it } from 'vitest'
import { activeCore, coreCategories, visibleCores } from '../cores'
import { coreTabs } from '@/components/layout/nav'
import { coreById } from '../cores'

describe('núcleos', () => {
  it('descobre o núcleo da tela atual', () => {
    expect(activeCore('/agenda')?.id).toBe('pessoal')
    expect(activeCore('/treinos')?.id).toBe('saude')
    expect(activeCore('/financas')?.id).toBe('financas')
    expect(activeCore('/trabalho')?.id).toBe('trabalho')
    expect(activeCore('/')).toBeUndefined()
    expect(activeCore('/tarefas', 'trabalho')?.id).toBe('trabalho')
  })
  it('esconde Finanças quando o módulo está desligado', () => {
    expect(visibleCores(['agenda', 'tasks']).map((c) => c.id)).toEqual(['pessoal', 'saude', 'trabalho', 'estudo'])
    expect(visibleCores(['finance']).map((c) => c.id)).toEqual(['pessoal', 'saude', 'financas'])
  })
  it('acha a categoria do núcleo sem ligar para acento e maiúsculas', () => {
    const cats = [{ id: '1', name: 'ESTUDOS', color: 'sky', position: 0 }, { id: '2', name: 'Trabalho', color: 'lavender', position: 1 }]
    expect(coreCategories(coreById('estudo')!, cats).map((c) => c.id)).toEqual(['1'])
  })
  it('monta as abas só com módulos ativos', () => {
    expect(coreTabs(coreById('saude')!, ['workout']).map((t) => t.label)).toEqual(['Visão geral', 'Treinos'])
    expect(coreTabs(coreById('financas')!, ['finance'])).toEqual([])
  })
})
