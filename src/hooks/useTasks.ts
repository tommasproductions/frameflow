import { useEntity } from '@/hooks/useCollection'
import { tasksStore } from '@/lib/store'

/** Tarefas operacionais. */
export function useTasks() {
  const { items, ...operations } = useEntity(tasksStore)
  return { tasks: items, ...operations }
}
