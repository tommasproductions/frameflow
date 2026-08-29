import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAlerts, type Alert } from '@/hooks/useAlerts'
import { TONE_FILL, type Tone } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { NotificationType } from '@/types'

const TYPE_TONE: Record<NotificationType, Tone> = {
  overdue_video: 'danger',
  overdue_payment: 'danger',
  overdue_followup: 'warning',
  overdue_task: 'warning',
  upcoming_deadline: 'info',
  contract_renewal: 'accent',
}

/** Quantos alertas cabem no menu antes de mandar o usuário ao dashboard. */
const VISIBLE = 8

/** Alertas que exigem ação hoje — o número no badge. */
function isUrgent(alert: Alert): boolean {
  return alert.type === 'overdue_video' || alert.type === 'overdue_payment'
}

export function NotificationsMenu() {
  const navigate = useNavigate()
  const alerts = useAlerts()

  const urgent = alerts.filter(isUrgent).length
  const shown = alerts.slice(0, VISIBLE)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={
            alerts.length > 0 ? `Alertas: ${alerts.length} pendentes` : 'Alertas: nenhum pendente'
          }
        >
          <Bell />
          {alerts.length > 0 ? (
            <span
              className={cn(
                'tabular absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                urgent > 0 ? 'bg-danger text-white' : 'bg-accent text-on-accent',
              )}
            >
              {alerts.length > 9 ? '9+' : alerts.length}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5">
          <span className="text-sm font-medium text-ink">Alertas</span>
          <span className="tabular text-xs text-ink-faint">{alerts.length}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-0 my-0" />

        {alerts.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-ink-faint">
            Nada pendente. Tudo dentro do prazo.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto p-1">
            {shown.map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                onSelect={() => navigate(alert.to)}
                className="items-start gap-2.5 py-2"
              >
                <span
                  className={cn(
                    'mt-1.5 size-1.5 shrink-0 rounded-full',
                    TONE_FILL[TYPE_TONE[alert.type]],
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{alert.title}</span>
                  <span className="block truncate text-xs text-ink-faint">{alert.message}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        {alerts.length > VISIBLE ? (
          <>
            <DropdownMenuSeparator className="mx-0 my-0" />
            <DropdownMenuItem onSelect={() => navigate('/')} className="justify-center py-2">
              Ver os {alerts.length} alertas no dashboard
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
