import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSource } from '@/auth/session'
import { useTable, useTableMutations } from '@/hooks/useData'
import { nextDueDate, subtasksOf } from '@/lib/domain'
import type { Task } from '@/data/types'

/** Concluir/reabrir tarefa. Tarefas recorrentes geram a próxima ocorrência automaticamente. */
export function useToggleTask() {
  const { data: all = [] } = useTable('tasks')
  const { update } = useTableMutations('tasks')
  const source = useSource()
  const qc = useQueryClient()

  return async (task: Task) => {
    const completing = !task.completed_at
    update.mutate({ id: task.id, patch: { completed_at: completing ? new Date().toISOString() : null }, silent: true })
    if (!completing || task.parent_id) return
    const next = nextDueDate(task)
    if (next) {
      try {
        const { id: _i, created_at: _c, updated_at: _u, user_id: _uid, ...rest } = task
        void _i; void _c; void _u; void _uid
        const created = await source.insert('tasks', { ...rest, due_date: next, completed_at: null })
        await Promise.all(subtasksOf(all, task.id).map((s, i) =>
          source.insert('tasks', { title: s.title, parent_id: created.id, position: i })))
        toast.success('Concluída! A próxima já está agendada.')
      } catch {
        toast.error('Concluída, mas não foi possível agendar a próxima repetição.')
      } finally {
        qc.invalidateQueries({ queryKey: [source.kind, 'tasks'] })
      }
    }
  }
}
