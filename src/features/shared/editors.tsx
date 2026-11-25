import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { EventRow, Habit, MealLog, Task, Transaction, WorkoutSession } from '@/data/types'

const TaskForm = lazy(() => import('@/features/tasks/TaskForm').then((m) => ({ default: m.TaskForm })))
const EventForm = lazy(() => import('@/features/agenda/EventForm').then((m) => ({ default: m.EventForm })))
const HabitForm = lazy(() => import('@/features/habits/HabitForm').then((m) => ({ default: m.HabitForm })))
const TransactionForm = lazy(() => import('@/features/finance/TransactionForm').then((m) => ({ default: m.TransactionForm })))
const SessionForm = lazy(() => import('@/features/workout/SessionForm').then((m) => ({ default: m.SessionForm })))
const MealLogForm = lazy(() => import('@/features/food/MealLogForm').then((m) => ({ default: m.MealLogForm })))
const MoodForm = lazy(() => import('@/features/dashboard/MoodForm').then((m) => ({ default: m.MoodForm })))

type Editor =
  | { kind: 'task'; item?: Task | null; defaults?: Partial<Task> }
  | { kind: 'event'; item?: EventRow | null; defaults?: Partial<EventRow> }
  | { kind: 'habit'; item?: Habit | null; defaults?: Partial<Habit> }
  | { kind: 'txn'; item?: Transaction | null; defaults?: Partial<Transaction> }
  | { kind: 'workout'; item?: WorkoutSession | null; defaults?: Partial<WorkoutSession> }
  | { kind: 'meal'; item?: MealLog | null; defaults?: Partial<MealLog> }
  | { kind: 'mood' }

interface EditorsCtx {
  openTask: (item?: Task | null, defaults?: Partial<Task>) => void
  openEvent: (item?: EventRow | null, defaults?: Partial<EventRow>) => void
  openHabit: (item?: Habit | null, defaults?: Partial<Habit>) => void
  openTransaction: (item?: Transaction | null, defaults?: Partial<Transaction>) => void
  openWorkout: (item?: WorkoutSession | null, defaults?: Partial<WorkoutSession>) => void
  openMealLog: (item?: MealLog | null, defaults?: Partial<MealLog>) => void
  openMood: () => void
}

const Ctx = createContext<EditorsCtx | null>(null)

/** Abre os formulários de criação/edição de qualquer lugar do app (inclusive do botão +). */
export function EditorsProvider({ children }: { children: ReactNode }) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [open, setOpen] = useState(false)
  const show = useCallback((e: Editor) => { setEditor(e); setOpen(true) }, [])
  const api = useMemo<EditorsCtx>(() => ({
    openTask: (item, defaults) => show({ kind: 'task', item, defaults }),
    openEvent: (item, defaults) => show({ kind: 'event', item, defaults }),
    openHabit: (item, defaults) => show({ kind: 'habit', item, defaults }),
    openTransaction: (item, defaults) => show({ kind: 'txn', item, defaults }),
    openWorkout: (item, defaults) => show({ kind: 'workout', item, defaults }),
    openMealLog: (item, defaults) => show({ kind: 'meal', item, defaults }),
    openMood: () => show({ kind: 'mood' }),
  }), [show])

  return (
    <Ctx.Provider value={api}>
      {children}
      <Suspense fallback={null}>
        {editor?.kind === 'task' && <TaskForm open={open} onOpenChange={setOpen} task={editor.item} defaults={editor.defaults} />}
        {editor?.kind === 'event' && <EventForm open={open} onOpenChange={setOpen} event={editor.item} defaults={editor.defaults} />}
        {editor?.kind === 'habit' && <HabitForm open={open} onOpenChange={setOpen} habit={editor.item} defaults={editor.defaults} />}
        {editor?.kind === 'txn' && <TransactionForm open={open} onOpenChange={setOpen} item={editor.item} defaults={editor.defaults} />}
        {editor?.kind === 'workout' && <SessionForm open={open} onOpenChange={setOpen} item={editor.item} defaults={editor.defaults} />}
        {editor?.kind === 'meal' && <MealLogForm open={open} onOpenChange={setOpen} item={editor.item} defaults={editor.defaults} />}
        {editor?.kind === 'mood' && <MoodForm open={open} onOpenChange={setOpen} />}
      </Suspense>
    </Ctx.Provider>
  )
}

export function useEditors() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useEditors fora do EditorsProvider')
  return v
}
