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

-- Pronto! Se apareceu "Success. No rows returned", deu tudo certo.
