-- ============================================================================
-- FrameFlow — esquema multiusuário
--
-- Rode este arquivo inteiro no SQL Editor do Supabase. É idempotente: pode
-- rodar de novo sem quebrar nada.
--
-- Três decisões estruturais valem explicação:
--
-- 1. CHAVE PRIMÁRIA COMPOSTA (user_id, id)
--    Os ids são texto gerado pela aplicação, e os dados de demonstração usam
--    ids fixos e legíveis ('c1', 'p3', 'v15'). Com chave primária só em `id`,
--    o segundo usuário a carregar a demonstração colidiria com o primeiro.
--    A chave composta isola por conta e ainda deixa os ids legíveis.
--
-- 2. CHAVES ESTRANGEIRAS TAMBÉM COMPOSTAS
--    `(user_id, client_id) references clients (user_id, id)` faz mais do que
--    garantir que o cliente existe: torna impossível, no nível do banco,
--    apontar para o registro de outra conta. Colunas opcionais continuam
--    aceitando nulo — em MATCH SIMPLE (padrão), nulo em qualquer coluna da
--    chave dispensa a verificação.
--
-- 3. RLS EM TODAS AS TABELAS
--    A política é sempre `auth.uid() = user_id`. O isolamento entre contas
--    passa a ser responsabilidade do banco, não de um WHERE que alguém pode
--    esquecer. Sem isso, um único bug de consulta vaza a carteira de um
--    cliente para outro.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabelas
-- ----------------------------------------------------------------------------

create table if not exists public.clients (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  id          text        not null,
  name        text        not null,
  company     text,
  email       text,
  phone       text,
  whatsapp    text,
  instagram   text,
  youtube     text,
  website     text,
  niche       text,
  status      text        not null check (status in ('active', 'inactive', 'paused', 'lost')),
  source      text        not null,
  lead_id     text,
  entry_date  date        not null,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.leads (
  user_id                uuid        not null references auth.users (id) on delete cascade,
  id                     text        not null,
  name                   text        not null,
  company                text,
  email                  text,
  phone                  text,
  whatsapp               text,
  instagram              text,
  youtube                text,
  website                text,
  niche                  text,
  source                 text        not null,
  desired_service        text,
  estimated_budget       numeric,
  potential_value        numeric,
  stage                  text        not null check (stage in ('new', 'contacted', 'replied', 'meeting', 'proposal_sent', 'negotiation', 'closed', 'lost')),
  close_probability      integer     check (close_probability between 0 and 100),
  first_contact_date     date,
  last_contact_date      date,
  next_follow_up_date    date,
  next_follow_up_action  text,
  notes                  text,
  converted_to_client_id text,
  converted_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.lead_activities (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  id          text        not null,
  lead_id     text        not null,
  type        text        not null,
  title       text        not null,
  description text,
  date        date        not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, id),
  -- O histórico de um lead não sobrevive ao lead.
  foreign key (user_id, lead_id) references public.leads (user_id, id) on delete cascade
);

create table if not exists public.projects (
  user_id          uuid        not null references auth.users (id) on delete cascade,
  id               text        not null,
  name             text        not null,
  client_id        text        not null,
  description      text,
  type             text,
  status           text        not null check (status in ('planning', 'active', 'paused', 'completed', 'cancelled')),
  start_date       date,
  deadline         date,
  contracted_value numeric     not null default 0,
  estimated_cost   numeric     not null default 0,
  responsible      text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (user_id, id)
  -- Sem chave estrangeira para `clients` de propósito: hoje a aplicação
  -- permite excluir um cliente deixando os projetos órfãos, e avisa disso no
  -- diálogo. Uma restrição aqui transformaria esse comportamento conhecido
  -- num erro em tempo de execução. Vale adicionar quando o fluxo de exclusão
  -- for corrigido para reatribuir ou remover em cascata.
);

create table if not exists public.videos (
  user_id          uuid        not null references auth.users (id) on delete cascade,
  id               text        not null,
  title            text        not null,
  client_id        text        not null,
  project_id       text        not null,
  type             text        not null,
  status           text        not null check (status in ('briefing', 'material_received', 'editing', 'internal_review', 'sent_to_client', 'changes', 'approved', 'delivered')),
  priority         text        not null check (priority in ('low', 'medium', 'high', 'urgent')),
  deadline         date,
  duration_seconds integer,
  value            numeric     not null default 0,
  cost             numeric     not null default 0,
  estimated_hours  numeric,
  worked_hours     numeric,
  file_links       jsonb       not null default '[]'::jsonb,
  notes            text,
  checklist        jsonb       not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (user_id, id),
  -- A aplicação já apaga os vídeos junto com o projeto; a cascata aqui só
  -- garante que nunca sobre um vídeo apontando para um projeto inexistente.
  foreign key (user_id, project_id) references public.projects (user_id, id) on delete cascade
);

create table if not exists public.video_revisions (
  user_id           uuid        not null references auth.users (id) on delete cascade,
  id                text        not null,
  video_id          text        not null,
  version           integer     not null,
  date              date        not null,
  comments          text,
  changes_requested text,
  status            text        not null check (status in ('pending', 'in_progress', 'completed')),
  created_at        timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, video_id) references public.videos (user_id, id) on delete cascade
);

create table if not exists public.tasks (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  id          text        not null,
  title       text        not null,
  description text,
  responsible text,
  priority    text        not null check (priority in ('low', 'medium', 'high', 'urgent')),
  status      text        not null check (status in ('todo', 'in_progress', 'done')),
  deadline    date,
  client_id   text,
  project_id  text,
  video_id    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
  -- Vínculos opcionais e sem cascata: excluir um vídeo mantém a tarefa e só
  -- desfaz o vínculo, que é o que a aplicação faz hoje.
);

create table if not exists public.payments (
  user_id      uuid        not null references auth.users (id) on delete cascade,
  id           text        not null,
  description  text        not null,
  amount       numeric     not null,
  client_id    text,
  project_id   text,
  video_id     text,
  due_date     date        not null,
  payment_date date,
  status       text        not null check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  method       text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.expenses (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  id          text        not null,
  description text        not null,
  amount      numeric     not null,
  category    text        not null,
  client_id   text,
  project_id  text,
  video_id    text,
  date        date        not null,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.contracts (
  user_id        uuid        not null references auth.users (id) on delete cascade,
  id             text        not null,
  client_id      text        not null,
  value          numeric     not null,
  frequency      text        not null check (frequency in ('monthly', 'quarterly', 'yearly', 'one_time')),
  start_date     date        not null,
  renewal_date   date,
  video_quantity integer,
  status         text        not null check (status in ('active', 'expired', 'cancelled')),
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.calendar_events (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  id          text        not null,
  title       text        not null,
  type        text        not null,
  date        date        not null,
  entity_type text,
  entity_id   text,
  notes       text,
  created_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.activity_log (
  user_id        uuid        not null references auth.users (id) on delete cascade,
  id             text        not null,
  action         text        not null,
  entity_type    text        not null,
  entity_id      text        not null,
  entity_name    text        not null,
  details        text,
  previous_value text,
  new_value      text,
  created_at     timestamptz not null default now(),
  primary key (user_id, id)
  -- Sem chaves estrangeiras: o histórico é append-only e precisa sobreviver à
  -- exclusão do que ele descreve. "Excluiu o cliente X" perde o sentido se
  -- sumir junto com o cliente X.
);

create table if not exists public.notifications (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  id          text        not null,
  type        text        not null,
  title       text        not null,
  message     text        not null,
  entity_type text,
  entity_id   text,
  read        boolean     not null default false,
  created_at  timestamptz not null default now(),
  primary key (user_id, id)
);

-- ----------------------------------------------------------------------------
-- Índices
--
-- A política de RLS coloca `user_id` em toda consulta, então ele encabeça os
-- índices. Os demais cobrem os filtros que as telas realmente fazem.
-- ----------------------------------------------------------------------------

create index if not exists idx_projects_client   on public.projects        (user_id, client_id);
create index if not exists idx_videos_client     on public.videos          (user_id, client_id);
create index if not exists idx_videos_project    on public.videos          (user_id, project_id);
create index if not exists idx_videos_deadline   on public.videos          (user_id, deadline);
create index if not exists idx_revisions_video   on public.video_revisions (user_id, video_id);
create index if not exists idx_activities_lead   on public.lead_activities (user_id, lead_id);
create index if not exists idx_tasks_deadline    on public.tasks           (user_id, deadline);
create index if not exists idx_payments_due      on public.payments        (user_id, due_date);
create index if not exists idx_payments_client   on public.payments        (user_id, client_id);
create index if not exists idx_expenses_date     on public.expenses        (user_id, date);
create index if not exists idx_contracts_client  on public.contracts       (user_id, client_id);
create index if not exists idx_events_date       on public.calendar_events (user_id, date);
create index if not exists idx_log_created       on public.activity_log    (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- Uma política por tabela, cobrindo as quatro operações. `using` filtra o que
-- pode ser lido ou alterado; `with check` impede gravar uma linha em nome de
-- outra conta. As duas cláusulas são necessárias: sem `with check`, um UPDATE
-- poderia mover a linha para outro `user_id`.
-- ----------------------------------------------------------------------------

do $$
declare
  t text;
  tabelas text[] := array[
    'clients', 'leads', 'lead_activities', 'projects', 'videos',
    'video_revisions', 'tasks', 'payments', 'expenses', 'contracts',
    'calendar_events', 'activity_log', 'notifications'
  ];
begin
  foreach t in array tabelas loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_own_rows', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (auth.uid() = user_id)
         with check (auth.uid() = user_id)',
      t || '_own_rows', t
    );
  end loop;
end $$;
