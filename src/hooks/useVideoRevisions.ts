import { useEntity } from '@/hooks/useCollection'
import { videoRevisionsStore } from '@/lib/store'

/** Rodadas de revisão dos vídeos. */
export function useVideoRevisions() {
  const { items, ...operations } = useEntity(videoRevisionsStore)
  return { revisions: items, ...operations }
}
