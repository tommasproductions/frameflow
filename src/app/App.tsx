import { Loader2, TriangleAlert } from 'lucide-react'
import { RouterProvider } from 'react-router-dom'

import { AuthProvider, useAuth } from '@/app/auth'
import { router } from '@/app/routes'
import { Button } from '@/components/ui/button'
import { LoginPage } from '@/pages/auth/LoginPage'

export function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}

/**
 * Decide o que existe na tela conforme a sessão.
 *
 * O roteador só é montado quando os dados já estão em memória. É deliberado:
 * as telas leem o store de forma síncrona e assumem que ele reflete a conta
 * certa. Montá-las antes mostraria, por um instante, um sistema vazio — ou
 * pior, o da sessão anterior.
 */
function AuthGate() {
  const { state, error, retry, signOut } = useAuth()

  if (state === 'signed-out') return <LoginPage />

  if (state === 'checking' || state === 'loading-data') {
    return (
      <FullScreen>
        <Loader2 className="size-5 animate-spin text-ink-dim" />
        <p className="text-sm text-ink-dim">
          {state === 'checking' ? 'Verificando sessão…' : 'Carregando seus dados…'}
        </p>
      </FullScreen>
    )
  }

  if (state === 'failed') {
    return (
      <FullScreen>
        <TriangleAlert className="size-5 text-danger" />
        <p className="text-sm font-medium text-ink">Não foi possível carregar seus dados.</p>
        <p className="max-w-md text-center text-sm text-ink-dim">{error}</p>
        <p className="max-w-md text-center text-xs text-ink-faint">
          Se a mensagem citar uma tabela que não existe, o esquema ainda não foi criado no
          Supabase — rode <code className="text-ink-dim">supabase/schema.sql</code> no SQL Editor.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Button variant="primary" onClick={retry}>
            Tentar de novo
          </Button>
          <Button onClick={() => void signOut()}>Sair</Button>
        </div>
      </FullScreen>
    )
  }

  return <RouterProvider router={router} />
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas p-4">
      {children}
    </div>
  )
}
