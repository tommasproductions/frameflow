import { Hammer, type LucideIcon } from 'lucide-react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/card'

/**
 * Tela ainda não implementada.
 *
 * A rota já existe e a navegação já funciona; o que falta é o conteúdo, que
 * chega na sessão indicada. Deixar isso explícito é melhor do que uma página
 * em branco ou um link morto na sidebar.
 */
export function Placeholder({
  title,
  description,
  icon: Icon = Hammer,
  session,
  scope,
}: {
  title: string
  description: string
  icon?: LucideIcon
  /** Sessão do roteiro de implementação que entrega esta tela. */
  session: string
  /** O que a tela vai conter quando pronta. */
  scope: string[]
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />

      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent">
            <Icon className="size-5" />
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-base font-medium text-ink">Prevista para a {session}</p>
              <p className="text-sm text-ink-dim">
                A fundação já carrega os dados desta área — falta montar a interface.
              </p>
            </div>
            <ul className="space-y-1.5">
              {scope.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-ink-dim">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-faint" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
