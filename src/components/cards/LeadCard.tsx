import { CalendarClock, UserCheck, UserPlus } from 'lucide-react'

import { LEAD_SOURCE_LABEL } from '@/lib/constants'
import { cn, deadlineLabel, formatCurrency } from '@/lib/utils'
import { LeadStage, type Lead } from '@/types'

/**
 * Card do funil.
 *
 * Prioriza as três coisas que decidem o que fazer a seguir: quem é, quanto
 * vale e quando é o próximo contato. O follow-up vencido ganha destaque
 * vermelho porque é o único item do card que exige ação hoje.
 */
export function LeadCard({ lead }: { lead: Lead }) {
  const followUp = lead.nextFollowUpDate ? deadlineLabel(lead.nextFollowUpDate) : null
  const closed = lead.stage === LeadStage.CLOSED || lead.stage === LeadStage.LOST
  const dueToday = followUp ? followUp.overdue || followUp.text === 'hoje' : false

  return (
    <article className="rounded-lg border border-line bg-card p-2.5 transition-colors hover:border-line-active hover:bg-hover">
      <div className="flex items-start justify-between gap-2">
        <h4 className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{lead.name}</h4>
        {lead.closeProbability !== null && !closed ? (
          <span className="tabular shrink-0 text-xs text-ink-faint">{lead.closeProbability}%</span>
        ) : null}
      </div>

      <p className="mt-0.5 truncate text-xs text-ink-dim">
        {[lead.company, lead.niche].filter(Boolean).join(' · ') || 'Sem empresa'}
      </p>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="tabular text-sm font-semibold text-ink">
          {formatCurrency(lead.potentialValue)}
        </span>
        <span className="shrink-0 truncate text-xs text-ink-faint">
          {LEAD_SOURCE_LABEL[lead.source]}
        </span>
      </div>

      {lead.stage === LeadStage.CLOSED ? (
        <div className="mt-2 border-t border-line pt-2">
          {lead.convertedToClientId ? (
            <span className="flex items-center gap-1.5 text-xs text-success">
              <UserCheck className="size-3 shrink-0" />
              Na carteira de clientes
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-accent">
              <UserPlus className="size-3 shrink-0" />
              Falta converter em cliente
            </span>
          )}
        </div>
      ) : null}

      {followUp && !closed ? (
        <div
          className={cn(
            'mt-2 flex items-center gap-1.5 border-t border-line pt-2 text-xs',
            dueToday ? 'text-danger' : 'text-ink-dim',
          )}
        >
          <CalendarClock className="size-3 shrink-0" />
          <span className={cn('shrink-0', dueToday && 'font-medium')}>{followUp.text}</span>
          {lead.nextFollowUpAction ? (
            <span className="truncate text-ink-faint">· {lead.nextFollowUpAction}</span>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
