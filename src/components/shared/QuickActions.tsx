import {
  ArrowDownRight,
  ArrowUpRight,
  Clapperboard,
  CircleCheck,
  FolderKanban,
  Plus,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ClientForm } from '@/components/forms/ClientForm'
import { ExpenseForm } from '@/components/forms/ExpenseForm'
import { LeadForm } from '@/components/forms/LeadForm'
import { PaymentForm } from '@/components/forms/PaymentForm'
import { ProjectForm } from '@/components/forms/ProjectForm'
import { TaskForm } from '@/components/forms/TaskForm'
import { VideoForm } from '@/components/forms/VideoForm'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type FormKey = 'lead' | 'client' | 'project' | 'video' | 'task' | 'payment' | 'expense' | null

const ACTIONS: { key: Exclude<FormKey, null>; label: string; icon: LucideIcon }[] = [
  { key: 'lead', label: 'Lead', icon: Target },
  { key: 'client', label: 'Cliente', icon: Users },
  { key: 'project', label: 'Projeto', icon: FolderKanban },
  { key: 'video', label: 'Vídeo', icon: Clapperboard },
  { key: 'task', label: 'Tarefa', icon: CircleCheck },
]

/**
 * Botão "+ Novo" da topbar.
 *
 * Um único ponto de criação para tudo, disponível de qualquer tela — é o que
 * evita ter que navegar até a página certa só para registrar algo que acabou
 * de acontecer.
 */
export function QuickActions() {
  const navigate = useNavigate()
  const [openForm, setOpenForm] = useState<FormKey>(null)

  const close = () => setOpenForm(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="primary" size="sm">
            <Plus />
            Novo
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuLabel>Criar</DropdownMenuLabel>
          {ACTIONS.map((action) => (
            <DropdownMenuItem key={action.key} onSelect={() => setOpenForm(action.key)}>
              <action.icon />
              {action.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Financeiro</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setOpenForm('payment')}>
            <ArrowUpRight />
            Recebimento
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setOpenForm('expense')}>
            <ArrowDownRight />
            Custo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Cada formulário leva para a entidade recém-criada, porque criar algo
          quase sempre é o começo de mexer nele. */}
      <LeadForm
        open={openForm === 'lead'}
        onOpenChange={(open) => !open && close()}
        onSaved={(lead) => navigate(`/leads/${lead.id}`)}
      />
      <ClientForm
        open={openForm === 'client'}
        onOpenChange={(open) => !open && close()}
        onSaved={(client) => navigate(`/clients/${client.id}`)}
      />
      <ProjectForm
        open={openForm === 'project'}
        onOpenChange={(open) => !open && close()}
        onSaved={(project) => navigate(`/projects/${project.id}`)}
      />
      <VideoForm
        open={openForm === 'video'}
        onOpenChange={(open) => !open && close()}
        onSaved={(video) => navigate(`/videos/${video.id}`)}
      />
      <TaskForm open={openForm === 'task'} onOpenChange={(open) => !open && close()} />
      <PaymentForm
        open={openForm === 'payment'}
        onOpenChange={(open) => !open && close()}
        onSaved={() => navigate('/financial')}
      />
      <ExpenseForm
        open={openForm === 'expense'}
        onOpenChange={(open) => !open && close()}
        onSaved={() => navigate('/financial')}
      />
    </>
  )
}
