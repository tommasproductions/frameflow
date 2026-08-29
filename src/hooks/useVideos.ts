import { useEntity } from '@/hooks/useCollection'
import { videosStore } from '@/lib/store'

/** Vídeos na esteira de produção. */
export function useVideos() {
  const { items, ...operations } = useEntity(videosStore)
  return { videos: items, ...operations }
}
