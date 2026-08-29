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
import { useClients } from '@/hooks/useClients'
import { useProjects } from '@/hooks/useProjects'
import { useVideos } from '@/hooks/useVideos'
import { logCreated, logStatusChange, logUpdated } from '@/lib/activity'
import { PRIORITY_LABEL, TASK_STATUS_LABEL, toOptions } from '@/lib/constants'
import { tasksStore } from '@/lib/store'
import { Priority, TaskStatus, type Task } from '@/types'

/** Radix não aceita item com valor vazio; este é o "sem vínculo". */
const NONE = '__none'

interface TaskFormValues {
  title: string
  description: string
  responsible: string
  priority: Priority
  status: TaskStatus
  deadline: string
  clientId: string
  projectId: string
  videoId: string
}

function emptyValues(defaults: Partial<TaskFormValues>): TaskFormValues {
  return {
    title: '',
    description: '',
    responsible: '',
    priority: Priority.MEDIUM,
    status: TaskStatus.TODO,
    deadline: '',
    clientId: '',
    projectId: '',
    videoId: '',
    ...defaults,
  }
}

function fromTask(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? '',
    responsible: task.responsible ?? '',
    priority: task.priority,
    status: task.status,
    deadline: task.deadline ?? '',
    clientId: task.clientId ?? '',
    projectId: task.projectId ?? '',
    videoId: task.videoId ?? '',
  }
}

const text = (value: string): string | null => value.trim() || null

export function TaskForm({
  open,
  onOpenChange,
  task,
  defaults,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task
  /** Vínculos pré-preenchidos quando aberto de um projeto ou vídeo. */
  defaults?: Partial<Pick<TaskFormValues, 'clientId' | 'projectId' | 'videoId'>>
  onSaved?: (task: Task) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <TaskFormBody
          task={task}
          defaults={defaults ?? {}}
          onSaved={onSaved}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function TaskFormBody({
  task,
  defaults,
  onSaved,
  onClose,
}: {
  task?: Task
  defaults: Partial<TaskFormValues>
  onSaved?: (task: Task) => void
  onClose: () => void
}) {
  const { clients } = useClients()
  const { projects } = useProjects()
  const { videos } = useVideos()

  const [values, setValues] = useState<TaskFormValues>(() =>
    task ? fromTask(task) : emptyValues(defaults),
  )
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  // Os vínculos são hierárquicos: escolher um projeto restringe os vídeos, e
  // escolher um vídeo determina projeto e cliente.
  const availableProjects = values.clientId
    ? projects.filter((project) => project.clientId === values.clientId)
    : projects
  const availableVideos = values.projectId
    ? videos.filter((video) => video.projectId === values.projectId)
    : values.clientId
      ? videos.filter((video) => video.clientId === values.clientId)
      : videos

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!values.title.trim()) {
      setError('Informe o título da tarefa.')
      return
    }

    const payload = {
      title: values.title.trim(),
      description: text(values.description),
      responsible: text(values.responsible),
      priority: values.priority,
      status: values.status,
      deadline: text(values.deadline),
      clientId: text(values.clientId),
      projectId: text(values.projectId),
      videoId: text(values.videoId),
    }

    if (task) {
      const updated = tasksStore.update(task.id, payload)
      if (updated) {
        logUpdated('task', task.id, updated.title, 'Tarefa atualizada.')
        if (task.status !== payload.status) {
          logStatusChange('task', task.id, updated.title, task.status, payload.status)
        }
        onSaved?.(updated)
      }
    } else {
      const created = tasksStore.create(payload)
      logCreated('task', created.id, created.title)
      onSaved?.(created)
    }

    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
      <DialogHeader>
        <DialogTitle>{task ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
        <DialogDescription>
          {task ? 'Altere prazo, prioridade e vínculos.' : 'Registre algo que precisa ser feito.'}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-6">
        <Field label="Título">
          <Input
            value={values.title}
            onChange={(event) => set('title', event.target.value)}
            placeholder="O que precisa ser feito?"
            autoFocus
          />
        </Field>

        <Field label="Descrição">
          <Textarea
            value={values.description}
            onChange={(event) => set('description', event.target.value)}
            className="min-h-16"
          />
        </Field>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Status">
            <Select
              value={values.status}
              onValueChange={(value) => set('status', value as TaskStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toOptions(TASK_STATUS_LABEL).map((option) => (
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
          <Field label="Responsável">
            <Input
              value={values.responsible}
              onChange={(event) => set('responsible', event.target.value)}
            />
          </Field>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <Field label="Cliente">
            <Select
              value={values.clientId || NONE}
              onValueChange={(value) =>
                setValues((current) => ({
                  ...current,
                  clientId: value === NONE ? '' : value,
                  // Trocar de cliente invalida projeto e vídeo escolhidos antes.
                  projectId: '',
                  videoId: '',
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem cliente</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Projeto">
            <Select
              value={values.projectId || NONE}
              onValueChange={(value) => {
                if (value === NONE) {
                  setValues((current) => ({ ...current, projectId: '', videoId: '' }))
                  return
                }
                const project = projects.find((item) => item.id === value)
                setValues((current) => ({
                  ...current,
                  projectId: value,
                  clientId: project?.clientId ?? current.clientId,
                  videoId: '',
                }))
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem projeto</SelectItem>
                {availableProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Vídeo">
            <Select
              value={values.videoId || NONE}
              onValueChange={(value) => {
                if (value === NONE) {
                  set('videoId', '')
                  return
                }
                const video = videos.find((item) => item.id === value)
                setValues((current) => ({
                  ...current,
                  videoId: value,
                  projectId: video?.projectId ?? current.projectId,
                  clientId: video?.clientId ?? current.clientId,
                }))
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem vídeo</SelectItem>
                {availableVideos.map((video) => (
                  <SelectItem key={video.id} value={video.id}>
                    {video.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </section>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </DialogBody>

      <DialogFooter>
        <Button type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary">
          {task ? 'Salvar alterações' : 'Criar tarefa'}
        </Button>
      </DialogFooter>
    </form>
  )
}
