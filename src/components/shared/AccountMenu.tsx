import { Check, CloudOff, Loader2, LogOut, TriangleAlert } from 'lucide-react'

import { useAuth } from '@/app/auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { cn, initials } from '@/lib/utils'

/**
 * Conta e estado de sincronização.
 *
 * O indicador existe porque a escrita é otimista: a tela confirma antes do
 * banco responder. Na esmagadora maioria das vezes dá certo e o ícone é ruído
 * — por isso "salvo" fica discreto e só o erro chama atenção.
 */
export function AccountMenu() {
  const { email, signOut } = useAuth()
  const { status, error } = useSyncStatus()

  const sync = {
    saving: { icon: Loader2, text: 'Salvando…', tone: 'text-ink-faint', spin: true },
    synced: { icon: Check, text: 'Salvo', tone: 'text-ink-faint', spin: false },
    loading: { icon: Loader2, text: 'Carregando…', tone: 'text-ink-faint', spin: true },
    error: { icon: TriangleAlert, text: 'Falha ao salvar', tone: 'text-danger', spin: false },
    offline: { icon: CloudOff, text: 'Desconectado', tone: 'text-ink-faint', spin: false },
  }[status]

  const SyncIcon = sync.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={`Conta de ${email ?? 'usuário'} — ${sync.text}`}
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-hover text-[10px] font-semibold text-ink-dim">
            {email ? initials(email.split('@')[0]) : '?'}
          </span>
          {status === 'error' ? (
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-danger" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="px-3 py-2">
          <span className="block truncate text-sm font-medium text-ink">{email}</span>
          <span className={cn('mt-1 flex items-center gap-1.5 text-xs', sync.tone)}>
            <SyncIcon className={cn('size-3', sync.spin && 'animate-spin')} />
            {sync.text}
          </span>
        </DropdownMenuLabel>

        {status === 'error' && error ? (
          <p className="px-3 pb-2 text-xs text-ink-faint">
            {error}
            <br />
            Seus dados na tela estão corretos, mas a última alteração pode não ter subido.
            Exporte um backup em Configurações antes de recarregar.
          </p>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger" onSelect={() => void signOut()}>
          <LogOut />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
