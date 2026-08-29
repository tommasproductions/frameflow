import { Compass } from 'lucide-react'
import { Link, useRouteError } from 'react-router-dom'

import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'

/** Rota inexistente ou erro não tratado dentro do layout. */
export function NotFound() {
  const error = useRouteError() as { statusText?: string; message?: string } | null

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <EmptyState
          icon={Compass}
          title="Página não encontrada"
          description={
            error?.statusText ??
            error?.message ??
            'O endereço acessado não corresponde a nenhuma tela do FrameFlow.'
          }
        />
        <Button asChild variant="primary">
          <Link to="/">Voltar ao dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
