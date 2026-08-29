import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Field, Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { signupIsOpen, supabase } from '@/lib/supabase'

type Mode = 'signin' | 'signup' | 'recover'

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
    /*
     * Sem SMTP próprio, o remetente embutido do Supabase recusa endereços que
     * não sejam da equipe do projeto — e a recusa vem como "endereço inválido",
     * que joga a culpa em quem digitou. A mensagem aponta para a causa real.
     */
    if (lower.includes('is invalid') && lower.includes('email address')) {
      return 'Não foi possível enviar para este endereço. O envio de e-mails ainda não está configurado no sistema.'
    }
    if (lower.includes('error sending') || lower.includes('smtp')) {
      return 'O envio de e-mails ainda não está configurado. Peça a troca de senha a quem administra o sistema.'
    }
    return message
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (!email.trim()) {
      setError('Preencha o e-mail.')
      return
    }
    if (mode !== 'recover' && !password) {
      setError('Preencha a senha.')
      return
    }

    setBusy(true)
    try {
      if (mode === 'recover') {
        // `redirectTo` precisa constar na lista de URLs permitidas do Supabase,
        // senão o link do e-mail leva ao site deles em vez de voltar para cá.
        const { error: cause } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/`,
        })
        if (cause) throw cause

        /*
         * A confirmação é a mesma exista a conta ou não. Dizer "e-mail não
         * cadastrado" entregaria a qualquer um a lista de quem é cliente.
         */
        setNotice(
          `Se houver uma conta para ${email.trim()}, o link de troca de senha chega em instantes. Confira também o spam.`,
        )
      } else if (mode === 'signup') {
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
  const recover = mode === 'recover'

  const titulo = recover ? 'Trocar senha' : signup ? 'Criar conta' : 'Entrar'
  const subtitulo = recover
    ? 'Informe seu e-mail e enviaremos um link para definir uma senha nova.'
    : signup
      ? 'Sua conta começa vazia — os dados são só seus.'
      : 'Gestão de clientes, produção e financeiro para editores de vídeo.'

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

        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        <p className="mt-1.5 text-sm text-white/55">{subtitulo}</p>

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

          {/* Na recuperação só o e-mail importa — pedir senha ali confundiria. */}
          {recover ? null : (
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
          )}

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
            {recover ? 'Enviar link' : signup ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        {/* Sem este atalho, quem esquece a senha não tem por onde começar. */}
        <div className="mt-4">
          {recover ? (
            <button
              type="button"
              onClick={() => {
                setMode('signin')
                setError(null)
                setNotice(null)
              }}
              className="text-sm text-white/55 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
            >
              Voltar para o login
            </button>
          ) : mode === 'signin' ? (
            <button
              type="button"
              onClick={() => {
                setMode('recover')
                setError(null)
                setNotice(null)
              }}
              className="text-sm text-white/55 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
            >
              Esqueci minha senha
            </button>
          ) : null}
        </div>

        {recover ? null : canSignUp === true ? (
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
