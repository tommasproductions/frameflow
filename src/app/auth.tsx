import type { Session } from '@supabase/supabase-js'
import { createContext, use, useEffect, useState, type ReactNode } from 'react'

import { loadAll, setCurrentUser } from '@/lib/persistence'
import { clearSession, installDatabase } from '@/lib/store'
import { supabase } from '@/lib/supabase'

/**
 * Sessão e ciclo de vida dos dados.
 *
 * Entrar é mais do que guardar um token: é trocar o conteúdo do store. Por isso
 * a carga do banco mora aqui e não numa tela — quando a sessão muda, os dados
 * da conta anterior precisam sair da memória antes que qualquer tela renderize.
 */

export type AuthState =
  | 'checking'
  | 'signed-out'
  | 'recovering'
  | 'loading-data'
  | 'ready'
  | 'failed'

interface AuthValue {
  state: AuthState
  session: Session | null
  email: string | null
  /** Mensagem de falha no carregamento dos dados, se houver. */
  error: string | null
  signOut: () => Promise<void>
  retry: () => void
  /** Encerra a troca de senha e segue para o carregamento dos dados. */
  finishRecovery: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>('checking')
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  // Uma única inscrição no Supabase resolve os dois casos: a sessão já gravada
  // no armazenamento do navegador e as trocas posteriores (login, logout,
  // renovação de token). O evento inicial chega sozinho.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)

      /*
       * O link de troca de senha abre uma sessão de verdade. Sem tratar este
       * evento à parte, a pessoa entraria direto no sistema e nunca chegaria a
       * definir a senha nova — continuaria sem saber a própria senha, e o link
       * do e-mail já teria sido gasto.
       */
      if (event === 'PASSWORD_RECOVERY') {
        setState('recovering')
        return
      }

      setState(next ? 'loading-data' : 'signed-out')
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // Carrega o banco do usuário sempre que a sessão passa a existir.
  useEffect(() => {
    if (state !== 'loading-data' || !session) return

    let cancelled = false
    setCurrentUser(session.user.id)
    setError(null)

    loadAll()
      .then((db) => {
        if (cancelled) return
        installDatabase(db)
        setState('ready')
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : String(cause))
        setState('failed')
      })

    return () => {
      cancelled = true
    }
  }, [state, session, attempt])

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
    setCurrentUser(null)
    clearSession()
  }

  const value: AuthValue = {
    state,
    session,
    email: session?.user.email ?? null,
    error,
    signOut,
    retry: () => {
      setState('loading-data')
      setAttempt((n) => n + 1)
    },
    finishRecovery: () => setState('loading-data'),
  }

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthValue {
  const value = use(AuthContext)
  if (!value) throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  return value
}
