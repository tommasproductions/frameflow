import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjects } from '@/hooks/useProjects'
import { logCreated, logStatusChange, logUpdated } from '@/lib/activity'
import {
  applyStatusToChecklist,
  EMPTY_CHECKLIST,
  PRIORITY_LABEL,
  VIDEO_STATUS_LABEL,
  VIDEO_TYPE_LABEL,
  toOptions,
} from '@/lib/constants'
import { videosStore } from '@/lib/store'
import { Priority, VideoStatus, VideoType, type Video } from '@/types'

interface VideoFormValues {
  title: string
  projectId: string
  type: VideoType
  status: VideoStatus
  priority: Priority
  deadline: string
  durationSeconds: string
  value: string
  estimatedHours: string
  workedHours: string
  notes: string
}

function emptyValues(projectId: string): VideoFormValues {
  return {
    title: '',
    projectId,
    type: VideoType.YOUTUBE_LONGFORM,
    status: VideoStatus.BRIEFING,
    priority: Priority.MEDIUM,
    deadline: '',
    durationSeconds: '',
    value: '',
    estimatedHours: '',
    workedHours: '',
    notes: '',
  }
}

function fromVideo(video: Video): VideoFormValues {
  return {
    title: video.title,
    projectId: video.projectId,
    type: video.type,
    status: video.status,
    priority: video.priority,
    deadline: video.deadline ?? '',
    durationSeconds: video.durationSeconds?.toString() ?? '',
    value: String(video.value),
    estimatedHours: video.estimatedHours?.toString() ?? '',
    workedHours: video.workedHours?.toString() ?? '',
    notes: video.notes ?? '',
  }
}

const text = (value: string): string | null => value.trim() || null
const numOrNull = (value: string): number | null => (value.trim() === '' ? null : Number(value))
const num = (value: string): number => (value.trim() === '' ? 0 : Number(value))

export function VideoForm({
  open,
  onOpenChange,
  video,
  defaultProjectId = '',
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  video?: Video
  /** Pré-seleciona o projeto quando aberto da página dele. */
  defaultProjectId?: string
  onSaved?: (video: Video) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <VideoFormBody
          video={video}
          defaultProjectId={defaultProjectId}
          onSaved={onSaved}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function VideoFormBody({
  video,
  defaultProjectId,
  onSaved,
  onClose,
}: {
  video?: Video
  defaultProjectId: string
  onSaved?: (video: Video) => void
  onClose: () => void
}) {
  const { projects } = useProjects()
  const [values, setValues] = useState<VideoFormValues>(() =>
    video ? fromVideo(video) : emptyValues(defaultProjectId),
  )
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof VideoFormValues>(key: K, value: VideoFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!values.title.trim()) {
      setError('Informe o título do vídeo.')
      return
    }
    const project = projects.find((item) => item.id === values.projectId)
    if (!project) {
      setError('Selecione o projeto do vídeo.')
      return
    }

    const shared = {
      title: values.title.trim(),
      // O cliente do vídeo é sempre o do projeto — não é um campo à parte,
      // senão os dois poderiam divergir e quebrar os totais por cliente.
      clientId: project.clientId,
      projectId: project.id,
      type: values.type,
      status: values.status,
      priority: values.priority,
      deadline: text(values.deadline),
      durationSeconds: numOrNull(values.durationSeconds),
      value: num(values.value),
      estimatedHours: numOrNull(values.estimatedHours),
      workedHours: numOrNull(values.workedHours),
      notes: text(values.notes),
    }

    if (video) {
      const updated = videosStore.update(video.id, {
        ...shared,
        // Mudar o status pelo formulário atualiza o checklist do mesmo jeito
        // que arrastar o card na esteira.
        checklist:
          video.status === values.status
            ? video.checklist
            : applyStatusToChecklist(values.status, video.checklist),
      })
      if (updated) {
        logUpdated('video', video.id, updated.title, 'Dados do vídeo atualizados.')
        if (video.status !== values.status) {
          logStatusChange('video', video.id, updated.title, video.status, values.status)
        }
        onSaved?.(updated)
      }
    } else {
      const created = videosStore.create({
        ...shared,
        cost: 0,
        fileLinks: [],
        checklist: applyStatusToChecklist(values.status, { ...EMPTY_CHECKLIST }),
      })
      logCreated('video', created.id, created.title, `Adicionado ao projeto ${project.name}.`)
      onSaved?.(created)
    }

    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
      <DialogHeader>
        <DialogTitle>{video ? 'Editar vídeo' : 'Novo vídeo'}</DialogTitle>
        <DialogDescription>
          {video
            ? 'Altere dados, prazo e andamento da produção.'
            : 'Adicione um vídeo à esteira de produção.'}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-2">
          <Field label="Título" className="sm:col-span-2">
            <Input
              value={values.title}
              onChange={(event) => set('title', event.target.value)}
              placeholder="Título do vídeo"
              autoFocus
            />
          </Field>

          <Field label="Projeto">
            <Select value={values.projectId} onValueChange={(value) => set('projectId', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Tipo">
            <Select value={values.type} onValueChange={(value) => set('type', value as VideoType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toOptions(VIDEO_TYPE_LABEL).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <Field label="Status">
            <Select
              value={values.status}
              onValueChange={(value) => set('status', value as VideoStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toOptions(VIDEO_STATUS_LABEL).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Prioridade">
            <Select
              value={values.priority}
              onValueChange={(value) => set('priority', value as Priority)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toOptions(PRIORITY_LABEL).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Prazo">
            <Input
              type="date"
              value={values.deadline}
              onChange={(event) => set('deadline', event.target.value)}
            />
          </Field>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Valor (R$)">
            <Input
              type="number"
              min={0}
              step={50}
              value={values.value}
              onChange={(event) => set('value', event.target.value)}
            />
          </Field>
          <Field label="Horas estimadas">
            <Input
              type="number"
              min={0}
              step={0.5}
              value={values.estimatedHours}
              onChange={(event) => set('estimatedHours', event.target.value)}
            />
          </Field>
          <Field label="Horas trabalhadas">
            <Input
              type="number"
              min={0}
              step={0.5}
              value={values.workedHours}
              onChange={(event) => set('workedHours', event.target.value)}
            />
          </Field>
          <Field label="Duração (s)" hint="Do vídeo final.">
            <Input
              type="number"
              min={0}
              value={values.durationSeconds}
              onChange={(event) => set('durationSeconds', event.target.value)}
            />
          </Field>
        </section>

        <Field label="Observações">
          <Textarea
            value={values.notes}
            onChange={(event) => set('notes', event.target.value)}
            className="min-h-16"
          />
        </Field>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </DialogBody>

      <DialogFooter>
        <Button type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary">
          {video ? 'Salvar alterações' : 'Criar vídeo'}
        </Button>
      </DialogFooter>
    </form>
  )
}
