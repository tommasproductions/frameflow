import { logCreated } from '@/lib/activity'
import { EMPTY_CHECKLIST, VIDEO_TYPE_LABEL } from '@/lib/constants'
import { tasksStore, videosStore } from '@/lib/store'
import { parseDate, toISODate, today } from '@/lib/utils'
import {
  Priority,
  TaskStatus,
  VideoStatus,
  VideoType,
  type Project,
  type Video,
} from '@/types'

/**
 * Template de produção: cria de uma vez os vídeos de um projeto recorrente.
 *
 * Um pacote mensal de 6 reels ou 4 longform sempre nasce igual — mesmo tipo,
 * mesmo valor, prazos espaçados. Abrir seis formulários idênticos à mão é o
 * tipo de trabalho que o sistema existe para evitar.
 */
export interface VideoTemplate {
  quantity: number
  type: VideoType
  /** Título de cada vídeo, numerado: "Reel 1", "Reel 2"… */
  titlePrefix: string
  valuePerVideo: number
  estimatedHours: number
  /** Dias entre um prazo e o seguinte. */
  intervalDays: number
  /** Prazo do primeiro vídeo. */
  firstDeadline: string
  /** Cria também uma tarefa de recebimento de material por vídeo. */
  createTasks: boolean
}

/** Sugestão de template a partir dos dados do projeto. */
export function defaultTemplate(project: {
  contractedValue: number
  startDate: string | null
}): VideoTemplate {
  const quantity = 4
  return {
    quantity,
    type: VideoType.YOUTUBE_LONGFORM,
    titlePrefix: 'Vídeo',
    valuePerVideo: project.contractedValue ? Math.round(project.contractedValue / quantity) : 0,
    estimatedHours: 4,
    intervalDays: 7,
    firstDeadline: project.startDate ?? today(),
    createTasks: true,
  }
}

/**
 * Cria os vídeos (e tarefas) do template.
 *
 * Tudo entra em `briefing`, que é onde a esteira começa — o checklist só é
 * marcado conforme o vídeo avança de coluna.
 */
export function applyVideoTemplate(project: Project, template: VideoTemplate): Video[] {
  const start = parseDate(template.firstDeadline) ?? new Date()

  const videos = videosStore.createMany(
    Array.from({ length: template.quantity }, (_, index) => {
      const deadline = new Date(start)
      deadline.setDate(deadline.getDate() + index * template.intervalDays)

      return {
        title: `${template.titlePrefix} ${index + 1}`,
        clientId: project.clientId,
        projectId: project.id,
        type: template.type,
        status: VideoStatus.BRIEFING,
        priority: Priority.MEDIUM,
        deadline: toISODate(deadline),
        durationSeconds: null,
        value: template.valuePerVideo,
        cost: 0,
        estimatedHours: template.estimatedHours,
        workedHours: 0,
        fileLinks: [],
        notes: null,
        checklist: { ...EMPTY_CHECKLIST },
      }
    }),
  )

  if (template.createTasks) {
    tasksStore.createMany(
      videos.map((video) => ({
        title: `Receber material — ${video.title}`,
        description: `Cobrar o material bruto para ${video.title}.`,
        responsible: project.responsible,
        priority: Priority.MEDIUM,
        status: TaskStatus.TODO,
        deadline: video.deadline,
        clientId: project.clientId,
        projectId: project.id,
        videoId: video.id,
      })),
    )
  }

  logCreated(
    'project',
    project.id,
    project.name,
    `${template.quantity} vídeos de ${VIDEO_TYPE_LABEL[template.type].toLowerCase()} criados por template.`,
  )

  return videos
}
