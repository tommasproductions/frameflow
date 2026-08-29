import { Database, Download, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'

import { PageHeader, SectionHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDatabase } from '@/hooks/useCollection'
import { COLLECTION_LABEL, type CollectionKey } from '@/lib/schema'
import {
  clearDatabase,
  exportDatabase,
  importDatabase,
  resetToSeed,
  STORAGE_KEY,
} from '@/lib/store'
import { formatDateTime, formatNumber } from '@/lib/utils'

type PendingAction = 'reset' | 'clear' | null

export function SettingsPage() {
  const db = useDatabase()
  const [pending, setPending] = useState<PendingAction>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const counts = (Object.keys(COLLECTION_LABEL) as CollectionKey[]).map((key) => ({
    key,
    label: COLLECTION_LABEL[key],
    count: db[key].length,
  }))

  const totalRecords = counts.reduce((acc, item) => acc + item.count, 0)

  function handleExport() {
    const blob = new Blob([exportDatabase()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `frameflow-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(file: File) {
    setImportError(null)
    try {
      importDatabase(await file.text())
    } catch {
      setImportError('Arquivo inválido. Selecione um backup exportado pelo FrameFlow.')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Configurações"
        description="Gerência dos dados locais do FrameFlow."
      />

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Dados</CardTitle>
              <CardDescription>
                Tudo é gravado no navegador, na chave{' '}
                <code className="rounded-sm bg-hover px-1 py-0.5 font-mono text-xs text-ink-dim">
                  {STORAGE_KEY}
                </code>
                . Nada sai deste dispositivo.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {counts.map((item) => (
                <div key={item.key} className="flex items-baseline justify-between gap-2 border-b border-line py-1.5">
                  <span className="text-sm text-ink-dim">{item.label}</span>
                  <span className="tabular text-sm font-medium text-ink">{formatNumber(item.count)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <SectionHeader title="Backup" />
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleExport}>
                  <Download />
                  Exportar JSON
                </Button>
                <Button onClick={() => fileInput.current?.click()}>
                  <Upload />
                  Importar backup
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void handleImport(file)
                    event.target.value = ''
                  }}
                />
              </div>
              {importError ? <p className="text-xs text-danger">{importError}</p> : null}
            </div>

            <div className="space-y-3">
              <SectionHeader title="Zona de risco" />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setPending('reset')}>
                  <RotateCcw />
                  Recarregar dados demonstrativos
                </Button>
                <Button variant="danger" onClick={() => setPending('clear')}>
                  <Trash2 />
                  Apagar tudo
                </Button>
              </div>
              <p className="text-xs text-ink-faint">
                Recarregar substitui o que existe hoje pelo conjunto de demonstração original.
                Exporte um backup antes se quiser guardar o estado atual.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <div>
              <CardTitle>Armazenamento</CardTitle>
              <CardDescription>Estado do banco local.</CardDescription>
            </div>
            <Database className="size-4 shrink-0 text-ink-faint" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-ink-dim">Registros</span>
              <span className="tabular font-medium text-ink">{formatNumber(totalRecords)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-ink-dim">Versão do schema</span>
              <span className="tabular font-medium text-ink">{db.meta.version}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-ink-dim">Carga do seed</span>
              <span className="tabular font-medium text-ink">{formatDateTime(db.meta.seededAt)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-ink-dim">Última escrita</span>
              <span className="tabular font-medium text-ink">{formatDateTime(db.meta.updatedAt)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pending === 'clear' ? 'Apagar todos os dados?' : 'Recarregar os dados de demonstração?'}
            </DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogBody className="text-sm text-ink-dim">
            {pending === 'clear'
              ? 'O banco local ficará vazio. Todos os leads, clientes, projetos, vídeos e lançamentos serão removidos deste navegador.'
              : 'Os registros atuais serão substituídos pelo conjunto demonstrativo original — 5 clientes, 8 projetos, 24 vídeos e 18 leads.'}
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setPending(null)}>Cancelar</Button>
            <Button
              variant={pending === 'clear' ? 'danger' : 'primary'}
              onClick={() => {
                if (pending === 'clear') clearDatabase()
                else resetToSeed()
                setPending(null)
              }}
            >
              {pending === 'clear' ? 'Apagar tudo' : 'Recarregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
