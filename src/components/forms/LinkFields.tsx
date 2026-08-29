import { Field } from '@/components/ui/input'
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

/** Radix não aceita item com valor vazio; este é o "sem vínculo". */
const NONE = '__none'

export interface LinkValues {
  clientId: string
  projectId: string
  videoId: string
}

/**
 * Selects de cliente, projeto e vídeo.
 *
 * Os três são hierárquicos: escolher um projeto restringe os vídeos e preenche
 * o cliente; escolher um vídeo determina os outros dois. Sem isso é fácil
 * lançar um custo no projeto de um cliente e no vídeo de outro — e os totais
 * por cliente deixariam de fechar.
 */
export function LinkFields({
  values,
  onChange,
  /** Quais campos mostrar. Contratos, por exemplo, só têm cliente. */
  fields = ['client', 'project', 'video'],
}: {
  values: LinkValues
  onChange: (values: LinkValues) => void
  fields?: ('client' | 'project' | 'video')[]
}) {
  const { clients } = useClients()
  const { projects } = useProjects()
  const { videos } = useVideos()

  const availableProjects = values.clientId
    ? projects.filter((project) => project.clientId === values.clientId)
    : projects
  const availableVideos = values.projectId
    ? videos.filter((video) => video.projectId === values.projectId)
    : values.clientId
      ? videos.filter((video) => video.clientId === values.clientId)
      : videos

  return (
    <>
      {fields.includes('client') ? (
        <Field label="Cliente">
          <Select
            value={values.clientId || NONE}
            onValueChange={(value) =>
              onChange(
                value === NONE
                  ? { clientId: '', projectId: '', videoId: '' }
                  : // Trocar de cliente invalida projeto e vídeo já escolhidos.
                    { clientId: value, projectId: '', videoId: '' },
              )
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
      ) : null}

      {fields.includes('project') ? (
        <Field label="Projeto">
          <Select
            value={values.projectId || NONE}
            onValueChange={(value) => {
              if (value === NONE) {
                onChange({ ...values, projectId: '', videoId: '' })
                return
              }
              const project = projects.find((item) => item.id === value)
              onChange({
                clientId: project?.clientId ?? values.clientId,
                projectId: value,
                videoId: '',
              })
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
      ) : null}

      {fields.includes('video') ? (
        <Field label="Vídeo">
          <Select
            value={values.videoId || NONE}
            onValueChange={(value) => {
              if (value === NONE) {
                onChange({ ...values, videoId: '' })
                return
              }
              const video = videos.find((item) => item.id === value)
              onChange({
                clientId: video?.clientId ?? values.clientId,
                projectId: video?.projectId ?? values.projectId,
                videoId: value,
              })
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
      ) : null}
    </>
  )
}
