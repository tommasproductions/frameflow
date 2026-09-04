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
import { Field, Input, Label, Textarea } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/misc'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClients } from '@/hooks/useClients'
import { logCreated, logStatusChange, logUpdated } from '@/lib/activity'
import { PROJECT_STATUS_LABEL, VIDEO_TYPE_LABEL, toOptions } from '@/lib/constants'
import { projectsStore } from '@/lib/store'
import { applyVideoTemplate, defaultTemplate, type VideoTemplate } from '@/lib/templates'
import { formatCurrency, today } from '@/lib/utils'
import { ProjectStatus, VideoType, type Project } from '@/types'

interface ProjectFormValues {
  name: string
  clientId: string
  description: string
  type: string
  status: ProjectStatus
  startDate: string
  deadline: string
  contractedValue: string
  estimatedCost: string
  responsible: string
  notes: string
}

function emptyValues(clientId: string): ProjectFormValues {
  return {
    name: '',
    clientId,
    description: '',
    type: '',
    status: ProjectStatus.PLANNING,
    startDate: today(),
    deadline: '',
    contractedValue: '',
    estimatedCost: '',
    responsible: '',
    notes: '',
  }
}

function fromProject(project: Project): ProjectFormValues {
  return {
    name: project.name,
    clientId: project.clientId,
    description: project.description ?? '',
    type: project.type ?? '',
    status: project.status,
    startDate: project.startDate ?? '',
    deadline: project.deadline ?? '',
    contractedValue: String(project.contractedValue),
    estimatedCost: String(project.estimatedCost),
    responsible: project.responsible ?? '',
    notes: project.notes ?? '',
  }
}

const text = (value: string): string | null => value.trim() || null
const num = (value: string): number => (value.trim() === '' ? 0 : Number(value))

export function ProjectForm({
  open,
  onOpenChange,
  project,
  defaultClientId = '',
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project
  /** Pré-seleciona o cliente quando o formulário abre da página dele. */
  defaultClientId?: string
  onSaved?: (project: Project) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <ProjectFormBody
          project={project}
          defaultClientId={defaultClientId}
          onSaved={onSaved}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function ProjectFormBody({
  project,
  defaultClientId,
  onSaved,
  onClose,
}: {
  project?: Project
  defaultClientId: string
  onSaved?: (project: Project) => void
  onClose: () => void
}) {
  const { clients } = useClients()
  const [values, setValues] = useState<ProjectFormValues>(() =>
    project ? fromProject(project) : emptyValues(defaultClientId),
  )
  const [useTemplate, setUseTemplate] = useState(false)
  const [template, setTemplate] = useState<VideoTemplate>(() =>
    defaultTemplate({ contractedValue: 0, startDate: null }),
  )
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const setTpl = <K extends keyof VideoTemplate>(key: K, value: VideoTemplate[K]) =>
    setTemplate((current) => ({ ...current, [key]: value }))

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!values.name.trim()) {
      setError('Informe o nome do projeto.')
      return
    }
    if (!values.clientId) {
      setError('Selecione o cliente do projeto.')
      return
    }
    if (values.startDate && values.deadline && values.deadline < values.startDate) {
      setError('O prazo não pode ser anterior ao início.')
      return
    }

    const payload = {
      name: values.name.trim(),
      clientId: values.clientId,
      description: text(values.description),
      type: text(values.type),
      status: values.status,
      startDate: text(values.startDate),
      deadline: text(values.deadline),
      contractedValue: num(values.contractedValue),
      estimatedCost: num(values.estimatedCost),
      responsible: text(values.responsible),
      notes: text(values.notes),
    }

    if (project) {
      const updated = projectsStore.update(project.id, payload)
      if (updated) {
        logUpdated('project', project.id, updated.name, 'Dados do projeto atualizados.')
        if (project.status !== payload.status) {
          logStatusChange('project', project.id, updated.name, project.status, payload.status)
        }
        onSaved?.(updated)
      }
    } else {
      const created = projectsStore.create(payload)
      logCreated('project', created.id, created.name, `Valor contratado: ${formatCurrency(created.contractedValue)}.`)

      if (useTemplate && template.quantity > 0) {
        applyVideoTemplate(created, {
          ...template,
          firstDeadline: template.firstDeadline || created.startDate || today(),
        })
      }

      onSaved?.(created)
    }

    onClose()
  }

  // Sugere valor por vídeo e prazo inicial conforme o projeto vai sendo preenchido.
  function toggleTemplate(next: boolean) {
    setUseTemplate(next)
    if (next) {
      setTemplate(
        defaultTemplate({
          contractedValue: num(values.contractedValue),
          startDate: text(values.startDate),
        }),
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
      <DialogHeader>
        <DialogTitle>{project ? 'Editar projeto' : 'Novo projeto'}</DialogTitle>
        <DialogDescription>
          {project
            ? 'Altere escopo, prazos e valores do projeto.'
            : 'Abra um projeto para um cliente e, se quiser, já crie os vídeos.'}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome do projeto" className="sm:col-span-2">
            <Input
              value={values.name}
              onChange={(event) => set('name', event.target.value)}
              placeholder="Ex.: Canal YouTube — Setembro"
              autoFocus
            />
          </Field>

          <Field label="Cliente">
            <Select value={values.clientId} onValueChange={(value) => set('clientId', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Tipo" hint="Rótulo livre: YouTube, Instagram, Anúncios…">
            <Input
              value={values.type}
              onChange={(event) => set('type', event.target.value)}
              placeholder="YouTube"
            />
          </Field>

          <Field label="Descrição" className="sm:col-span-2">
            <Textarea
              value={values.description}
              onChange={(event) => set('description', event.target.value)}
              placeholder="Escopo combinado com o cliente"
              className="min-h-16"
            />
          </Field>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <Field label="Status">
            <Select
              value={values.status}
              onValueChange={(value) => set('status', value as ProjectStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toOptions(PROJECT_STATUS_LABEL).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Início">
            <Input
              type="date"
              value={values.startDate}
              onChange={(event) => set('startDate', event.target.value)}
            />
          </Field>
          <Field label="Prazo">
            <Input
              type="date"
              value={values.deadline}
              onChange={(event) => set('deadline', event.target.value)}
            />
          </Field>

          <Field label="Valor contratado (R$)">
            <Input
              type="number"
              min={0}
              step="any"
              value={values.contractedValue}
              onChange={(event) => set('contractedValue', event.target.value)}
            />
          </Field>
          <Field label="Custo estimado (R$)">
            <Input
              type="number"
              min={0}
              step="any"
              value={values.estimatedCost}
              onChange={(event) => set('estimatedCost', event.target.value)}
            />
          </Field>
          <Field label="Responsável">
            <Input
              value={values.responsible}
              onChange={(event) => set('responsible', event.target.value)}
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

        {/* Template só faz sentido ao criar: num projeto que já existe, os
            vídeos são adicionados pela própria página dele. */}
        {!project ? (
          <section className="space-y-3 rounded-lg border border-line p-3">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="use-template"
                checked={useTemplate}
                onCheckedChange={(checked) => toggleTemplate(checked === true)}
              />
              <Label htmlFor="use-template" className="text-sm text-ink">
                Criar os vídeos automaticamente
              </Label>
            </div>

            {useTemplate ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Quantidade">
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={template.quantity}
                      onChange={(event) => setTpl('quantity', Number(event.target.value))}
                    />
                  </Field>
                  <Field label="Tipo de vídeo">
                    <Select
                      value={template.type}
                      onValueChange={(value) => setTpl('type', value as VideoType)}
                    >
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
                  <Field label="Prefixo do título">
                    <Input
                      value={template.titlePrefix}
                      onChange={(event) => setTpl('titlePrefix', event.target.value)}
                      placeholder="Vídeo"
                    />
                  </Field>

                  <Field label="Valor por vídeo (R$)">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={template.valuePerVideo}
                      onChange={(event) => setTpl('valuePerVideo', Number(event.target.value))}
                    />
                  </Field>
                  <Field label="Horas estimadas">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={template.estimatedHours}
                      onChange={(event) => setTpl('estimatedHours', Number(event.target.value))}
                    />
                  </Field>
                  <Field label="Intervalo (dias)">
                    <Input
                      type="number"
                      min={1}
                      value={template.intervalDays}
                      onChange={(event) => setTpl('intervalDays', Number(event.target.value))}
                    />
                  </Field>

                  <Field label="Prazo do primeiro" className="sm:col-span-2">
                    <Input
                      type="date"
                      value={template.firstDeadline}
                      onChange={(event) => setTpl('firstDeadline', event.target.value)}
                    />
                  </Field>
                </div>

                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="template-tasks"
                    checked={template.createTasks}
                    onCheckedChange={(checked) => setTpl('createTasks', checked === true)}
                  />
                  <Label htmlFor="template-tasks" className="text-sm text-ink-dim">
                    Criar também uma tarefa de recebimento de material por vídeo
                  </Label>
                </div>

                <p className="text-xs text-ink-faint">
                  {template.quantity} vídeos em briefing, somando{' '}
                  {formatCurrency(template.quantity * template.valuePerVideo)} e{' '}
                  {template.quantity * template.estimatedHours}h estimadas.
                </p>
              </>
            ) : null}
          </section>
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </DialogBody>

      <DialogFooter>
        <Button type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary">
          {project ? 'Salvar alterações' : 'Criar projeto'}
        </Button>
      </DialogFooter>
    </form>
  )
}
