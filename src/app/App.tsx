import { Loader2, TriangleAlert } from 'lucide-react'
import { RouterProvider } from 'react-router-dom'

import { AuthProvider, useAuth } from '@/app/auth'
import { router } from '@/app/routes'
import { Button } from '@/components/ui/button'
import { LoginPage } from '@/pages/auth/LoginPage'
import { configError } from '@/lib/supabase'

export function App() {
  // Verificado antes de montar o AuthProvider: sem configuração não há sessão
  // possível, e tentar buscá-la só produziria um erro pior de entender.
  if (configError) return <ConfigError />

  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}

/**
 * Build publicada sem as variáveis de ambiente.
 *
 * O Vite grava `import.meta.env` no bundle durante o build, não em tempo de
 * execução. Definir as variáveis depois não corrige a build já publicada — é
 * preciso reconstruir, e é isso que a tela precisa dizer.
 */
function ConfigError() {
  return (
    <FullScreen>
      <TriangleAlert className="size-5 text-warning" />
      <p className="text-sm font-medium text-ink">Configuração ausente</p>
      <p className="max-w-md text-center text-sm text-ink-dim">{configError}</p>
      <div className="mt-1 max-w-md space-y-2 text-xs text-ink-faint">
        <p>
          O Vite grava essas variáveis no código durante o build. Defini-las depois não
          conserta uma build já publicada.
        </p>
        <p>
          Na Vercel: <span className="text-ink-dim">Settings → Environment Variables</span>, e
          depois <span className="text-ink-dim">Deployments → ⋯ → Redeploy</span> para
          reconstruir com elas.
        </p>
        <p>
          Localmente: copie <code className="text-ink-dim">.env.example</code> para{' '}
          <code className="text-ink-dim">.env.local</code> e reinicie o servidor.
        </p>
      </div>
    </FullScreen>
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
