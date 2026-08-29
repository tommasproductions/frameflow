import {
  Clapperboard,
  Clock,
  ExternalLink,
  Link2,
  MessageSquare,
  MoreVertical,
  Pencil,
  Plus,
  Send,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { TaskForm } from '@/components/forms/TaskForm'
import { VideoForm } from '@/components/forms/VideoForm'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, Input, Label, Textarea } from '@/components/ui/input'
import { Checkbox, Progress } from '@/components/ui/misc'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClients } from '@/hooks/useClients'
import { useProjects } from '@/hooks/useProjects'
import { useTasks } from '@/hooks/useTasks'
import { useVideoRevisions } from '@/hooks/useVideoRevisions'
import { useVideos } from '@/hooks/useVideos'
import { logDeleted, logStatusChange, logUpdated } from '@/lib/activity'
import { checklistProgress } from '@/lib/calculations'
import {
  applyStatusToChecklist,
  CHECKLIST_ITEMS,
  REVISION_STATUS_LABEL,
  VIDEO_STATUS_LABEL,
  VIDEO_TYPE_LABEL,
  toOptions,
} from '@/lib/constants'
import { videoRevisionsStore } from '@/lib/store'
import {
  cn,
  deadlineLabel,
  formatDate,
  formatDuration,
  formatHours,
  generateId,
  now,
  sortBy,
  today,
} from '@/lib/utils'
import {
  RevisionStatus,
  TaskStatus,
  VideoStatus,
  type FileLink,
  type VideoChecklistKey,
} from '@/types'

export function VideoDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { byId, update, remove } = useVideos()
  const { byId: projectById } = useProjects()
  const { byId: clientById } = useClients()
  const { revisions, removeWhere: removeRevisions } = useVideoRevisions()
  const { tasks, update: updateTask } = useTasks()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [revComments, setRevComments] = useState('')
  const [revChanges, setRevChanges] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  const video = byId(id)

  if (!video) {
    return (
      <div className="space-y-6">
        <PageHeader title="Vídeo" breadcrumbs={[{ label: 'Produção', to: '/production' }]} />
        <EmptyState
          icon={Clapperboard}
          title="Vídeo não encontrado"
          description="Ele pode ter sido removido ou o endereço está incorreto."
          actionLabel="Voltar para a esteira"
          onAction={() => navigate('/production')}
        />
      </div>
    )
  }

  const project = projectById(video.projectId)
  const client = clientById(video.clientId)
  const videoRevisions = sortBy(
    revisions.filter((revision) => revision.videoId === video.id),
    (revision) => revision.version,
    'desc',
  )
  const openRevisions = videoRevisions.filter((r) => r.status !== RevisionStatus.COMPLETED)
  const videoTasks = tasks.filter((task) => task.videoId === video.id)
  const progress = checklistProgress(video)
  const due = deadlineLabel(video.deadline)
  const closed = video.status === VideoStatus.APPROVED || video.status === VideoStatus.DELIVERED
  const overHours =
    video.estimatedHours !== null &&
    video.workedHours !== null &&
    video.workedHours > video.estimatedHours

  function toggleChecklist(key: VideoChecklistKey, checked: boolean) {
    if (!video) return
    update(video.id, { checklist: { ...video.checklist, [key]: checked } })
  }

  function changeStatus(next: VideoStatus) {
    if (!video || next === video.status) return
    update(video.id, { status: next, checklist: applyStatusToChecklist(next, video.checklist) })
    logStatusChange('video', video.id, video.title, video.status, next)
  }

  /**
   * Registro de revisão: a versão é a próxima da sequência e o vídeo volta
   * para "alterações", que é o estado real quando o cliente pede mudanças.
   */
  function addRevision(event: React.FormEvent) {
    event.preventDefault()
    if (!video || !revChanges.trim()) return

    const nextVersion = videoRevisions.length
      ? Math.max(...videoRevisions.map((r) => r.version)) + 1
      : 1

    videoRevisionsStore.create({
      videoId: video.id,
      version: nextVersion,
      date: today(),
      comments: revComments.trim() || null,
      changesRequested: revChanges.trim(),
      status: RevisionStatus.PENDING,
    })

    if (video.status !== VideoStatus.CHANGES) {
      update(video.id, { status: VideoStatus.CHANGES })
      logStatusChange(
        'video',
        video.id,
        video.title,
        video.status,
        VideoStatus.CHANGES,
        `Revisão v${nextVersion} registrada.`,
      )
    } else {
      logUpdated('video', video.id, video.title, `Revisão v${nextVersion} registrada.`)
    }

    setRevComments('')
    setRevChanges('')
    setRevisionOpen(false)
  }

  function setRevisionStatus(revisionId: string, status: RevisionStatus) {
    videoRevisionsStore.update(revisionId, { status })
  }

  /** Fecha o ciclo de alterações e devolve o vídeo ao cliente. */
  function resendToClient() {
    if (!video) return
    videoRevisions
      .filter((r) => r.status !== RevisionStatus.COMPLETED)
      .forEach((r) => videoRevisionsStore.update(r.id, { status: RevisionStatus.COMPLETED }))

    update(video.id, {
      status: VideoStatus.SENT_TO_CLIENT,
      checklist: { ...video.checklist, changesApplied: true, sentToClient: true },
    })
    logStatusChange(
      'video',
      video.id,
      video.title,
      video.status,
      VideoStatus.SENT_TO_CLIENT,
      'Alterações aplicadas e nova versão enviada.',
    )
  }

  function addFileLink(event: React.FormEvent) {
    event.preventDefault()
    if (!video || !linkLabel.trim() || !linkUrl.trim()) return

    const link: FileLink = {
      id: generateId('link'),
      videoId: video.id,
      label: linkLabel.trim(),
      url: linkUrl.trim(),
      createdAt: now(),
    }
    update(video.id, { fileLinks: [...video.fileLinks, link] })
    setLinkLabel('')
    setLinkUrl('')
  }

  function removeFileLink(linkId: string) {
    if (!video) return
    update(video.id, { fileLinks: video.fileLinks.filter((link) => link.id !== linkId) })
  }

  function handleDelete() {
    if (!video) return
    // As tarefas não são apagadas junto: elas costumam descrever trabalho que
    // ainda faz sentido. Só perdem o vínculo com o vídeo.
    for (const task of videoTasks) updateTask(task.id, { videoId: null })
    removeRevisions((revision) => revision.videoId === video.id)
    remove(video.id)
    logDeleted('video', video.id, video.title)
    navigate('/production')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={video.title}
        description={
          project ? `${client?.name ?? 'Cliente removido'} · ${project.name}` : 'Projeto removido'
        }
        breadcrumbs={[
          { label: 'Produção', to: '/production' },
          ...(project ? [{ label: project.name, to: `/projects/${project.id}` }] : []),
          { label: video.title },
        ]}
        actions={
          <>
            {video.status === VideoStatus.CHANGES ? (
              <Button variant="primary" onClick={resendToClient}>
                <Send />
                Reenviar ao cliente
              </Button>
            ) : null}
            <Button onClick={() => setEditOpen(true)}>
              <Pencil />
              Editar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Mais ações">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setTaskOpen(true)}>
                  <Plus />
                  Nova tarefa
                </DropdownMenuItem>
                <DropdownMenuItem variant="danger" onSelect={() => setDeleteOpen(true)}>
                  <Trash2 />
                  Excluir vídeo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge type="video" status={video.status} dot />
        <PriorityBadge priority={video.priority} />
        <span className="text-xs text-ink-faint">{VIDEO_TYPE_LABEL[video.type]}</span>
        <span
          className={cn(
            'text-xs',
            due.overdue && !closed ? 'font-medium text-danger' : 'text-ink-faint',
          )}
        >
          Prazo {formatDate(video.deadline)} · {due.text}
        </span>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Valor" value={video.value} format="currency" icon={Wallet} />
        <MetricCard
          label="Horas trabalhadas"
          value={video.workedHours}
          format="hours"
          icon={Clock}
          tone={overHours ? 'warning' : undefined}
          hint={
            video.estimatedHours !== null
              ? `${formatHours(video.estimatedHours)} estimadas`
              : 'sem estimativa'
          }
        />
        <MetricCard
          label="Valor por hora"
          value={video.workedHours ? video.value / video.workedHours : null}
          format="currency"
          hint={overHours ? 'acima da estimativa' : 'dentro da estimativa'}
          tone={overHours ? 'warning' : undefined}
        />
        <MetricCard
          label="Checklist"
          value={progress}
          format="percentage"
          hint={`${Object.values(video.checklist).filter(Boolean).length} de ${CHECKLIST_ITEMS.length} etapas`}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          {/* -------------------------------- Checklist ------------------------------- */}
          <Card>
            <CardHeader>
              <div className="min-w-0 flex-1">
                <CardTitle>Checklist de produção</CardTitle>
                <p className="text-xs text-ink-dim">
                  Mover o card na esteira marca as etapas automaticamente.
                </p>
              </div>
              <span className="tabular shrink-0 text-xs text-ink-faint">
                {Math.round(progress)}%
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress} tone={progress === 100 ? 'success' : 'accent'} />

              <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {CHECKLIST_ITEMS.map((item) => (
                  <div key={item.key} className="flex items-center gap-2.5 py-1">
                    <Checkbox
                      id={`check-${item.key}`}
                      checked={video.checklist[item.key]}
                      onCheckedChange={(checked) => toggleChecklist(item.key, checked === true)}
                    />
                    <Label
                      htmlFor={`check-${item.key}`}
                      className={cn(
                        'cursor-pointer text-sm',
                        video.checklist[item.key] ? 'text-ink-faint line-through' : 'text-ink-dim',
                      )}
                    >
                      {item.label}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* -------------------------------- Revisões -------------------------------- */}
          <Card>
            <CardHeader>
              <div className="min-w-0 flex-1">
                <CardTitle>Revisões</CardTitle>
                <p className="text-xs text-ink-dim">
                  {openRevisions.length > 0
                    ? `${openRevisions.length} em aberto`
                    : 'nenhuma pendente'}
                </p>
              </div>
              <Button size="sm" onClick={() => setRevisionOpen((value) => !value)}>
                <Plus />
                Nova revisão
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {revisionOpen ? (
                <form onSubmit={addRevision} className="space-y-2 rounded-lg border border-line p-3">
                  <Field label="Alterações solicitadas">
                    <Textarea
                      value={revChanges}
                      onChange={(event) => setRevChanges(event.target.value)}
                      placeholder="O que o cliente pediu para mudar"
                      className="min-h-16"
                      autoFocus
                    />
                  </Field>
                  <Field label="Comentários">
                    <Input
                      value={revComments}
                      onChange={(event) => setRevComments(event.target.value)}
                      placeholder="Resumo curto (opcional)"
                    />
                  </Field>
                  <div className="flex items-center gap-2">
                    <Button type="submit" variant="primary" size="sm" disabled={!revChanges.trim()}>
                      Registrar revisão
                    </Button>
                    <Button type="button" size="sm" onClick={() => setRevisionOpen(false)}>
                      Cancelar
                    </Button>
                  </div>
                  <p className="text-xs text-ink-faint">
                    O vídeo volta para “alterações” ao registrar.
                  </p>
                </form>
              ) : null}

              {videoRevisions.length === 0 ? (
                <EmptyState
                  size="inline"
                  icon={MessageSquare}
                  title="Nenhuma revisão"
                  description="Registre o que o cliente pedir para acompanhar o retrabalho."
                />
              ) : (
                <ol className="space-y-3">
                  {videoRevisions.map((revision) => (
                    <li key={revision.id} className="rounded-lg border border-line p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="tabular rounded-sm bg-hover px-1.5 py-0.5 text-xs font-medium text-ink">
                            v{revision.version}
                          </span>
                          <span className="text-xs text-ink-faint">{formatDate(revision.date)}</span>
                        </div>
                        <Select
                          value={revision.status}
                          onValueChange={(value) =>
                            setRevisionStatus(revision.id, value as RevisionStatus)
                          }
                        >
                          <SelectTrigger
                            className="h-7 w-40 text-xs"
                            aria-label={`Status da revisão v${revision.version}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {toOptions(REVISION_STATUS_LABEL).map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {revision.comments ? (
                        <p className="mt-2 text-sm font-medium text-ink">{revision.comments}</p>
                      ) : null}
                      {revision.changesRequested ? (
                        <p className="mt-1 text-sm text-ink-dim">{revision.changesRequested}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* ------------------------------ Andamento ------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Andamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Etapa">
                <Select
                  value={video.status}
                  onValueChange={(value) => changeStatus(value as VideoStatus)}
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

              <dl className="space-y-2 border-t border-line pt-3 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-faint">Projeto</dt>
                  <dd className="min-w-0 truncate">
                    {project ? (
                      <Link to={`/projects/${project.id}`} className="text-accent hover:underline">
                        {project.name}
                      </Link>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-faint">Cliente</dt>
                  <dd className="min-w-0 truncate">
                    {client ? (
                      <Link to={`/clients/${client.id}`} className="text-accent hover:underline">
                        {client.name}
                      </Link>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-faint">Duração</dt>
                  <dd className="tabular text-ink-dim">{formatDuration(video.durationSeconds)}</dd>
                </div>
              </dl>

              {video.notes ? (
                <div className="space-y-1 border-t border-line pt-3">
                  <p className="text-xs font-medium text-ink-dim">Observações</p>
                  <p className="text-sm whitespace-pre-line text-ink-dim">{video.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* -------------------------------- Arquivos -------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Arquivos</CardTitle>
              <span className="tabular text-xs text-ink-faint">{video.fileLinks.length}</span>
            </CardHeader>
            <CardContent className="space-y-3">
              {video.fileLinks.length > 0 ? (
                <ul className="divide-y divide-line/60">
                  {video.fileLinks.map((link) => (
                    <li key={link.id} className="flex items-center gap-2 py-2">
                      <Link2 className="size-3.5 shrink-0 text-ink-faint" />
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="min-w-0 flex-1 truncate text-sm text-accent hover:underline"
                      >
                        {link.label}
                      </a>
                      <ExternalLink className="size-3 shrink-0 text-ink-faint" />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeFileLink(link.id)}
                        aria-label={`Remover ${link.label}`}
                      >
                        <X />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-faint">Nenhum link cadastrado.</p>
              )}

              <form onSubmit={addFileLink} className="flex gap-2 border-t border-line pt-3">
                <Input
                  value={linkLabel}
                  onChange={(event) => setLinkLabel(event.target.value)}
                  placeholder="Drive, Frame.io…"
                  aria-label="Nome do link"
                  className="w-32 shrink-0"
                />
                <Input
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  placeholder="https://"
                  aria-label="URL"
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="secondary"
                  disabled={!linkLabel.trim() || !linkUrl.trim()}
                  aria-label="Adicionar link"
                >
                  <Plus />
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* --------------------------------- Tarefas -------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Tarefas</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setTaskOpen(true)}>
                <Plus />
                Nova
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {videoTasks.length === 0 ? (
                <p className="py-2 text-sm text-ink-faint">Nenhuma tarefa vinculada.</p>
              ) : (
                <ul className="divide-y divide-line/60">
                  {videoTasks.map((task) => {
                    const taskDue = deadlineLabel(
                      task.deadline,
                      task.status === TaskStatus.DONE,
                    )
                    return (
                      <li key={task.id} className="flex items-center gap-2.5 py-2">
                        <Checkbox
                          checked={task.status === TaskStatus.DONE}
                          onCheckedChange={(checked) =>
                            updateTask(task.id, {
                              status: checked === true ? TaskStatus.DONE : TaskStatus.TODO,
                            })
                          }
                          aria-label={`Concluir ${task.title}`}
                        />
                        <span
                          className={cn(
                            'min-w-0 flex-1 truncate text-sm',
                            task.status === TaskStatus.DONE
                              ? 'text-ink-faint line-through'
                              : 'text-ink-dim',
                          )}
                        >
                          {task.title}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 text-xs',
                            taskDue.overdue && task.status !== TaskStatus.DONE
                              ? 'font-medium text-danger'
                              : 'text-ink-faint',
                          )}
                        >
                          {taskDue.text}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <VideoForm open={editOpen} onOpenChange={setEditOpen} video={video} />

      <TaskForm
        open={taskOpen}
        onOpenChange={setTaskOpen}
        defaults={{ clientId: video.clientId, projectId: video.projectId, videoId: video.id }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir vídeo?"
        confirmLabel="Excluir"
        message={
          <>
            <strong className="text-ink">{video.title}</strong> e suas {videoRevisions.length}{' '}
            revisões serão removidos.{' '}
            {videoTasks.length > 0
              ? `As ${videoTasks.length} tarefas vinculadas permanecem, sem o vínculo com o vídeo.`
              : ''}
          </>
        }
        onConfirm={handleDelete}
      />
    </div>
  )
}
