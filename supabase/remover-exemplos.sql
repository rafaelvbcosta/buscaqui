-- Remove as empresas, vagas e profissionais de EXEMPLO
-- (os cadastrados por pessoas reais não são afetados)
-- Pode rodar mais de uma vez. Depois dele, rodar o setup.sql de novo NÃO recria os exemplos.
delete from public.companies       where owner_id is null;   -- apaga também as vagas e a divulgação delas
delete from public.professionals   where user_id  is null and company_id is null;
delete from public.service_requests where user_id is null;
insert into public.app_settings (key, value) values ('exemplos_removidos', to_char(now(), 'YYYY-MM-DD'))
on conflict (key) do nothing;
