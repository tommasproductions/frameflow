# FrameFlow

Sistema de gestão operacional para editor de vídeo freelancer — clientes, prospecção,
produção, financeiro e rentabilidade.

React 19 · TypeScript · Vite · Tailwind CSS v4 · Radix UI · Recharts · React Router

```bash
npm install
npm run dev
```

`npm run build` faz typecheck e build de produção. `npm run lint` roda o oxlint.
`npm run preview` serve o build de produção em `http://127.0.0.1:4173`.

---

## Deploy

O projeto é uma SPA estática: o build gera `dist/` e qualquer host de arquivos serve.

**Vercel** (configurado). O `vercel.json` na raiz tem a única regra que não pode
faltar — reescrever toda rota para `index.html`. Sem ela, atualizar a página em
`/clients/c1` devolve 404, porque só o navegador conhece essa rota, não o servidor.

Com o repositório no GitHub, importe o projeto em vercel.com/new. O Vite é detectado
sozinho (`npm run build` → `dist/`) e cada `git push` publica de novo.

**Uma ressalva sobre o que o deploy resolve.** Os dados vivem no `localStorage` do
navegador, então publicar não sincroniza nada: cada navegador que abrir a URL recebe
uma cópia própria, começando pelo seed demonstrativo. Serve para acessar de outro
lugar e para mostrar o sistema — não para trabalhar do celular e do desktop com os
mesmos dados. Isso muda quando `lib/store.ts` passar a falar com um banco real.

---

## Estado da implementação

| Área | Situação |
| --- | --- |
| Modelo de dados, store, cálculos, seed | Pronto |
| Layout, navegação, rotas | Pronto |
| Dashboard | Pronto |
| Configurações (backup, reset do seed) | Pronto |
| Leads: Kanban, lista, formulário, detalhe | Pronto |
| Conversão Lead → Cliente | Pronto |
| Clientes: cards, lista, detalhe com 5 abas | Pronto |
| Projetos: lista, detalhe com 5 abas, template de vídeos | Pronto |
| Produção: esteira Kanban de 8 etapas | Pronto |
| Vídeos: checklist, revisões, arquivos | Pronto |
| Tarefas: Kanban e lista | Pronto |
| Financeiro: receitas, custos, contratos | Pronto |
| Relatórios: comercial, produção, financeiro, rentabilidade | Pronto |
| Calendário mensal com eventos derivados | Pronto |
| Busca global (⌘K), ações rápidas, alertas | Pronto |

As telas ainda não implementadas têm rota e placeholder — a navegação funciona
por inteiro, e cada placeholder diz o que vai conter.

---

## Como o código se organiza

```
src/
├── app/          casca (layout, rotas, período de referência)
├── pages/        uma pasta por área do produto
├── components/
│   ├── ui/       primitivas (Radix + Tailwind), sem regra de negócio
│   ├── shared/   blocos do produto: StatusBadge, MetricCard, EmptyState…
│   └── charts/   gráficos e seus ajustes de tema
├── hooks/        acesso reativo ao store, um hook por entidade
├── lib/          store, cálculos, seed, constantes, utilitários
└── types/        entidades e enums
```

`@/` aponta para `src/`.

---

## Convenções que valem para as próximas sessões

**Persistência.** Tudo vive em uma chave do `localStorage` (`frameflow:db`), lida uma
vez e mantida em memória. As telas leem via `useSyncExternalStore`, então toda escrita
troca a referência da coleção e re-renderiza quem depende dela. Trocar por um banco
real é reescrever `lib/store.ts`, não as telas.

Para criar, alterar e remover, use os hooks de entidade — nunca escreva no
`localStorage` direto:

```ts
const { videos, byId, create, update, remove } = useVideos()
```

**Cores.** Nenhum componente escolhe cor solta. Todo status resolve para um dos seis
tons (`success`, `warning`, `danger`, `info`, `accent`, `neutral`) definidos em
`lib/constants.ts`, e os mapas `TONE_BADGE` / `TONE_TEXT` / `TONE_FILL` / `TONE_HEX`
transformam o tom no que cada contexto precisa. Gráficos usam `THEME_HEX`, porque
Recharts não lê classes do Tailwind.

**Receita.** Três leituras diferentes, usadas de propósito em lugares diferentes:

- **contratada** — tudo que não foi cancelado; é a base de lucro e margem por cliente e por projeto
- **recebida** — só o que foi pago; é a base dos cartões mensais do dashboard, que medem caixa
- **a receber** — pendente + atrasado

**Datas.** Sempre strings ISO. Campos `*Date` guardam só o dia (`YYYY-MM-DD`);
`createdAt`/`updatedAt` guardam o instante completo. Use `parseDate` de `lib/utils.ts`
em vez de `new Date(iso)` — o construtor interpreta `YYYY-MM-DD` como UTC e desloca
o dia dependendo do fuso.

**Atrasos.** `overduePayments` considera atrasado tanto o que está marcado como
`overdue` quanto o `pending` com vencimento passado — o status gravado não acompanha
o relógio sozinho.

**Histórico.** Toda escrita que o usuário reconheceria como um acontecimento passa por
`lib/activity.ts`. O log é append-only: nada é editado nem removido, para que as abas
de histórico contem a sequência real dos fatos.

**Kanban.** `KanbanBoard` é genérico e serve aos três quadros do produto: funil, esteira
de produção e tarefas. Três detalhes não são opcionais:

- A detecção de colisão é `pointerWithin` com fallback para `closestCorners`, para o
  caso do cursor cair num vão entre colunas.
- O card mede o deslocamento do ponteiro e engole o `click` que o navegador dispara ao
  fim de um arraste. Sem isso, mover um card abriria o detalhe.
- **O teclado não usa o arraste do dnd-kit.** Num quadro que rola na horizontal, o
  auto-scroll acompanha o deslocamento e as colunas andam junto com o card, de modo que
  a posição relativa nunca muda — o card volta sempre à origem. As setas movem uma
  coluna por vez chamando `onMove` direto, o foco segue o card até a nova coluna e um
  `aria-live` anuncia o movimento. Enter abre o item.

**Checklist de produção.** `applyStatusToChecklist` é a fonte única da regra "esta etapa
implica estas caixas". Vale para arrastar na esteira, mudar o status pelo formulário,
criar vídeos por template e montar o seed. A função só marca, nunca desmarca: etapas
opcionais já concluídas (legendas, motion, cor) são preservadas.

**Prazos encerrados.** `deadlineLabel(iso, settled)` recebe um segundo argumento para
itens que já acabaram — vídeo entregue, projeto concluído, tarefa feita, pagamento
recebido. Aí o prazo vira uma data em vez de "44 dias de atraso": cobrar atraso de algo
encerrado é ruído e pinta a tela de vermelho sem motivo.

**Formulários em diálogo.** O corpo do formulário fica num componente interno ao
`DialogContent`. Como o Radix desmonta o conteúdo ao fechar, cada abertura remonta com
o estado inicial correto — sem efeito de reset. Vale também para a busca global.

**O que é derivado e o que é gravado.** Duas coleções do schema ficam propositalmente
quase vazias:

- **`calendarEvents`** guarda só compromissos que não derivam de nada — reuniões,
  gravações. Prazos, cobranças, tarefas e follow-ups o `useCalendarView` monta a partir
  das próprias entidades a cada render. Duplicá-los criaria duas fontes de verdade, e o
  dia em que a sincronia falhasse o calendário passaria a mentir.
- **`notifications`** existe para avisos que precisem sobreviver a um reload. Alertas de
  atraso não precisam: `useAlerts` recalcula tudo do estado atual, então eles somem
  sozinhos quando a causa é resolvida. Gravar cópias exigiria limpá-las depois, e um
  alerta órfão é pior que nenhum.

**Vínculos financeiros.** `LinkFields` é o componente único de cliente/projeto/vídeo,
usado por tarefas, pagamentos e custos. Os três selects são hierárquicos de propósito:
escolher um vídeo determina projeto e cliente. Sem isso é fácil lançar um custo no
projeto de um cliente e no vídeo de outro, e os totais por cliente deixam de fechar.

---

## Dados demonstrativos

O seed representa um editor no fim de agosto de 2026: 5 clientes, 8 projetos,
24 vídeos, 18 leads, 11 pagamentos, 9 custos, 3 contratos, 10 tarefas.

Há atrasos de propósito — vídeos e cobranças vencidos — para que badges de atraso,
painéis de prazo e alertas tenham o que mostrar. Os ids são fixos e legíveis
(`c1`, `p3`, `v15`) para conferência manual dos totais.

Em **Configurações** dá para exportar um backup, importar, recarregar o seed e
apagar tudo. Recarregue o seed depois de mexer em `lib/seedData.ts` — o seed só é
aplicado sozinho quando o `localStorage` está vazio.
