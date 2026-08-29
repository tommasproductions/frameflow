import { useEffect, useState } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'

import { Sidebar } from '@/app/layout/Sidebar'
import { Topbar } from '@/app/layout/Topbar'
import { PeriodProvider } from '@/app/period'
import { SearchCommand } from '@/components/shared/SearchCommand'
import { TooltipProvider } from '@/components/ui/misc'

const COLLAPSE_KEY = 'frameflow:sidebar-collapsed'

/** Abaixo disso a sidebar vira sobreposição, em vez de ocupar largura fixa. */
const MOBILE_BREAKPOINT = 768

/** Casca da aplicação: sidebar, topbar e a rota atual no conteúdo. */
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(
    () => window.localStorage.getItem(COLLAPSE_KEY) === 'true',
  )
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_KEY, String(collapsed))
  }, [collapsed])

  // Cmd/Ctrl+K abre a busca global de qualquer tela.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  /**
   * No celular a sidebar não cabe ao lado do conteúdo, então o mesmo botão
   * alterna a sobreposição em vez de colapsar a coluna.
   */
  function toggleSidebar() {
    if (window.innerWidth < MOBILE_BREAKPOINT) setMobileOpen((open) => !open)
    else setCollapsed((value) => !value)
  }

  return (
    <TooltipProvider delayDuration={300}>
      <PeriodProvider>
        <div className="flex h-screen overflow-hidden bg-canvas">
          {/* Coluna fixa a partir de md; sobreposição abaixo disso. */}
          <div className="hidden md:flex">
            <Sidebar collapsed={collapsed} />
          </div>

          {mobileOpen ? (
            <>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 md:hidden"
              />
              <div className="fixed inset-y-0 left-0 z-50 flex md:hidden">
                <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
              </div>
            </>
          ) : null}

          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar onToggleSidebar={toggleSidebar} onOpenSearch={() => setSearchOpen(true)} />
            <main className="flex-1 overflow-y-auto">
              {/*
                A `key` faz o contêiner remontar a cada rota, o que reinicia a
                animação de entrada. Sem ela o CSS só rodaria na primeira carga
                e as trocas de tela seriam secas.
              */}
              <div
                key={pathname}
                className="page-enter mx-auto max-w-[1600px] p-3 sm:p-5"
              >
                <Outlet />
              </div>
            </main>
          </div>
        </div>

        <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
        <ScrollRestoration />
      </PeriodProvider>
    </TooltipProvider>
  )
}
