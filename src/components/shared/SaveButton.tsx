import { Check, CloudOff, Loader2, Save, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/misc'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { pushAll } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * Estado da gravação e o botão de salvar agora.
 *
 * A escrita é otimista: a tela confirma antes do banco responder, e quase
 * sempre dá certo. O problema aparece quando não dá — a fila descarta a
 * operação que falhou, o banco fica atrás da tela, e recarregar a página
 * devolve o estado antigo sem aviso. O indicador morava dentro do menu da
 * conta, onde ninguém olha enquanto trabalha.
 *
 * Aqui ele fica no caminho: discreto quando está tudo salvo, impossível de
 * ignorar quando falhou, e clicável para reenviar tudo sem recarregar nada.
 */
export function SaveButton() {
  const { status, error } = useSyncStatus()

  const state = {
    saving: { icon: Loader2, label: 'Salvando…', spin: true },
    synced: { icon: Check, label: 'Salvo', spin: false },
    loading: { icon: Loader2, label: 'Carregando…', spin: true },
    error: { icon: TriangleAlert, label: 'Falha ao salvar', spin: false },
    offline: { icon: CloudOff, label: 'Desconectado', spin: false },
  }[status]

  const failed = status === 'error'
  const busy = status === 'saving' || status === 'loading'
  const Icon = failed ? TriangleAlert : busy ? state.icon : Save

  return (
    <Tooltip
      content={
        failed
          ? `${error ?? state.label} — clique para tentar de novo`
          : 'Salvar agora (Ctrl+S)'
      }
    >
      <Button
        variant={failed ? 'secondary' : 'ghost'}
        size={failed ? 'sm' : 'icon-sm'}
        onClick={() => pushAll()}
        disabled={busy || status === 'offline'}
        aria-label={`${state.label}. Salvar agora.`}
        className={cn(failed && 'text-danger')}
      >
        <Icon className={cn(state.spin && 'animate-spin')} />
        {/*
          Só o estado de falha carrega texto. "Salvo" escrito por extenso a
          cada ação vira ruído; "Falha ao salvar" precisa ser lido.
        */}
        {failed ? <span>Falha ao salvar</span> : null}
      </Button>
    </Tooltip>
  )
}
