-- Testes das regras do banco. Cada teste imprime "OK" ou para com "FALHOU: ...".
-- Rodar DEPOIS do setup.sql, num banco de teste (nunca no Supabase de verdade).
\set ON_ERROR_STOP 1
\set QUIET 1
grant all on all tables in schema public to authenticated, anon;
insert into auth.users(id,email,raw_user_meta_data) values
 ('e9000000-0000-4000-8000-000000000001','emp1@teste','{"role":"empresa"}'),
 ('e9000000-0000-4000-8000-000000000002','emp2@teste','{"role":"empresa"}'),
 ('f9000000-0000-4000-8000-000000000001','aut1@teste','{"role":"profissional"}'),
 ('f9000000-0000-4000-8000-000000000002','aut2@teste','{"role":"profissional"}'),
 ('c9000000-0000-4000-8000-000000000001','cand@teste','{"role":"candidato","is_admin":true,"terms_version":"2026-11-03"}'),
 ('d9000000-0000-4000-8000-000000000001','adm@teste','{"role":"candidato"}');
update profiles set is_admin = true where email = 'adm@teste';

-- Função de apoio: espera que um comando FALHE
create or replace function pg_temp.deve_falhar(cmd text, nome text) returns void language plpgsql as $f$
begin
  begin execute cmd; exception when others then raise notice 'OK  %', nome; return; end;
  raise exception 'FALHOU: % (o comando deveria ter sido barrado)', nome;
end $f$;
create or replace function pg_temp.confere(ok boolean, nome text) returns void language plpgsql as $f$
begin if ok then raise notice 'OK  %', nome; else raise exception 'FALHOU: %', nome; end if; end $f$;
create or replace function pg_temp.como(uid text) returns void language sql as $f$ select set_config('request.jwt.claim.sub', uid, false) $f$;
\set QUIET 0
set client_min_messages = notice;

select pg_temp.confere((select not is_admin from profiles where email='cand@teste'), 'cadastro com is_admin no metadata NÃO vira admin');
select pg_temp.confere(public.valid_cpf('529.982.247-25') and not public.valid_cpf('111.111.111-11') and not public.valid_cpf('529.982.247-24'), 'validação de CPF');
select pg_temp.confere(public.valid_cnpj('11.222.333/0001-81') and not public.valid_cnpj('11.111.111/1111-11') and not public.valid_cnpj('11.222.333/0001-80'), 'validação de CNPJ');

set role authenticated;
select pg_temp.como('c9000000-0000-4000-8000-000000000001');
update profiles set is_admin = true where id = auth.uid();
select pg_temp.confere((select not is_admin from profiles where id = auth.uid()), 'usuário não vira admin pelo site');
select pg_temp.confere((select terms_version = '2026-11-03' and terms_accepted_at is not null from profiles where id = auth.uid()), 'cadastro grava a versão e a data do aceite dos termos');
update profiles set terms_accepted_at = now() - interval '1 year', terms_version = 'falsa' where id = auth.uid();
select pg_temp.confere((select terms_version = '2026-11-03' and terms_accepted_at > now() - interval '1 day' from profiles where id = auth.uid()), 'usuário não altera o registro do aceite dos termos');
select pg_temp.deve_falhar($$select public.confirm_subscription(gen_random_uuid())$$, 'usuário comum não confirma pagamento');
select pg_temp.deve_falhar($$insert into companies(owner_id,name) values (auth.uid(),'X')$$, 'empresa sem CNPJ é barrada');

select pg_temp.como('e9000000-0000-4000-8000-000000000001');
select pg_temp.deve_falhar($$insert into companies(owner_id,name,cnpj) values (auth.uid(),'A','11.222.333/0001-80')$$, 'CNPJ inválido é barrado');
insert into companies(id,owner_id,name,cnpj) values ('ca900000-0000-4000-8000-000000000001',auth.uid(),'A','11.222.333/0001-81');
update companies set cnpj='45.723.174/0001-10' where owner_id=auth.uid();
select pg_temp.confere((select cnpj from companies where owner_id=auth.uid())='11.222.333/0001-81', 'CNPJ salvo não pode ser trocado pelo usuário');
insert into jobs(company_id,title,category,modality,description) values ('ca900000-0000-4000-8000-000000000001','Vaga no teste','x','Presencial','d');
select pg_temp.confere(true, 'empresa no teste grátis publica vaga');
insert into subscriptions(user_id,plan,price,status) values (auth.uid(),'basico',1,'ativa');
select pg_temp.confere((select price=29.90 and status='pendente' from subscriptions where user_id=auth.uid()), 'pedido de plano: preço e situação vêm do banco');
select pg_temp.deve_falhar($$update subscriptions set status='ativa' where user_id=auth.uid()$$, 'usuário não ativa o próprio plano');
select pg_temp.deve_falhar($$insert into subscriptions(user_id,plan) values (auth.uid(),'autonomo_destaque')$$, 'empresa não pede plano de autônomo');

select pg_temp.como('e9000000-0000-4000-8000-000000000002');
select pg_temp.deve_falhar($$insert into companies(owner_id,name,cnpj) values (auth.uid(),'B','11222333000181')$$, 'CNPJ repetido (sem pontos) é barrado');
select pg_temp.confere((select count(*)=0 from subscriptions), 'empresa não vê pedidos de outra');

select pg_temp.como('f9000000-0000-4000-8000-000000000001');
select pg_temp.deve_falhar($$insert into professionals(user_id,name) values (auth.uid(),'P1')$$, 'autônomo sem CPF não divulga');
select pg_temp.deve_falhar($$insert into user_docs(user_id,cpf) values (auth.uid(),'529.982.247-24')$$, 'CPF inválido é barrado');
insert into user_docs(user_id,cpf) values (auth.uid(),'529.982.247-25');
insert into professionals(user_id,name) values (auth.uid(),'P1');
select pg_temp.confere(true, 'autônomo com CPF divulga');
select pg_temp.deve_falhar($$update user_docs set cpf='153.509.460-56' where user_id=auth.uid() returning 1/0$$, 'CPF salvo não pode ser trocado pelo usuário');
select pg_temp.confere((select cpf='529.982.247-25' from user_docs where user_id=auth.uid()), 'CPF salvo continua o mesmo');
update profiles set cpf='529.982.247-25' where id=auth.uid();
select pg_temp.confere((select cpf is null from profiles where id=auth.uid()), 'perfil nunca guarda CPF (fica em user_docs)');
select pg_temp.como('f9000000-0000-4000-8000-000000000002');
select pg_temp.deve_falhar($$insert into user_docs(user_id,cpf) values (auth.uid(),'52998224725')$$, 'CPF repetido é barrado');
select pg_temp.deve_falhar($$insert into user_docs(user_id,cpf) values ('f9000000-0000-4000-8000-000000000001','153.509.460-56')$$, 'usuário não grava CPF em nome de outro');
-- LGPD: a empresa que recebe a candidatura de um autônomo NÃO vê o CPF dele
select pg_temp.como('f9000000-0000-4000-8000-000000000001');
insert into applications(job_id,candidate_id) select id, auth.uid() from jobs where company_id='ca900000-0000-4000-8000-000000000001' limit 1;
select pg_temp.como('e9000000-0000-4000-8000-000000000001');
select pg_temp.confere((select count(*)=1 from profiles where id='f9000000-0000-4000-8000-000000000001'), 'empresa vê o perfil de quem se candidatou');
select pg_temp.confere((select count(*)=0 from user_docs where user_id='f9000000-0000-4000-8000-000000000001'), 'empresa NÃO vê o CPF de quem se candidatou');
select pg_temp.confere((select cpf is null from profiles where id='f9000000-0000-4000-8000-000000000001'), 'perfil lido pela empresa não traz CPF');

select pg_temp.como('c9000000-0000-4000-8000-000000000001');
insert into feedbacks(user_id,kind,message,status) values ('f9000000-0000-4000-8000-000000000001','sugestao','Mensagem de teste 1','resolvida');
select pg_temp.confere((select count(*)=0 from feedbacks), 'usuário não lê sugestões (nem a própria)');
insert into feedbacks(kind,message) select 'outro','Mensagem de teste '||g from generate_series(2,5) g;
select pg_temp.deve_falhar($$insert into feedbacks(kind,message) values ('outro','Sexta mensagem')$$, 'máximo de 5 sugestões por dia');
update app_settings set value='golpe' where key='pix_chave';
select pg_temp.confere((select value <> 'golpe' from app_settings where key='pix_chave'), 'usuário não muda a chave Pix');
delete from jobs;
select pg_temp.como('e9000000-0000-4000-8000-000000000001');
select pg_temp.confere((select count(*)=1 from jobs where company_id='ca900000-0000-4000-8000-000000000001') and (select count(*)>0 from jobs where company_id<>'ca900000-0000-4000-8000-000000000001'), 'usuário não apaga vaga de outra empresa');
select pg_temp.como('c9000000-0000-4000-8000-000000000001');

select pg_temp.como('d9000000-0000-4000-8000-000000000001');
select pg_temp.confere((select count(*)=5 and bool_and(user_id='c9000000-0000-4000-8000-000000000001' and status='nova') from feedbacks), 'admin vê as sugestões com o autor real');
select pg_temp.confere((select count(*)=1 from user_docs where user_id='f9000000-0000-4000-8000-000000000001'), 'admin vê o CPF');
update user_docs set cpf='153.509.460-56' where user_id='f9000000-0000-4000-8000-000000000001';
select pg_temp.confere((select cpf='153.509.460-56' from user_docs where user_id='f9000000-0000-4000-8000-000000000001'), 'admin corrige o CPF');
select public.confirm_subscription(id) from subscriptions where status='pendente';
select pg_temp.confere((select status='ativa' and ends_at-starts_at=interval '30 days' from subscriptions limit 1), 'admin confirma o Pix: 30 dias');
reset role;

-- Empresa recriada não ganha outro teste; vaga pausa quando o plano vence
update trial_registry set started_at = now() - interval '40 days';
update subscriptions set starts_at = now() - interval '31 days', ends_at = now() - interval '1 minute';
set role authenticated;
select pg_temp.como('e9000000-0000-4000-8000-000000000001');
select pg_temp.deve_falhar($$insert into jobs(company_id,title,category,modality,description) values ('ca900000-0000-4000-8000-000000000001','V','x','Presencial','d')$$, 'teste/plano vencido: não publica vaga nova');
select pg_temp.confere((select count(*)=1 from jobs where company_id='ca900000-0000-4000-8000-000000000001'), 'dono continua vendo a vaga pausada');
select pg_temp.como('c9000000-0000-4000-8000-000000000001');
select pg_temp.confere((select count(*)=0 from jobs where company_id='ca900000-0000-4000-8000-000000000001'), 'público não vê a vaga pausada');
select pg_temp.como('d9000000-0000-4000-8000-000000000001');
select public.admin_grant_plan('e9000000-0000-4000-8000-000000000001','basico',30);
select pg_temp.como('c9000000-0000-4000-8000-000000000001');
select pg_temp.confere((select count(*)=1 from jobs where company_id='ca900000-0000-4000-8000-000000000001'), 'plano renovado: a vaga volta a aparecer');
select pg_temp.como('e9000000-0000-4000-8000-000000000001');
insert into jobs(company_id,title,category,modality,description) select 'ca900000-0000-4000-8000-000000000001','V'||g,'x','Presencial','d' from generate_series(1,4) g;
select pg_temp.deve_falhar($$insert into jobs(company_id,title,category,modality,description) values ('ca900000-0000-4000-8000-000000000001','V6','x','Presencial','d')$$, 'Básico: a 6ª vaga do mês é barrada');
reset role;

-- Excluir minha conta
select pg_temp.deve_falhar($$set role anon; select public.delete_my_account()$$, 'sem login não exclui conta');
reset role;
set role authenticated;
select pg_temp.como('d9000000-0000-4000-8000-000000000001');
select pg_temp.deve_falhar($$select public.delete_my_account()$$, 'admin não exclui a própria conta pelo site');
select pg_temp.como('e9000000-0000-4000-8000-000000000001');
select public.delete_my_account();
select pg_temp.como('f9000000-0000-4000-8000-000000000001');
select public.delete_my_account();
reset role;
select pg_temp.confere(not exists (select 1 from auth.users where id in ('e9000000-0000-4000-8000-000000000001','f9000000-0000-4000-8000-000000000001'))
  and not exists (select 1 from profiles where id in ('e9000000-0000-4000-8000-000000000001','f9000000-0000-4000-8000-000000000001')), 'usuário exclui a própria conta (login e perfil somem)');
select pg_temp.confere(not exists (select 1 from companies where id='ca900000-0000-4000-8000-000000000001')
  and not exists (select 1 from jobs where company_id='ca900000-0000-4000-8000-000000000001')
  and not exists (select 1 from subscriptions where user_id='e9000000-0000-4000-8000-000000000001'), 'empresa, vagas e pedidos de plano saem junto');
select pg_temp.confere(not exists (select 1 from user_docs where user_id='f9000000-0000-4000-8000-000000000001')
  and not exists (select 1 from professionals where user_id='f9000000-0000-4000-8000-000000000001'), 'CPF e perfil profissional saem junto');
select pg_temp.confere(exists (select 1 from trial_registry where public.only_digits(cnpj)='11222333000181'), 'CNPJ continua marcado como "já usou o teste"');
select pg_temp.confere((select count(*)=2 from profiles where id in ('e9000000-0000-4000-8000-000000000002','f9000000-0000-4000-8000-000000000002')), 'contas dos outros continuam intactas');
-- Promoção de lançamento e prazo de cada vaga
select pg_temp.como('');
insert into auth.users(id,email,raw_user_meta_data) values
 ('e9000000-0000-4000-8000-000000000003','emp3@teste','{"role":"empresa"}'),
 ('e9000000-0000-4000-8000-000000000004','emp4@teste','{"role":"empresa"}');
insert into companies(id,owner_id,name,cnpj) values ('ca900000-0000-4000-8000-000000000003','e9000000-0000-4000-8000-000000000003','C3','12.345.678/0001-95');
update trial_registry set started_at = now() - interval '40 days' where cnpj = '12345678000195';
delete from app_settings where key = 'promo_ate';
set role authenticated;
select pg_temp.como('e9000000-0000-4000-8000-000000000003');
select pg_temp.deve_falhar($$insert into jobs(company_id,title,category,modality,description) values ('ca900000-0000-4000-8000-000000000003','V','x','Presencial','d')$$, 'sem promoção: teste vencido não publica vaga');
reset role;
select pg_temp.como('');
insert into app_settings(key,value) values ('promo_ate', to_char((now() at time zone 'America/Sao_Paulo')::date + 10, 'YYYY-MM-DD'))
on conflict (key) do update set value = excluded.value;
set role authenticated;
select pg_temp.como('e9000000-0000-4000-8000-000000000003');
insert into jobs(id,company_id,title,category,modality,description,paid_until) values ('b9000000-0000-4000-8000-000000000001','ca900000-0000-4000-8000-000000000003','Promo','x','Presencial','d', now() + interval '5 years');
select pg_temp.confere((select paid_until between now() + interval '29 days' and now() + interval '31 days' from jobs where id='b9000000-0000-4000-8000-000000000001'), 'promoção: vaga grátis fica 30 dias no ar (o prazo enviado pelo usuário é ignorado)');
update jobs set paid_until = now() + interval '1 year' where id='b9000000-0000-4000-8000-000000000001';
select pg_temp.confere((select paid_until < now() + interval '31 days' from jobs where id='b9000000-0000-4000-8000-000000000001'), 'empresa não muda o prazo da vaga');
select pg_temp.como('c9000000-0000-4000-8000-000000000001');
select pg_temp.confere(exists (select 1 from jobs where id='b9000000-0000-4000-8000-000000000001'), 'público vê a vaga da promoção mesmo com o teste da empresa vencido');
select pg_temp.como('e9000000-0000-4000-8000-000000000004');
insert into companies(id,owner_id,name,cnpj) values ('ca900000-0000-4000-8000-000000000004',auth.uid(),'C4','98.765.432/0001-98');
select pg_temp.confere(public.company_trial_ends('ca900000-0000-4000-8000-000000000004') >= public.promo_ends() + interval '30 days', 'empresa que entra na promoção: teste de 30 dias começa depois dela');
reset role;
select pg_temp.como('');
update jobs set paid_until = now() - interval '1 minute' where id='b9000000-0000-4000-8000-000000000001';
delete from app_settings where key = 'promo_ate';
set role authenticated;
select pg_temp.como('c9000000-0000-4000-8000-000000000001');
select pg_temp.confere(not exists (select 1 from jobs where id='b9000000-0000-4000-8000-000000000001'), 'vaga da promoção sai do ar quando vence o prazo (nada é apagado)');
select pg_temp.como('e9000000-0000-4000-8000-000000000003');
select pg_temp.confere(exists (select 1 from jobs where id='b9000000-0000-4000-8000-000000000001'), 'a empresa continua vendo a vaga vencida');
reset role;
-- Vaga avulsa (R$ 9,90) e renovação. A empresa C3 está com o teste vencido e sem promoção.
set role authenticated;
select pg_temp.como('e9000000-0000-4000-8000-000000000003');
insert into jobs(id,company_id,title,category,modality,description,status) values ('b9000000-0000-4000-8000-000000000002','ca900000-0000-4000-8000-000000000003','Avulsa','x','Presencial','d','aguardando');
select pg_temp.confere((select status='aguardando' and paid_until is null from jobs where id='b9000000-0000-4000-8000-000000000002'), 'vaga avulsa: fica aguardando o pagamento');
select pg_temp.deve_falhar($$update jobs set status='aberta' where id='b9000000-0000-4000-8000-000000000002'$$, 'empresa não coloca no ar a vaga que espera o Pix');
insert into subscriptions(id,user_id,plan,job_id,price) values ('d9100000-0000-4000-8000-000000000001',auth.uid(),'vaga_avulsa','b9000000-0000-4000-8000-000000000002',0.01);
select pg_temp.confere((select price=9.90 and status='pendente' from subscriptions where id='d9100000-0000-4000-8000-000000000001'), 'pedido da vaga avulsa custa R$ 9,90 (preço do banco)');
select pg_temp.deve_falhar($$insert into subscriptions(user_id,plan,job_id) values (auth.uid(),'vaga_avulsa','b9000000-0000-4000-8000-000000000002')$$, 'só um pedido pendente por vaga');
select pg_temp.como('e9000000-0000-4000-8000-000000000004');
insert into jobs(id,company_id,title,category,modality,description) values ('b9000000-0000-4000-8000-000000000003','ca900000-0000-4000-8000-000000000004','Da C4','x','Presencial','d');
select pg_temp.como('e9000000-0000-4000-8000-000000000003');
select pg_temp.deve_falhar($$insert into subscriptions(user_id,plan,job_id) values (auth.uid(),'vaga_avulsa','b9000000-0000-4000-8000-000000000003')$$, 'não paga vaga de outra empresa');
select pg_temp.como('c9000000-0000-4000-8000-000000000001');
select pg_temp.confere(not exists (select 1 from jobs where id='b9000000-0000-4000-8000-000000000002'), 'vaga aguardando pagamento não aparece para o público');
select pg_temp.como('d9000000-0000-4000-8000-000000000001');
select public.confirm_subscription('d9100000-0000-4000-8000-000000000001');
select pg_temp.confere((select status='aberta' and paid_until between now()+interval '29 days' and now()+interval '31 days' from jobs where id='b9000000-0000-4000-8000-000000000002'), 'admin confirma o Pix: vaga avulsa no ar por 30 dias');
select pg_temp.confere(public.active_plan('e9000000-0000-4000-8000-000000000003') is null, 'vaga avulsa não vira plano');
select pg_temp.como('c9000000-0000-4000-8000-000000000001');
select pg_temp.confere(exists (select 1 from jobs where id='b9000000-0000-4000-8000-000000000002'), 'público vê a vaga avulsa paga');
select pg_temp.como('e9000000-0000-4000-8000-000000000003');
insert into subscriptions(id,user_id,plan,job_id) values ('d9100000-0000-4000-8000-000000000002',auth.uid(),'vaga_avulsa','b9000000-0000-4000-8000-000000000002');
select pg_temp.como('d9000000-0000-4000-8000-000000000001');
select public.confirm_subscription('d9100000-0000-4000-8000-000000000002');
select pg_temp.confere((select paid_until between now()+interval '59 days' and now()+interval '61 days' from jobs where id='b9000000-0000-4000-8000-000000000002'), 'renovar vaga: soma mais 30 dias');
reset role;
-- Pacote de 3 vagas (R$ 24,90, 90 dias). Empresa C3: teste vencido, sem plano.
set role authenticated;
select pg_temp.como('e9000000-0000-4000-8000-000000000003');
insert into jobs(id,company_id,title,category,modality,description,status) values ('b9000000-0000-4000-8000-000000000004','ca900000-0000-4000-8000-000000000003','P1','x','Presencial','d','aguardando');
select pg_temp.deve_falhar($$select public.use_package_credit('b9000000-0000-4000-8000-000000000004')$$, 'sem pacote: não usa vaga do pacote');
insert into subscriptions(id,user_id,plan,credits_left,price) values ('d9200000-0000-4000-8000-000000000001',auth.uid(),'pacote3',99,1);
select pg_temp.confere((select price=24.90 and credits_left=0 and status='pendente' from subscriptions where id='d9200000-0000-4000-8000-000000000001'), 'pacote custa R$ 24,90 e só ganha vagas depois do Pix');
select pg_temp.deve_falhar($$select public.use_package_credit('b9000000-0000-4000-8000-000000000004')$$, 'pacote não confirmado: não usa');
select pg_temp.como('d9000000-0000-4000-8000-000000000001');
select public.confirm_subscription('d9200000-0000-4000-8000-000000000001');
select pg_temp.confere((select credits_left=3 and ends_at between now()+interval '89 days' and now()+interval '91 days' from subscriptions where id='d9200000-0000-4000-8000-000000000001'), 'admin confirma: 3 vagas para usar em 90 dias');
select pg_temp.confere(public.active_plan('e9000000-0000-4000-8000-000000000003') is null, 'pacote não vira plano');
select pg_temp.como('e9000000-0000-4000-8000-000000000003');
select public.use_package_credit('b9000000-0000-4000-8000-000000000004');
select pg_temp.confere((select status='aberta' and paid_until between now()+interval '29 days' and now()+interval '31 days' from jobs where id='b9000000-0000-4000-8000-000000000004')
  and (select credits_left=2 from subscriptions where id='d9200000-0000-4000-8000-000000000001'), 'usar o pacote: vaga no ar por 30 dias e sobram 2');
select public.use_package_credit('b9000000-0000-4000-8000-000000000004');
select pg_temp.confere((select paid_until between now()+interval '59 days' and now()+interval '61 days' from jobs where id='b9000000-0000-4000-8000-000000000004'), 'renovar com o pacote: mais 30 dias');
select pg_temp.deve_falhar($$select public.use_package_credit('b9000000-0000-4000-8000-000000000003')$$, 'não usa o pacote em vaga de outra empresa');
select public.use_package_credit('b9000000-0000-4000-8000-000000000004');
select pg_temp.deve_falhar($$select public.use_package_credit('b9000000-0000-4000-8000-000000000004')$$, 'acabaram as 3 vagas: a 4ª é barrada');
select pg_temp.deve_falhar($$update subscriptions set credits_left = 10 where id='d9200000-0000-4000-8000-000000000001'$$, 'empresa não aumenta as vagas do pacote');
insert into jobs(id,company_id,title,category,modality,description,status) values ('b9000000-0000-4000-8000-000000000005','ca900000-0000-4000-8000-000000000003','P2','x','Presencial','d','aguardando');
select pg_temp.deve_falhar($$update jobs set status='aberta' where id='b9000000-0000-4000-8000-000000000005'$$, 'sem vagas no pacote: empresa continua sem poder colocar a vaga no ar sozinha');
update jobs set paid_until = now() + interval '5 years' where id='b9000000-0000-4000-8000-000000000004';
select pg_temp.confere((select paid_until < now() + interval '100 days' from jobs where id='b9000000-0000-4000-8000-000000000004'), 'empresa continua sem poder mudar o prazo da vaga');
reset role;
\echo
\echo 'Todos os testes de segurança passaram.'
