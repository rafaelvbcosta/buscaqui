-- =====================================================================
--  BuscAqui — configuração do banco de dados (Supabase)
--  Como usar: Supabase > SQL Editor > New query > cole TUDO > Run
--  Pode rodar mais de uma vez sem problema (não apaga dados).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABELAS
-- ---------------------------------------------------------------------

-- Perfil de cada pessoa cadastrada (candidato, empresa ou profissional)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'candidato'
              check (role in ('candidato','empresa','profissional')),
  full_name   text not null default '',
  phone       text,
  email       text,
  avatar_url  text,
  city        text,
  created_at  timestamptz not null default now()
);

-- Currículo do candidato
create table if not exists public.resumes (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  headline      text,
  city          text,
  about         text,
  experiences   jsonb  not null default '[]'::jsonb,
  education     jsonb  not null default '[]'::jsonb,
  skills        text[] not null default '{}',
  certificates  jsonb  not null default '[]'::jsonb,
  pdf_path      text,
  updated_at    timestamptz not null default now()
);

-- Empresas (owner_id vazio = empresa de exemplo)
create table if not exists public.companies (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid unique references public.profiles(id) on delete cascade,
  name        text not null,
  cnpj        text,
  address     text,
  city        text,
  segment     text,
  logo_url    text,
  about       text,
  phone       text,
  email       text,
  instagram   text,
  linkedin    text,
  website     text,
  created_at  timestamptz not null default now()
);

-- Vagas de emprego
create table if not exists public.jobs (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  title         text not null,
  description   text,
  category      text,
  modality      text check (modality in ('Presencial','Híbrido','Remoto')),
  salary_min    numeric,
  salary_max    numeric,
  benefits      text,
  requirements  text,
  location      text,
  status        text not null default 'aberta' check (status in ('aberta','encerrada')),
  views         integer not null default 0,
  created_at    timestamptz not null default now()
);

-- Candidaturas
create table if not exists public.applications (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references public.jobs(id) on delete cascade,
  candidate_id    uuid not null references public.profiles(id) on delete cascade,
  status          text not null default 'enviada'
                  check (status in ('enviada','em_analise','entrevista','aprovada','recusada')),
  interview_at    timestamptz,
  interview_note  text,
  created_at      timestamptz not null default now(),
  unique (job_id, candidate_id)
);

-- Vagas favoritas
create table if not exists public.favorites (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  job_id      uuid not null references public.jobs(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, job_id)
);

-- Profissionais autônomos (user_id vazio = profissional de exemplo)
create table if not exists public.professionals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references public.profiles(id) on delete cascade,
  name        text not null,
  phone       text,
  city        text,
  about       text,
  services    jsonb not null default '[]'::jsonb,   -- [{ "categoria": "...", "descricao": "..." }]
  price       text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Empresas também podem divulgar serviços (ex.: oficina mecânica). Nesse caso
-- o registro fica ligado à empresa e usa o nome, a logo e o endereço dela.
alter table public.professionals add column if not exists company_id uuid unique
  references public.companies(id) on delete cascade;
alter table public.professionals add column if not exists address text;

-- Pedidos de serviço publicados por qualquer usuário
create table if not exists public.service_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade,
  title        text not null,
  category     text,
  description  text,
  city         text,
  phone        text,
  status       text not null default 'aberto' check (status in ('aberto','fechado')),
  created_at   timestamptz not null default now()
);

create index if not exists jobs_company_idx        on public.jobs(company_id);
create index if not exists jobs_status_idx         on public.jobs(status);
create index if not exists applications_job_idx    on public.applications(job_id);
create index if not exists applications_cand_idx   on public.applications(candidate_id);

-- ---------------------------------------------------------------------
-- 2. CRIAR PERFIL AUTOMATICAMENTE NO CADASTRO
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := new.raw_user_meta_data->>'role';
begin
  if v_role is null or v_role not in ('candidato','empresa','profissional') then
    v_role := 'candidato';
  end if;

  insert into public.profiles (id, role, full_name, phone, email)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 3. FUNÇÕES DE APOIO PARA AS REGRAS DE SEGURANÇA
-- ---------------------------------------------------------------------
create or replace function public.is_company_owner(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from companies c where c.id = cid and c.owner_id = auth.uid());
$$;

create or replace function public.owns_job(jid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from jobs j join companies c on c.id = j.company_id
    where j.id = jid and c.owner_id = auth.uid()
  );
$$;

create or replace function public.has_applied(jid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from applications a where a.job_id = jid and a.candidate_id = auth.uid());
$$;

-- A empresa logada pode ver este candidato? (só se ele se candidatou a uma vaga dela)
create or replace function public.candidate_applied_to_me(candidate text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from applications a
    join jobs j      on j.id = a.job_id
    join companies c on c.id = j.company_id
    where a.candidate_id::text = candidate and c.owner_id = auth.uid()
  );
$$;

-- Conta uma visualização da vaga (usado no painel da empresa)
create or replace function public.increment_job_view(jid uuid)
returns void language sql security definer set search_path = public as $$
  update jobs set views = views + 1 where id = jid and status = 'aberta';
$$;

grant execute on function public.increment_job_view(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. REGRAS DE SEGURANÇA (RLS)
-- ---------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.resumes           enable row level security;
alter table public.companies         enable row level security;
alter table public.jobs              enable row level security;
alter table public.applications      enable row level security;
alter table public.favorites         enable row level security;
alter table public.professionals     enable row level security;
alter table public.service_requests  enable row level security;

-- PROFILES
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select
  using (id = auth.uid() or public.candidate_applied_to_me(id::text));
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- RESUMES
drop policy if exists "resumes_select" on public.resumes;
create policy "resumes_select" on public.resumes for select
  using (user_id = auth.uid() or public.candidate_applied_to_me(user_id::text));
drop policy if exists "resumes_insert" on public.resumes;
create policy "resumes_insert" on public.resumes for insert
  with check (user_id = auth.uid());
drop policy if exists "resumes_update" on public.resumes;
create policy "resumes_update" on public.resumes for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- COMPANIES (todos podem ver; só o dono edita)
drop policy if exists "companies_select" on public.companies;
create policy "companies_select" on public.companies for select using (true);
drop policy if exists "companies_insert" on public.companies;
create policy "companies_insert" on public.companies for insert
  with check (owner_id = auth.uid());
drop policy if exists "companies_update" on public.companies;
create policy "companies_update" on public.companies for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "companies_delete" on public.companies;
create policy "companies_delete" on public.companies for delete
  using (owner_id = auth.uid());

-- JOBS (vagas abertas são públicas; a empresa vê e gerencia as suas)
drop policy if exists "jobs_select" on public.jobs;
create policy "jobs_select" on public.jobs for select
  using (status = 'aberta' or public.is_company_owner(company_id) or public.has_applied(id));
drop policy if exists "jobs_insert" on public.jobs;
create policy "jobs_insert" on public.jobs for insert
  with check (public.is_company_owner(company_id));
drop policy if exists "jobs_update" on public.jobs;
create policy "jobs_update" on public.jobs for update
  using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));
drop policy if exists "jobs_delete" on public.jobs;
create policy "jobs_delete" on public.jobs for delete
  using (public.is_company_owner(company_id));

-- APPLICATIONS (candidato vê as suas; empresa vê as das suas vagas)
drop policy if exists "applications_select" on public.applications;
create policy "applications_select" on public.applications for select
  using (candidate_id = auth.uid() or public.owns_job(job_id));
drop policy if exists "applications_insert" on public.applications;
create policy "applications_insert" on public.applications for insert
  with check (candidate_id = auth.uid() and status = 'enviada');
drop policy if exists "applications_update" on public.applications;
create policy "applications_update" on public.applications for update
  using (public.owns_job(job_id)) with check (public.owns_job(job_id));
drop policy if exists "applications_delete" on public.applications;
create policy "applications_delete" on public.applications for delete
  using (candidate_id = auth.uid());

-- FAVORITES (cada um só mexe nos seus)
drop policy if exists "favorites_all" on public.favorites;
create policy "favorites_all" on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- PROFESSIONALS (todos podem ver; só o dono edita)
drop policy if exists "professionals_select" on public.professionals;
create policy "professionals_select" on public.professionals for select using (true);
drop policy if exists "professionals_insert" on public.professionals;
create policy "professionals_insert" on public.professionals for insert
  with check (user_id = auth.uid() and (company_id is null or public.is_company_owner(company_id)));
drop policy if exists "professionals_update" on public.professionals;
create policy "professionals_update" on public.professionals for update
  using (user_id = auth.uid()) with check (user_id = auth.uid() and (company_id is null or public.is_company_owner(company_id)));
drop policy if exists "professionals_delete" on public.professionals;
create policy "professionals_delete" on public.professionals for delete
  using (user_id = auth.uid());

-- SERVICE REQUESTS (usuários logados veem; só o autor edita)
drop policy if exists "requests_select" on public.service_requests;
create policy "requests_select" on public.service_requests for select
  using (auth.uid() is not null);
drop policy if exists "requests_insert" on public.service_requests;
create policy "requests_insert" on public.service_requests for insert
  with check (user_id = auth.uid());
drop policy if exists "requests_update" on public.service_requests;
create policy "requests_update" on public.service_requests for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "requests_delete" on public.service_requests;
create policy "requests_delete" on public.service_requests for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 5. PASTAS DE ARQUIVOS (Storage)
--    avatars e logos: públicas | curriculos: privada
--    Cada usuário só envia arquivos para a pasta com o próprio ID.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true),
       ('logos', 'logos', true),
       ('curriculos', 'curriculos', false)
on conflict (id) do nothing;

drop policy if exists "buscaqui_public_read" on storage.objects;
create policy "buscaqui_public_read" on storage.objects for select
  using (bucket_id in ('avatars','logos'));

drop policy if exists "buscaqui_resume_read" on storage.objects;
create policy "buscaqui_resume_read" on storage.objects for select
  using (
    bucket_id = 'curriculos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.candidate_applied_to_me((storage.foldername(name))[1])
    )
  );

drop policy if exists "buscaqui_upload_own" on storage.objects;
create policy "buscaqui_upload_own" on storage.objects for insert
  with check (
    bucket_id in ('avatars','logos','curriculos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "buscaqui_update_own" on storage.objects;
create policy "buscaqui_update_own" on storage.objects for update
  using (
    bucket_id in ('avatars','logos','curriculos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "buscaqui_delete_own" on storage.objects;
create policy "buscaqui_delete_own" on storage.objects for delete
  using (
    bucket_id in ('avatars','logos','curriculos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------
-- 6. DADOS DE EXEMPLO (empresas, vagas e profissionais fictícios)
--    Para apagar depois: rode o arquivo supabase/remover-exemplos.sql
-- ---------------------------------------------------------------------
insert into public.companies (id, name, segment, city, address, about, phone, email, instagram) values
  ('00000000-0000-4000-a000-000000000001', 'Padaria Pão Dourado', 'Alimentação', 'Belo Horizonte - MG',
   'Rua das Flores, 120 - Centro', 'Padaria de bairro com 20 anos de tradição, pães artesanais e café da manhã.',
   '(31) 3333-0001', 'contato@paodourado.exemplo', '@paodourado'),
  ('00000000-0000-4000-a000-000000000002', 'Construtora Alicerce Forte', 'Construção Civil', 'Contagem - MG',
   'Av. Industrial, 900', 'Obras residenciais e comerciais com foco em segurança e qualidade.',
   '(31) 3333-0002', 'rh@alicerceforte.exemplo', '@alicerceforte'),
  ('00000000-0000-4000-a000-000000000003', 'Mercado Bom Preço', 'Comércio/Vendas', 'Belo Horizonte - MG',
   'Rua Itapecerica, 455 - Lagoinha', 'Supermercado de vizinhança com entrega em domicílio.',
   '(31) 3333-0003', 'vagas@bompreco.exemplo', '@mercadobompreco'),
  ('00000000-0000-4000-a000-000000000004', 'TechNorte Soluções', 'Tecnologia', 'Remoto',
   'Atendimento 100% online', 'Suporte de TI e sistemas para pequenas empresas.',
   '(31) 3333-0004', 'talentos@technorte.exemplo', '@technorte')
on conflict (id) do nothing;

insert into public.jobs (id, company_id, title, category, modality, salary_min, salary_max, location, description, requirements, benefits) values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001',
   'Atendente de Balcão', 'Atendimento', 'Presencial', 1600, 1900, 'Belo Horizonte - MG',
   'Atender clientes no balcão, organizar vitrines e operar o caixa quando necessário.',
   'Ensino médio completo. Gostar de lidar com pessoas.', 'Vale-transporte, alimentação no local, folga quinzenal aos domingos.'),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000001',
   'Auxiliar de Padeiro', 'Alimentação', 'Presencial', 1700, 2100, 'Belo Horizonte - MG',
   'Apoiar o padeiro na produção de pães, bolos e salgados. Turno da madrugada.',
   'Experiência é um diferencial, mas ensinamos.', 'Adicional noturno, vale-transporte, cesta básica.'),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000002',
   'Pedreiro', 'Construção Civil', 'Presencial', 2800, 3500, 'Contagem - MG',
   'Execução de alvenaria, reboco e assentamento de pisos em obras residenciais.',
   'Experiência comprovada de 2 anos.', 'Vale-transporte, café da manhã, plano odontológico.'),
  ('00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000002',
   'Auxiliar Administrativo de Obras', 'Administrativo', 'Híbrido', 2200, 2600, 'Contagem - MG',
   'Controle de materiais, notas fiscais e apoio ao engenheiro responsável.',
   'Excel básico. Ensino médio completo.', 'Vale-refeição, vale-transporte.'),
  ('00000000-0000-4000-b000-000000000005', '00000000-0000-4000-a000-000000000003',
   'Operador(a) de Caixa', 'Comércio/Vendas', 'Presencial', 1650, 1850, 'Belo Horizonte - MG',
   'Registro de compras, recebimento de pagamentos e atendimento cordial.',
   'Ensino médio completo. Disponibilidade aos finais de semana.', 'Vale-alimentação, vale-transporte, desconto nas compras.'),
  ('00000000-0000-4000-b000-000000000006', '00000000-0000-4000-a000-000000000003',
   'Entregador com Moto', 'Logística/Transporte', 'Presencial', 2000, 2600, 'Belo Horizonte - MG',
   'Entregas de compras para clientes da região.', 'CNH categoria A e moto própria.', 'Ajuda de custo com combustível.'),
  ('00000000-0000-4000-b000-000000000007', '00000000-0000-4000-a000-000000000004',
   'Técnico(a) de Suporte de TI', 'Tecnologia', 'Remoto', 2500, 3200, 'Remoto',
   'Atendimento a clientes por chat e telefone, instalação de sistemas e solução de problemas.',
   'Conhecimento em Windows e redes básicas.', 'Auxílio internet, plano de saúde, horário flexível.'),
  ('00000000-0000-4000-b000-000000000008', '00000000-0000-4000-a000-000000000004',
   'Assistente de Atendimento ao Cliente', 'Atendimento', 'Remoto', 1800, 2200, 'Remoto',
   'Responder clientes por WhatsApp e e-mail, registrar chamados e acompanhar soluções.',
   'Boa escrita em português.', 'Auxílio internet, day off no aniversário.')
on conflict (id) do nothing;

insert into public.professionals (id, name, phone, city, about, price, services) values
  ('00000000-0000-4000-c000-000000000001', 'João Eletricista', '(31) 99999-0001', 'Belo Horizonte - MG',
   'Eletricista há 15 anos. Instalações residenciais, troca de disjuntores e chuveiros.', 'A partir de R$ 80,00',
   '[{"categoria":"Eletricista","descricao":"Instalações e reparos residenciais"}]'),
  ('00000000-0000-4000-c000-000000000002', 'Maria Diarista', '(31) 99999-0002', 'Contagem - MG',
   'Limpeza residencial e pós-obra com capricho e pontualidade.', 'R$ 180,00 a diária',
   '[{"categoria":"Diarista / Limpeza","descricao":"Limpeza residencial"},{"categoria":"Diarista / Limpeza","descricao":"Limpeza pós-obra"}]'),
  ('00000000-0000-4000-c000-000000000003', 'Carlos Pinturas', '(31) 99999-0003', 'Belo Horizonte - MG',
   'Pintura interna e externa, textura e grafiato. Orçamento sem compromisso.', null,
   '[{"categoria":"Pintor","descricao":"Pintura residencial e comercial"},{"categoria":"Pedreiro","descricao":"Pequenos reparos"}]'),
  ('00000000-0000-4000-c000-000000000004', 'Ana Montagens', '(31) 99999-0004', 'Betim - MG',
   'Montagem e desmontagem de móveis, instalação de prateleiras e cortinas.', 'A partir de R$ 60,00',
   '[{"categoria":"Montador de móveis","descricao":"Montagem de móveis em geral"}]')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 7. ADMINISTRADOR, PLANOS E PAGAMENTOS (Pix manual)
-- ---------------------------------------------------------------------
-- Quem é admin: só quem tiver is_admin = true. Isso NÃO pode ser feito pelo
-- site; é marcado uma única vez aqui no SQL Editor (veja o fim deste bloco).
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists blocked  boolean not null default false;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- Pelo site, só o admin muda is_admin e blocked (o SQL Editor continua podendo)
create or replace function public.protect_profile_flags()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.is_admin := old.is_admin;
    new.blocked  := old.blocked;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_flags on public.profiles;
create trigger protect_profile_flags before update on public.profiles
  for each row execute function public.protect_profile_flags();

-- Assinaturas de planos
create table if not exists public.subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  plan          text not null check (plan in ('basico','profissional','autonomo_destaque')),
  price         numeric not null default 0,
  status        text not null default 'pendente'
                check (status in ('pendente','ativa','recusada','cancelada')),
  starts_at     timestamptz,
  ends_at       timestamptz,
  note          text,
  created_at    timestamptz not null default now(),
  confirmed_at  timestamptz
);
create index if not exists subscriptions_user_idx on public.subscriptions(user_id);

create or replace function public.plan_price(p text)
returns numeric language sql immutable as $$
  select case p when 'basico' then 29.90 when 'profissional' then 49.90
                when 'autonomo_destaque' then 14.90 end;
$$;

-- Usuário comum só pede plano (fica "pendente") ou cancela um pedido pendente.
-- Preço sempre vem da tabela acima, nunca do site.
create or replace function public.subscriptions_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  if tg_op = 'INSERT' then
    new.price := public.plan_price(new.plan);
  end if;
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    select role into v_role from profiles where id = new.user_id;
    if (v_role = 'empresa' and new.plan not in ('basico','profissional'))
       or (v_role = 'profissional' and new.plan <> 'autonomo_destaque')
       or v_role not in ('empresa','profissional') then
      raise exception 'Este plano não está disponível para o seu perfil.';
    end if;
    new.status := 'pendente'; new.starts_at := null; new.ends_at := null;
    new.confirmed_at := null; new.note := null;
    return new;
  end if;
  -- UPDATE feito pelo próprio usuário: só cancelar pedido pendente
  if old.status = 'pendente' and new.status = 'cancelada' then
    new := old; new.status := 'cancelada';
    return new;
  end if;
  raise exception 'Somente o administrador pode alterar assinaturas.';
end;
$$;
drop trigger if exists subscriptions_guard on public.subscriptions;
create trigger subscriptions_guard before insert or update on public.subscriptions
  for each row execute function public.subscriptions_guard();

-- Plano ativo de um usuário (null = nenhum)
create or replace function public.active_plan(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select plan from subscriptions
  where user_id = uid and status = 'ativa' and now() >= starts_at and now() < ends_at
  order by case plan when 'profissional' then 1 when 'basico' then 2 else 3 end
  limit 1;
$$;
grant execute on function public.active_plan(uuid) to anon, authenticated;

-- Quem está em destaque agora (usado para ordenar a lista de serviços)
create or replace function public.featured_users()
returns table (user_id uuid, plan text) language sql stable security definer set search_path = public as $$
  select distinct on (s.user_id) s.user_id, s.plan from subscriptions s
  where s.status = 'ativa' and now() >= s.starts_at and now() < s.ends_at
  order by s.user_id, case s.plan when 'profissional' then 1 when 'basico' then 2 else 3 end;
$$;
grant execute on function public.featured_users() to anon, authenticated;

-- Admin confirma o Pix: o plano vale 30 dias (somados ao que ainda restar)
create or replace function public.confirm_subscription(sid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_start timestamptz;
begin
  if not public.is_admin() then raise exception 'Apenas o administrador.'; end if;
  select user_id into v_user from subscriptions where id = sid and status = 'pendente';
  if v_user is null then raise exception 'Pedido não encontrado ou já analisado.'; end if;
  select greatest(now(), coalesce(max(ends_at), now())) into v_start
    from subscriptions where user_id = v_user and status = 'ativa';
  update subscriptions set status = 'ativa', starts_at = v_start,
    ends_at = v_start + interval '30 days', confirmed_at = now()
  where id = sid;
end;
$$;
grant execute on function public.confirm_subscription(uuid) to authenticated;

-- Admin dá um plano direto (cortesia, acerto manual etc.)
create or replace function public.admin_grant_plan(uid uuid, p text, days int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Apenas o administrador.'; end if;
  insert into subscriptions (user_id, plan, status, starts_at, ends_at, confirmed_at, note)
  values (uid, p, 'ativa', now(), now() + make_interval(days => days), now(), 'Concedido pelo admin');
end;
$$;
grant execute on function public.admin_grant_plan(uuid, text, int) to authenticated;

-- Empresas: 30 dias grátis a partir do cadastro; depois precisa de plano.
-- Básico: até 5 vagas por mês. Profissional (e o teste): sem limite.
create or replace function public.company_can_publish(cid uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare v_owner uuid; v_created timestamptz; v_plan text; v_count int;
begin
  select owner_id, created_at into v_owner, v_created from companies where id = cid;
  if v_owner is null then return 'ok'; end if;              -- empresas de exemplo
  if v_created > now() - interval '30 days' then return 'ok'; end if;
  v_plan := public.active_plan(v_owner);
  if v_plan = 'profissional' then return 'ok'; end if;
  if v_plan = 'basico' then
    select count(*) into v_count from jobs
    where company_id = cid
      and created_at >= (date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
    if v_count < 5 then return 'ok'; end if;
    return 'limite';
  end if;
  return 'sem_plano';
end;
$$;
grant execute on function public.company_can_publish(uuid) to authenticated;

create or replace function public.jobs_check_plan()
returns trigger language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  v := public.company_can_publish(new.company_id);
  if v = 'limite' then
    raise exception 'LIMITE_VAGAS: o plano Básico permite até 5 vagas por mês.';
  elsif v = 'sem_plano' then
    raise exception 'PLANO_NECESSARIO: o teste grátis de 30 dias terminou. Escolha um plano para publicar vagas.';
  end if;
  return new;
end;
$$;
drop trigger if exists jobs_check_plan on public.jobs;
create trigger jobs_check_plan before insert on public.jobs
  for each row execute function public.jobs_check_plan();

-- Divulgar serviços da empresa também exige teste grátis ou plano ativo
create or replace function public.professionals_check_plan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.company_id is null or auth.uid() is null or public.is_admin() then return new; end if;
  if public.company_can_publish(new.company_id) = 'sem_plano' then
    raise exception 'PLANO_NECESSARIO: o teste grátis de 30 dias terminou. Escolha um plano para divulgar os serviços.';
  end if;
  return new;
end;
$$;
drop trigger if exists professionals_check_plan on public.professionals;
create trigger professionals_check_plan before insert on public.professionals
  for each row execute function public.professionals_check_plan();

-- Configurações do site (chave Pix e nome de quem recebe)
create table if not exists public.app_settings (
  key   text primary key,
  value text not null default ''
);
insert into public.app_settings (key, value) values ('pix_chave', ''), ('pix_nome', '')
on conflict (key) do nothing;

alter table public.subscriptions enable row level security;
alter table public.app_settings  enable row level security;

drop policy if exists "subs_select" on public.subscriptions;
create policy "subs_select" on public.subscriptions for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "subs_insert" on public.subscriptions;
create policy "subs_insert" on public.subscriptions for insert
  with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "subs_update" on public.subscriptions;
create policy "subs_update" on public.subscriptions for update
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "subs_delete" on public.subscriptions;
create policy "subs_delete" on public.subscriptions for delete
  using (public.is_admin());

drop policy if exists "settings_select" on public.app_settings;
create policy "settings_select" on public.app_settings for select
  using (auth.uid() is not null);
drop policy if exists "settings_admin" on public.app_settings;
create policy "settings_admin" on public.app_settings for all
  using (public.is_admin()) with check (public.is_admin());

-- O admin vê e modera tudo
drop policy if exists "profiles_admin_select" on public.profiles;
create policy "profiles_admin_select" on public.profiles for select using (public.is_admin());
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "companies_admin_update" on public.companies;
create policy "companies_admin_update" on public.companies for update
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "jobs_admin_select" on public.jobs;
create policy "jobs_admin_select" on public.jobs for select using (public.is_admin());
drop policy if exists "jobs_admin_delete" on public.jobs;
create policy "jobs_admin_delete" on public.jobs for delete using (public.is_admin());
drop policy if exists "professionals_admin_delete" on public.professionals;
create policy "professionals_admin_delete" on public.professionals for delete using (public.is_admin());
drop policy if exists "requests_admin_delete" on public.service_requests;
create policy "requests_admin_delete" on public.service_requests for delete using (public.is_admin());

-- ---------- Documentos: CNPJ (empresas) e CPF (autônomos) ----------
create or replace function public.only_digits(t text)
returns text language sql immutable as $$ select regexp_replace(coalesce(t, ''), '\D', '', 'g') $$;

create or replace function public.valid_cpf(t text)
returns boolean language plpgsql immutable as $$
declare d text := public.only_digits(t); s int; r int; i int;
begin
  if length(d) <> 11 or d ~ '^(\d)\1{10}$' then return false; end if;
  for k in 9..10 loop
    s := 0;
    for i in 1..k loop s := s + substr(d, i, 1)::int * (k + 2 - i); end loop;
    r := (s * 10) % 11; if r = 10 then r := 0; end if;
    if r <> substr(d, k + 1, 1)::int then return false; end if;
  end loop;
  return true;
end;
$$;

create or replace function public.valid_cnpj(t text)
returns boolean language plpgsql immutable as $$
declare d text := public.only_digits(t); w int[]; s int; r int; i int;
begin
  if length(d) <> 14 or d ~ '^(\d)\1{13}$' then return false; end if;
  w := array[5,4,3,2,9,8,7,6,5,4,3,2];
  s := 0; for i in 1..12 loop s := s + substr(d, i, 1)::int * w[i]; end loop;
  r := s % 11; r := case when r < 2 then 0 else 11 - r end;
  if r <> substr(d, 13, 1)::int then return false; end if;
  w := array[6,5,4,3,2,9,8,7,6,5,4,3,2];
  s := 0; for i in 1..13 loop s := s + substr(d, i, 1)::int * w[i]; end loop;
  r := s % 11; r := case when r < 2 then 0 else 11 - r end;
  return r = substr(d, 14, 1)::int;
end;
$$;

alter table public.profiles  add column if not exists cpf text;
alter table public.companies add column if not exists cnpj_check jsonb;   -- resultado da verificação (só o admin grava)

-- Limpeza antes das regras de "um cadastro por documento": CNPJ inválido (ex.: 11.111.111/1111-11)
-- ou repetido vira vazio. Nada é apagado; a empresa só precisa informar um CNPJ válido de novo.
update public.companies set cnpj = null
where coalesce(cnpj, '') <> '' and not public.valid_cnpj(cnpj);
update public.companies c set cnpj = null
where coalesce(c.cnpj, '') <> '' and exists (
  select 1 from public.companies o
  where o.id <> c.id and public.only_digits(o.cnpj) = public.only_digits(c.cnpj)
    and (o.created_at, o.id) < (c.created_at, c.id));
update public.profiles set cpf = null
where coalesce(cpf, '') <> '' and not public.valid_cpf(cpf);

create unique index if not exists profiles_cpf_uniq on public.profiles (public.only_digits(cpf))
  where cpf is not null and cpf <> '';
create unique index if not exists companies_cnpj_uniq on public.companies (public.only_digits(cnpj))
  where cnpj is not null and cnpj <> '';

-- CPF: precisa ser válido e, depois de salvo, só o admin troca
create or replace function public.protect_profile_flags()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.is_admin := old.is_admin;
    new.blocked  := old.blocked;
    if coalesce(old.cpf, '') <> '' then new.cpf := old.cpf; end if;
  end if;
  if coalesce(new.cpf, '') <> '' and coalesce(new.cpf, '') is distinct from coalesce(old.cpf, '') then
    if not public.valid_cpf(new.cpf) then raise exception 'CPF_INVALIDO: confira o CPF digitado.'; end if;
  end if;
  return new;
end;
$$;

-- Teste grátis: uma vez por CNPJ, para sempre (mesmo se a empresa for apagada)
create table if not exists public.trial_registry (
  cnpj        text primary key,
  started_at  timestamptz not null default now()
);
alter table public.trial_registry enable row level security;
drop policy if exists "trial_admin" on public.trial_registry;
create policy "trial_admin" on public.trial_registry for select using (public.is_admin());

-- CNPJ: obrigatório, válido, único e travado depois de salvo (só o admin troca)
create or replace function public.companies_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'UPDATE' then
      if coalesce(old.cnpj, '') <> '' then new.cnpj := old.cnpj; end if;
      new.cnpj_check := old.cnpj_check;
    else
      new.cnpj_check := null;
    end if;
    if not public.valid_cnpj(new.cnpj) then
      raise exception 'CNPJ_INVALIDO: informe um CNPJ válido.';
    end if;
  end if;
  if coalesce(new.cnpj, '') <> '' then
    insert into trial_registry (cnpj, started_at)
    values (public.only_digits(new.cnpj), coalesce(new.created_at, now()))
    on conflict (cnpj) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists companies_guard on public.companies;
create trigger companies_guard before insert or update on public.companies
  for each row execute function public.companies_guard();

-- Empresas que já tinham CNPJ válido entram no registro do teste grátis (pela data do cadastro)
insert into public.trial_registry (cnpj, started_at)
select public.only_digits(cnpj), min(created_at) from public.companies
where coalesce(cnpj, '') <> '' and public.valid_cnpj(cnpj)
group by public.only_digits(cnpj)
on conflict (cnpj) do nothing;

-- Quando termina o teste grátis da empresa
create or replace function public.company_trial_ends(cid uuid)
returns timestamptz language sql stable security definer set search_path = public as $$
  select coalesce(
    (select t.started_at from trial_registry t join companies c on t.cnpj = public.only_digits(c.cnpj) where c.id = cid),
    (select created_at from companies where id = cid)
  ) + interval '30 days';
$$;
grant execute on function public.company_trial_ends(uuid) to authenticated;

-- Agora conta o teste pelo CNPJ (e não pela data do cadastro)
create or replace function public.company_can_publish(cid uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare v_owner uuid; v_plan text; v_count int;
begin
  select owner_id into v_owner from companies where id = cid;
  if v_owner is null then return 'ok'; end if;              -- empresas de exemplo
  if now() < public.company_trial_ends(cid) then return 'ok'; end if;
  v_plan := public.active_plan(v_owner);
  if v_plan = 'profissional' then return 'ok'; end if;
  if v_plan = 'basico' then
    select count(*) into v_count from jobs
    where company_id = cid
      and created_at >= (date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
    if v_count < 5 then return 'ok'; end if;
    return 'limite';
  end if;
  return 'sem_plano';
end;
$$;

-- Empresa "em dia": teste grátis ou plano ativo
create or replace function public.company_active(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.company_can_publish(cid) <> 'sem_plano';
$$;
grant execute on function public.company_active(uuid) to anon, authenticated;

-- Autônomo precisa de CPF para divulgar o perfil
create or replace function public.professionals_check_plan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if new.company_id is null then
    if coalesce((select cpf from profiles where id = new.user_id), '') = '' then
      raise exception 'CPF_NECESSARIO: informe seu CPF para divulgar seus serviços.';
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' and public.company_can_publish(new.company_id) = 'sem_plano' then
    raise exception 'PLANO_NECESSARIO: o teste grátis de 30 dias terminou. Escolha um plano para divulgar os serviços.';
  end if;
  -- Teste grátis e Básico: até 3 serviços. Profissional: sem limite.
  if jsonb_array_length(coalesce(new.services, '[]'::jsonb)) > 3
     and public.active_plan(new.user_id) is distinct from 'profissional'
     and (tg_op = 'INSERT' or new.services is distinct from old.services) then
    raise exception 'LIMITE_SERVICOS: seu plano permite até 3 serviços. No plano Profissional, são ilimitados.';
  end if;
  return new;
end;
$$;
drop trigger if exists professionals_check_plan on public.professionals;
create trigger professionals_check_plan before insert or update on public.professionals
  for each row execute function public.professionals_check_plan();

-- Plano vencido: vagas e divulgação ficam PAUSADAS (escondidas), nada é apagado.
-- Voltam sozinhas quando o pagamento é confirmado.
drop policy if exists "jobs_select" on public.jobs;
create policy "jobs_select" on public.jobs for select
  using ((status = 'aberta' and public.company_active(company_id))
         or public.is_company_owner(company_id) or public.has_applied(id));
drop policy if exists "professionals_select" on public.professionals;
create policy "professionals_select" on public.professionals for select
  using (company_id is null or public.company_active(company_id) or user_id = auth.uid());

-- ---------- Sugestões e feedbacks dos usuários ----------
-- O usuário só ENVIA (não vê o histórico). Só o admin lê, anota e marca como lida/resolvida.
create table if not exists public.feedbacks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  role        text,
  kind        text not null default 'sugestao' check (kind in ('sugestao','problema','elogio','outro')),
  message     text not null check (char_length(message) between 5 and 1000),
  status      text not null default 'nova' check (status in ('nova','lida','resolvida')),
  admin_note  text,
  created_at  timestamptz not null default now()
);
create index if not exists feedbacks_created_idx on public.feedbacks(created_at desc);

create or replace function public.feedbacks_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  -- quem envia é sempre o próprio usuário; status e anotação são do admin
  new.user_id := auth.uid();
  new.role := (select role from profiles where id = auth.uid());
  new.status := 'nova'; new.admin_note := null; new.created_at := now();
  if (select count(*) from feedbacks where user_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then
    raise exception 'LIMITE_SUGESTOES: você já enviou 5 mensagens hoje. Tente de novo amanhã.';
  end if;
  return new;
end;
$$;
drop trigger if exists feedbacks_guard on public.feedbacks;
create trigger feedbacks_guard before insert on public.feedbacks
  for each row execute function public.feedbacks_guard();

alter table public.feedbacks enable row level security;
drop policy if exists "feedbacks_insert" on public.feedbacks;
create policy "feedbacks_insert" on public.feedbacks for insert
  with check (auth.uid() is not null);
drop policy if exists "feedbacks_admin" on public.feedbacks;
create policy "feedbacks_admin" on public.feedbacks for all
  using (public.is_admin()) with check (public.is_admin());

-- PARA VIRAR ADMIN (rodar uma vez só, trocando o e-mail pelo da conta admin):
--   update public.profiles set is_admin = true where email = 'SEU_EMAIL_AQUI';

-- Pronto! Se apareceu "Success. No rows returned", deu tudo certo.
