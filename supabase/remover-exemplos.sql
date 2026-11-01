-- Remove as empresas, vagas e profissionais de EXEMPLO
-- (os cadastrados por pessoas reais não são afetados)
delete from public.companies     where owner_id is null;   -- apaga também as vagas delas
delete from public.professionals where user_id  is null;
