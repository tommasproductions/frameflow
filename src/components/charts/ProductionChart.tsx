import { StageBars } from '@/components/charts/StageBars'
import { VIDEO_STATUS_LABEL, VIDEO_STATUS_ORDER, VIDEO_STATUS_TONE } from '@/lib/constants'
import type { VideoStatus } from '@/types'

/** Distribuição dos vídeos pelas etapas da esteira de produção. */
export function ProductionChart({ counts }: { counts: Record<VideoStatus, number> }) {
  return (
    <StageBars
      items={VIDEO_STATUS_ORDER.map((status) => ({
        key: status,
        label: VIDEO_STATUS_LABEL[status],
        count: counts[status],
        tone: VIDEO_STATUS_TONE[status],
        to: `/production?status=${status}`,
      }))}
    />
  )
}
