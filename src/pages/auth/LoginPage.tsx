import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

type Mode = 'signin' | 'signup'

/**
 * Entrada do sistema.
 *
 * Login e cadastro dividem a mesma tela porque os campos são os mesmos e
 * alternar é mais barato que navegar. O modo só muda o texto e qual método do
 * Supabase é chamado.
 */
export function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  /**
   * O Supabase responde em inglês e com termos técnicos. Traduzir os casos que
   * o usuário realmente encontra evita que um erro previsível pareça um defeito.
   */
  function humanize(message: string): string {
    const lower = message.toLowerCase()
    if (lower.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
    if (lower.includes('email not confirmed')) {
      return 'Confirme o e-mail pelo link que enviamos antes de entrar.'
    }
    if (lower.includes('user already registered')) {
      return 'Já existe uma conta com este e-mail. Tente entrar.'
    }
    if (lower.includes('password should be at least')) {
      return 'A senha precisa ter pelo menos 6 caracteres.'
    }
    if (lower.includes('rate limit') || lower.includes('too many')) {
      return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'
    }
    return message
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha.')
      return
    }

    setBusy(true)
    try {
      if (mode === 'signup') {
        const { data, error: cause } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
        if (cause) throw cause

        // Com confirmação de e-mail exigida, o Supabase devolve o usuário sem
        // sessão. Sem sessão, não há para onde navegar — só avisar.
        if (!data.session) {
          setNotice(
            `Conta criada. Enviamos um link de confirmação para ${email.trim()}. ` +
              'Clique nele e volte aqui para entrar.',
          )
          setMode('signin')
          setPassword('')
        }
      } else {
        const { error: cause } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (cause) throw cause
        // O AuthProvider observa a mudança de sessão e carrega os dados.
      }
    } catch (cause) {
      setError(humanize(cause instanceof Error ? cause.message : String(cause)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="page-enter w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-sm font-bold text-on-accent">
            F
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink">FrameFlow</span>
        </div>

        <h1 className="text-xl font-semibold text-ink">
          {mode === 'signin' ? 'Entrar na sua conta' : 'Criar uma conta'}
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          {mode === 'signin'
            ? 'Gestão de clientes, produção e financeiro para editores de vídeo.'
            : 'Sua conta começa vazia — os dados são só seus.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <Field label="E-mail">
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
              autoFocus
            />
          </Field>

          <Field
            label="Senha"
            hint={mode === 'signup' ? 'Pelo menos 6 caracteres.' : undefined}
          >
            <Input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {error ? (
            <p role="alert" className="rounded-md bg-danger/10 px-2.5 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          {notice ? (
            <p role="status" className="rounded-md bg-success/10 px-2.5 py-2 text-sm text-success">
              {notice}
            </p>
          ) : null}

          <Button type="submit" variant="primary" disabled={busy} className="w-full">
            {busy ? <Loader2 className="animate-spin" /> : null}
            {mode === 'signin' ? 'Entrar' : 'Criar conta'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-ink-dim">
          {mode === 'signin' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
              setNotice(null)
            }}
            className="font-medium text-ink underline-offset-2 hover:underline"
          >
            {mode === 'signin' ? 'Criar agora' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  )
}
