import { Badge } from '@/components/ui/badge'
import {
  CLIENT_STATUS_LABEL,
  CLIENT_STATUS_TONE,
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_TONE,
  LEAD_STAGE_LABEL,
  LEAD_STAGE_TONE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_TONE,
  REVISION_STATUS_LABEL,
  REVISION_STATUS_TONE,
  TASK_STATUS_LABEL,
  TASK_STATUS_TONE,
  VIDEO_STATUS_LABEL,
  VIDEO_STATUS_TONE,
  type Tone,
} from '@/lib/constants'
import type {
  ClientStatus,
  ContractStatus,
  LeadStage,
  PaymentStatus,
  ProjectStatus,
  RevisionStatus,
  TaskStatus,
  VideoStatus,
} from '@/types'

/**
 * O `type` escolhe o mapa de rótulo e cor, e o TypeScript exige o enum
 * correspondente — não dá para passar um `VideoStatus` num badge de pagamento.
 */
export type StatusBadgeProps = { className?: string; dot?: boolean } & (
  | { type: 'lead'; status: LeadStage }
  | { type: 'client'; status: ClientStatus }
  | { type: 'project'; status: ProjectStatus }
  | { type: 'video'; status: VideoStatus }
  | { type: 'task'; status: TaskStatus }
  | { type: 'payment'; status: PaymentStatus }
  | { type: 'contract'; status: ContractStatus }
  | { type: 'revision'; status: RevisionStatus }
)

function resolve(props: StatusBadgeProps): { label: string; tone: Tone } {
  switch (props.type) {
    case 'lead':
      return { label: LEAD_STAGE_LABEL[props.status], tone: LEAD_STAGE_TONE[props.status] }
    case 'client':
      return { label: CLIENT_STATUS_LABEL[props.status], tone: CLIENT_STATUS_TONE[props.status] }
    case 'project':
      return { label: PROJECT_STATUS_LABEL[props.status], tone: PROJECT_STATUS_TONE[props.status] }
    case 'video':
      return { label: VIDEO_STATUS_LABEL[props.status], tone: VIDEO_STATUS_TONE[props.status] }
    case 'task':
      return { label: TASK_STATUS_LABEL[props.status], tone: TASK_STATUS_TONE[props.status] }
    case 'payment':
      return { label: PAYMENT_STATUS_LABEL[props.status], tone: PAYMENT_STATUS_TONE[props.status] }
    case 'contract':
      return { label: CONTRACT_STATUS_LABEL[props.status], tone: CONTRACT_STATUS_TONE[props.status] }
    case 'revision':
      return { label: REVISION_STATUS_LABEL[props.status], tone: REVISION_STATUS_TONE[props.status] }
  }
}

export function StatusBadge(props: StatusBadgeProps) {
  const { label, tone } = resolve(props)
  return (
    <Badge tone={tone} dot={props.dot} className={props.className}>
      {label}
    </Badge>
  )
}
