import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Field, Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { signupIsOpen, supabase } from '@/lib/supabase'

type Mode = 'signin' | 'signup'

/**
 * Entrada do sistema.
 *
 * Preto absoluto e branco puro, sem os cinzas do resto da aplicação. É a única
 * tela que alguém vê antes de conhecer o produto, e o contraste máximo carrega
 * o peso que aqui não vem de dado nenhum — não há métrica, gráfico ou lista
 * para dar hierarquia à página.
 *
 * Login e cadastro dividem a mesma tela porque os campos são idênticos e
 * alternar é mais barato que navegar. O modo só muda o texto e qual método do
 * Supabase é chamado.
 */
export function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')
  /**
   * `null` enquanto a resposta do Supabase não chegou. Nesse intervalo nada é
   * oferecido — melhor a opção aparecer meio segundo depois do que oferecer um
   * cadastro que o servidor vai recusar.
   */
  const [canSignUp, setCanSignUp] = useState<boolean | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void signupIsOpen().then((open) => {
      if (!cancelled) setCanSignUp(open)
    })
    return () => {
      cancelled = true
    }
  }, [])

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
    if (lower.includes('signups not allowed') || lower.includes('signup is disabled')) {
      return 'O cadastro está fechado. Peça suas credenciais a quem contratou o sistema.'
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

  const signup = mode === 'signup'

  return (
    /*
     * `bg-black` e `text-white` literais, não os tokens do tema. A tela de
     * entrada é a exceção deliberada ao sistema de cores: enquanto o app usa
     * quase-preto para as superfícies não brigarem entre si, aqui só existe
     * uma superfície.
     */
    <div className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
      <div className="page-enter w-full max-w-[340px]">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-sm font-bold text-black">
            F
          </span>
          <span className="text-lg font-semibold tracking-tight">FrameFlow</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          {signup ? 'Criar conta' : 'Entrar'}
        </h1>
        <p className="mt-1.5 text-sm text-white/55">
          {signup
            ? 'Sua conta começa vazia — os dados são só seus.'
            : 'Gestão de clientes, produção e financeiro para editores de vídeo.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <Field label="E-mail" className="[&>label]:text-white/70">
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
              autoFocus
              className="h-10 border-white/20 bg-transparent text-white placeholder:text-white/40 hover:border-white/35 focus-visible:border-white focus-visible:ring-white/25"
            />
          </Field>

          <Field
            label="Senha"
            hint={signup ? 'Pelo menos 6 caracteres.' : undefined}
            className="[&>label]:text-white/70 [&>p]:text-white/40"
          >
            <Input
              type="password"
              autoComplete={signup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="h-10 border-white/20 bg-transparent text-white placeholder:text-white/40 hover:border-white/35 focus-visible:border-white focus-visible:ring-white/25"
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

          {notice ? (
            <p
              role="status"
              className="border-l-2 border-white/40 pl-2.5 text-sm leading-snug text-white/70"
            >
              {notice}
            </p>
          ) : null}

          {/*
            Botão branco sobre preto — o único bloco cheio da tela, e por isso
            o destino óbvio do olho.
          */}
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
            {signup ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        {canSignUp === true ? (
          <p className="mt-6 text-sm text-white/55">
            {signup ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(signup ? 'signin' : 'signup')
                setError(null)
                setNotice(null)
              }}
              className="font-medium text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white"
            >
              {signup ? 'Entrar' : 'Criar agora'}
            </button>
          </p>
        ) : canSignUp === false ? (
          <p className="mt-6 text-sm leading-relaxed text-white/50">
            O acesso é liberado pela Tommas Productions. Fale com quem contratou o sistema para
            receber suas credenciais.
          </p>
        ) : null}
      </div>
    </div>
  )
}
