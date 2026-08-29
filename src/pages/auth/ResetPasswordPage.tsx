import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { useAuth } from '@/app/auth'
import { Field, Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

/** Igual ao mínimo do Supabase; validar aqui evita uma ida ao servidor. */
const MIN_LENGTH = 6

/**
 * Definição da senha nova, após o link do e-mail.
 *
 * Chegar aqui significa que já existe sessão — o link autentica. A tela existe
 * para que a pessoa saia daqui sabendo a própria senha, em vez de entrar no
 * sistema com um acesso que ela não sabe repetir amanhã.
 */
export function ResetPasswordPage() {
  const { email, finishRecovery, signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (password.length < MIN_LENGTH) {
      setError(`A senha precisa ter pelo menos ${MIN_LENGTH} caracteres.`)
      return
    }
    // Confirmar evita gravar um erro de digitação e ficar trancado de novo.
    if (password !== confirmation) {
      setError('As duas senhas não são iguais.')
      return
    }

    setBusy(true)
    try {
      const { error: cause } = await supabase.auth.updateUser({ password })
      if (cause) throw cause
      finishRecovery()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      setError(
        message.toLowerCase().includes('same password')
          ? 'Escolha uma senha diferente da atual.'
          : message,
      )
    } finally {
      setBusy(false)
    }
  }

  const campo =
    'h-10 border-white/20 bg-transparent text-white placeholder:text-white/40 hover:border-white/35 focus-visible:border-white focus-visible:ring-white/25'

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
      <div className="page-enter w-full max-w-[340px]">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-sm font-bold text-black">
            F
          </span>
          <span className="text-lg font-semibold tracking-tight">FrameFlow</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Definir senha nova</h1>
        <p className="mt-1.5 text-sm text-white/55">
          {email ? `Você está trocando a senha de ${email}.` : 'Escolha uma senha nova.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <Field
            label="Senha nova"
            hint={`Pelo menos ${MIN_LENGTH} caracteres.`}
            className="[&>label]:text-white/70 [&>p]:text-white/40"
          >
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoFocus
              className={campo}
            />
          </Field>

          <Field label="Repita a senha" className="[&>label]:text-white/70">
            <Input
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="••••••••"
              className={campo}
            />
          </Field>

          {error ? (
            <p
              role="alert"
              className="border-l-2 border-white pl-2.5 text-sm leading-snug text-white/85"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className={cn(
              'flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white text-sm font-semibold text-black',
              'transition-opacity duration-150 hover:opacity-90',
              'focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Salvar e entrar
          </button>
        </form>

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 text-sm text-white/55 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
