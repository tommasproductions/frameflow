import { StageBars } from '@/components/charts/StageBars'
import { LEAD_STAGE_LABEL, LEAD_STAGE_ORDER, LEAD_STAGE_TONE } from '@/lib/constants'
import type { LeadStage } from '@/types'

/** Contagem de leads por etapa do funil, na ordem do pipeline. */
export function FunnelChart({ counts }: { counts: Record<LeadStage, number> }) {
  return (
    <StageBars
      items={LEAD_STAGE_ORDER.map((stage) => ({
        key: stage,
        label: LEAD_STAGE_LABEL[stage],
        count: counts[stage],
        tone: LEAD_STAGE_TONE[stage],
        to: `/leads?stage=${stage}`,
      }))}
    />
  )
}
