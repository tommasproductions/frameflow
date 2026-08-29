import { useMemo } from 'react'

import { useClients } from '@/hooks/useClients'
import { useLeads } from '@/hooks/useLeads'
import { useProjects } from '@/hooks/useProjects'
import { useTasks } from '@/hooks/useTasks'
import { useVideos } from '@/hooks/useVideos'
import { LEAD_STAGE_LABEL, VIDEO_STATUS_LABEL } from '@/lib/constants'
import { normalize } from '@/lib/utils'

export type SearchGroup = 'Leads' | 'Clientes' | 'Projetos' | 'Vídeos' | 'Tarefas'

export interface SearchResult {
  id: string
  group: SearchGroup
  title: string
  /** Linha auxiliar: cliente, etapa, empresa. */
  subtitle: string | null
  to: string
  /** Texto contra o qual a busca casa — inclui campos não exibidos. */
  haystack: string
}

/**
 * Índice de busca global.
 *
 * Montado uma vez por mudança nos dados e filtrado a cada tecla. O `haystack`
 * carrega também campos que não aparecem no resultado (empresa, nicho, projeto)
 * para que buscar "beleza" encontre a Maria Santos mesmo sem esse texto na
 * linha exibida.
 */
export function useSearchIndex(): SearchResult[] {
  const { leads } = useLeads()
  const { clients, byId: clientById } = useClients()
  const { projects } = useProjects()
  const { videos } = useVideos()
  const { tasks } = useTasks()

  return useMemo(() => {
    const results: SearchResult[] = []

    for (const lead of leads) {
      results.push({
        id: `lead-${lead.id}`,
        group: 'Leads',
        title: lead.name,
        subtitle: [lead.company, LEAD_STAGE_LABEL[lead.stage]].filter(Boolean).join(' · '),
        to: `/leads/${lead.id}`,
        haystack: normalize(
          [lead.name, lead.company, lead.niche, lead.desiredService, lead.email]
            .filter(Boolean)
            .join(' '),
        ),
      })
    }

    for (const client of clients) {
      results.push({
        id: `client-${client.id}`,
        group: 'Clientes',
        title: client.name,
        subtitle: [client.company, client.niche].filter(Boolean).join(' · ') || null,
        to: `/clients/${client.id}`,
        haystack: normalize(
          [client.name, client.company, client.niche, client.email].filter(Boolean).join(' '),
        ),
      })
    }

    for (const project of projects) {
      const clientName = clientById(project.clientId)?.name
      results.push({
        id: `project-${project.id}`,
        group: 'Projetos',
        title: project.name,
        subtitle: [clientName, project.type].filter(Boolean).join(' · ') || null,
        to: `/projects/${project.id}`,
        haystack: normalize(
          [project.name, clientName, project.type, project.description].filter(Boolean).join(' '),
        ),
      })
    }

    for (const video of videos) {
      const clientName = clientById(video.clientId)?.name
      results.push({
        id: `video-${video.id}`,
        group: 'Vídeos',
        title: video.title,
        subtitle: [clientName, VIDEO_STATUS_LABEL[video.status]].filter(Boolean).join(' · '),
        to: `/videos/${video.id}`,
        haystack: normalize([video.title, clientName, video.notes].filter(Boolean).join(' ')),
      })
    }

    for (const task of tasks) {
      const clientName = clientById(task.clientId)?.name
      results.push({
        id: `task-${task.id}`,
        group: 'Tarefas',
        title: task.title,
        subtitle: clientName ?? null,
        // Tarefa não tem página própria; vai para o vídeo ou para a lista.
        to: task.videoId ? `/videos/${task.videoId}` : '/tasks',
        haystack: normalize([task.title, task.description, clientName].filter(Boolean).join(' ')),
      })
    }

    return results
  }, [leads, clients, projects, videos, tasks, clientById])
}
