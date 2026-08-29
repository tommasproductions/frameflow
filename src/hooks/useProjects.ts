import { useEntity } from '@/hooks/useCollection'
import { projectsStore } from '@/lib/store'

/** Projetos contratados. */
export function useProjects() {
  const { items, ...operations } = useEntity(projectsStore)
  return { projects: items, ...operations }
}
