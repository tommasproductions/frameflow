import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AppLayout } from '@/app/layout/AppLayout'
import { NotFound } from '@/pages/NotFound'
import { CalendarPage } from '@/pages/calendar/CalendarPage'
import { ClientDetail } from '@/pages/clients/ClientDetail'
import { ClientsPage } from '@/pages/clients/ClientsPage'
import { Dashboard } from '@/pages/Dashboard'
import { FinancialPage } from '@/pages/financial/FinancialPage'
import { LeadDetail } from '@/pages/leads/LeadDetail'
import { LeadsPage } from '@/pages/leads/LeadsPage'
import { ProductionPage } from '@/pages/production/ProductionPage'
import { ProjectDetail } from '@/pages/projects/ProjectDetail'
import { ProjectsPage } from '@/pages/projects/ProjectsPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { TasksPage } from '@/pages/tasks/TasksPage'
import { VideoDetail } from '@/pages/videos/VideoDetail'

/**
 * Todas as rotas do sistema penduradas no AppLayout, que fornece sidebar,
 * topbar e o período de referência.
 */
export const router = createBrowserRouter([
  /*
   * Endereços de autenticação levam ao dashboard.
   *
   * A tela de login vive fora do roteador — ela aparece quando não há sessão,
   * qualquer que seja a URL. Ao autenticar, o roteador monta e lê o endereço
   * que estava na barra: sem estas rotas, quem entrou por `/login` caía na
   * página de "não encontrada", porque `/login` não é uma tela do sistema.
   *
   * `replace` evita que voltar no navegador devolva a pessoa a um endereço que
   * só existe para quem está deslogado.
   */
  { path: '/login', element: <Navigate to="/" replace /> },
  { path: '/register', element: <Navigate to="/" replace /> },
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'leads', element: <LeadsPage /> },
      { path: 'leads/:id', element: <LeadDetail /> },
      { path: 'clients', element: <ClientsPage /> },
      { path: 'clients/:id', element: <ClientDetail /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:id', element: <ProjectDetail /> },
      { path: 'production', element: <ProductionPage /> },
      { path: 'videos/:id', element: <VideoDetail /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'financial', element: <FinancialPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
