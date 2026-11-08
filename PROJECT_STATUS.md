# BuscAqui — status do projeto

> Atualizado em **07/11/2026**. Base: branch `main` (PR #26) + PR #27 (textos da página inicial).
> Regras, arquitetura e como testar estão em **`CLAUDE.md`**.
> Legenda: ✅ confirmado no código · 🧪 testado pelo Rafael no site real · ⚠️ não confirmado (ver seção 9).

## 1. Situação geral
- Site **no ar** em https://www.buscaquiarcos.com.br/ (domínio próprio com HTTPS) — 🧪.
- **Ainda não aberto ao público.** O Rafael está testando e preparando a divulgação.
- Supabase configurado: `setup.sql` mais recente (com `feedbacks`) rodado no projeto real — 🧪 (Rafael confirmou
  "Success" antes do merge do PR #16).
- Documentação e testes automatizados (`CLAUDE.md`, `PROJECT_STATUS.md`, `README.md`, `tools/testes/`) entram
  na `main` pelo PR #17.

## 2. Funcionalidades implementadas
| Área | O que funciona | Status |
|---|---|---|
| Cadastro e login | E-mail/senha, escolha de perfil, nova senha por e-mail, sair | ✅ 🧪 |
| Página inicial | "Oportunidades de vagas e serviços em Arcos."; texto deixa claro o que é grátis (trabalhador, currículo, perfil do autônomo) e "Comece com 30 dias grátis" para empresas (sem dizer que tudo é gratuito); rodapé "Feito para Arcos - MG" e links legais | ✅ 🧪 |
| Candidato | Vagas com busca, categoria, salário e favoritas; detalhe; candidatura; Minhas candidaturas (status, entrevista); Currículo fácil; prévia; PDF grátis com rodapé em cada página A4; envio de PDF próprio | ✅ 🧪 |
| Empresa | Cadastro com CNPJ (BrasilAPI), logo encaixada no quadro, painel, vagas (Bairro, salário único), candidatos (aprovar/recusar/entrevista/WhatsApp), página pública | ✅ 🧪 |
| Empresa — serviços | `#/divulgar`: vários serviços (até 3 sem Profissional), etiqueta "Empresa", botão "Editar divulgação" no cartão e na página | ✅ 🧪 |
| Autônomo | Perfil em 4 etapas com CPF, lista "Encontrar profissional", pedidos de serviço, "Oferecer serviço" pelo WhatsApp, botão "Editar meu perfil" no cartão | ✅ 🧪 |
| Pedidos de serviço | Publicar, "Meus pedidos" no topo, "Já resolvi", excluir | ✅ 🧪 |
| Planos e Pix | Teste 30 dias por CNPJ, Básico, Profissional, Autônomo Destaque, pedido com código, confirmação pelo admin, renovação soma dias, vagas pausadas ao vencer | ✅ 🧪 (fluxo Básico testado) |
| Pacote 3 vagas | R$ 24,90, 3 vagas em 90 dias (publicar ou renovar), "Publicar usando o pacote", botões "com o pacote", vagas restantes em Planos/painel | ✅ (PR #25) |
| Vaga avulsa e renovação | R$ 9,90 por vaga (30 dias no ar), "Continuar para o pagamento" no formulário, "Ver Pix"/"Renovar" em Minhas vagas, cartão em Planos, pedidos `VA-` em Pagamentos | ✅ (PR #24) |
| Promoção de lançamento | Data em Admin › Configurações; vagas grátis 30 dias no ar; teste começa depois; avisos no painel/Planos/formulário; vaga "Vencida" | ✅ (PR #23) |
| Destaques | Selo e topo da lista com revezamento | ✅ |
| Admin | Visão geral, usuários (busca, duplicados por telefone, documento, verificar CNPJ, dar plano, bloquear), pagamentos, moderação, configurações (chave Pix cadastrada) | ✅ 🧪 |
| Sugestões | `#/sugestao` (menu lateral + quadro em Minha conta), `#/admin/sugestoes` com filtros, anotação e WhatsApp | ✅ 🧪 |
| Privacidade (LGPD) | CPF protegido (`user_docs`), páginas `#/privacidade` e `#/termos`, aceite gravado no cadastro, Excluir minha conta | ✅ 🧪 |
| Cache | `?v=` em todos os arquivos (`tools/versao.py`) | ✅ |

## 3. Em desenvolvimento
**Novos modelos de cobrança para empresas** (aprovado pelo Rafael em 07/11/2026, em etapas). Motivo: em cidade
pequena, muitas empresas contratam pouco e o plano mensal assusta.
1. ✅ **Promoção de lançamento** (PR #23, mexe no banco; no ar, ainda sem data): data escolhida pelo admin; vagas grátis para todas as
   empresas, 30 dias no ar cada; teste de 30 dias começa depois da promoção para quem entrar nela.
2. ✅ **Vaga avulsa R$ 9,90** (30 dias no ar) e **Renovar vaga R$ 9,90** (+30 dias), com Pix e código `VA-XXXX`,
   confirmação em Admin › Pagamentos (PR #24, mexe no banco; no ar). Vaga nova sem plano fica "Aguardando pagamento".
3. ✅ **Pacote de 3 vagas R$ 24,90** (usar em até 90 dias, 1 Pix só, código `P3-XXXX`), cada vaga usada = 30 dias no
   ar para publicar ou renovar; textos de Planos e Termos atualizados (PR #25, mexe no banco).
4. [ ] Atualizar a **apresentação para empresas** (artifact) com promoção, vaga avulsa e pacote — fora do site.
Planos mensais continuam: Básico R$ 29,90 (5 vagas/mês) e Profissional R$ 49,90. Escadinha: 1–2 vagas → avulsa;
3+ → Básico; muitas ou serviços → Profissional.
✅ Decisão do Rafael (07/11/2026): as **empresas reais cadastradas antes do lançamento** (3 em 07/11) também começam o
teste de 30 dias **depois da promoção**. Isso é feito **no dia do lançamento**, depois de salvar a data da promoção
(ver checklist da seção 4), com este SQL (só tem efeito com a promoção valendo):
`update public.trial_registry set started_at = public.promo_ends() where public.promo_active() and cnpj in (select public.only_digits(cnpj) from public.companies where owner_id is not null and created_at < '2026-11-08');`

**LGPD concluída no site** em 03/11/2026 (testada pelo Rafael no site real 🧪):
1. ✅ CPF protegido na tabela `user_docs` (só o dono e o admin leem) — PR #18.
2. ✅ Páginas **Política de privacidade** (`#/privacidade`) e **Termos de uso** (`#/termos`), contato
   `buscaqui.arcos@gmail.com`, links no cadastro/rodapé/menu/Minha conta, aceite gravado no cadastro
   (`profiles.terms_version` e `terms_accepted_at`; contas antigas ficam vazias) — PR #19.
3. ✅ **"Excluir minha conta"** em Minha conta (`delete_my_account()`; ficam só o CNPJ em `trial_registry` e as
   sugestões sem nome) — PR #20.
4. Decisões do Rafael: site **só para maiores de 18 anos**; reembolso em até 7 dias mantido (CDC, art. 49).

## 4. Checklist ANTES DE PUBLICAR OFICIALMENTE (lembrar o Rafael)
> O Rafael pediu (03/11/2026) para ser **lembrado destes itens antes do lançamento oficial**. Sempre que ele falar
> em abrir o site ao público, divulgar, lançar ou cadastrar as empresas fundadoras, mostre esta lista e confira
> item por item. Também entra no lembrete semanal de segunda-feira.
- [ ] **CNPJ do responsável** nas páginas de Privacidade e Termos (o Rafael vai informar; hoje só aparece
      "BuscAqui" + e-mail). Mudança em `js/views/legal.js`.
- [ ] **Revisão dos textos** de Privacidade e Termos **por um advogado** (foram escritos pelo Claude a partir do
      código).
- [x] **E-mails do site pelo Gmail** (07/11/2026): o e-mail embutido do Supabase só entrega para a equipe do
      projeto, então "Esqueci minha senha" e a confirmação não chegavam aos usuários. Agora: Authentication → Emails →
      SMTP Settings com `smtp.gmail.com`, porta 465, usuário `buscaqui.arcos@gmail.com` e **senha de app** do Google
      (verificação em duas etapas ligada nessa conta). Limite do Gmail: ~500 e-mails/dia. Aviso do Supabase de que o
      Gmail é "pessoal" é esperado (pode cair no Spam às vezes; se crescer, trocar por Resend). Testado 🧪.
- [x] **Modelos de e-mail em português** (Confirm signup e Reset password), com botão verde. Testado 🧪.
- [x] **"Confirm email" ligado** (Authentication → Sign In / Providers → topo da página, "User Signups"). Cadastro
      novo testado do começo ao fim 🧪.
- [x] **Contas de teste apagadas** pelo botão Excluir minha conta (`+candidato`, `+profissional`, `+empresa`,
      `+teste2`) em 07/11/2026. Sobrou só `rafaelvbcosta+admin@gmail.com` e as contas de pessoas reais.
- [x] **Exemplos apagados** (`supabase/remover-exemplos.sql`, que agora também marca `exemplos_removidos` e impede
      o `setup.sql` de recriá-los) — PR #22.
- [ ] **Teste completo no site real antes da publicação** (pedido do Rafael em 07/11/2026), com contas novas
      `rafaelvbcosta+testeN@gmail.com`, apagadas no fim com "Excluir minha conta":
      cadastro com confirmação de e-mail e "Esqueci minha senha"; candidato (currículo, PDF, candidatar-se);
      empresa nova (CNPJ, publicar vaga no teste grátis, ver candidato); **vaga avulsa** (Pix com código VA-,
      confirmar em Admin › Pagamentos, vaga no ar, Renovar); **pacote 3 vagas** (comprar, confirmar, publicar e renovar
      com o pacote); **promoção** (salvar uma data, publicar grátis, apagar a data); autônomo (perfil com CPF, aparecer
      em "Encontrar profissional"); celular e computador.
- [ ] **No dia do lançamento:** (1) Admin › Configurações › preencher a data da promoção e Salvar; (2) pedir ao Claude
      para rodar o ajuste do teste das empresas antigas (SQL na seção 3) e conferir.
- [ ] Atualizar a **apresentação para empresas** com promoção, vaga avulsa (R$ 9,90) e pacote (R$ 24,90).
- [ ] Empresas fundadoras: ideia aprovada em 07/11/2026, mas o Rafael pediu para **não implementar ainda** (detalhes
      no `CLAUDE.md`, seção 9, item 6). Lembrar.
- [ ] Marketing: preencher sobrenome, WhatsApp e e-mail no último slide da apresentação; confirmar a oferta de
      "empresa fundadora" e as metas da estratégia (ver seção 7).
- [ ] Lembrar: Supabase gratuito **pausa após 7 dias sem uso** ("Restore project" no painel).

## 5. Bugs e pontos de atenção conhecidos
| # | Descrição | Onde | Gravidade |
|---|---|---|---|
| 2 | No celular, "Enviar sugestão" não está no menu de baixo (só no quadro de Minha conta, acessada pela foto no topo). Admin no celular também não tem "Sugestões" no menu de baixo (acessa pela Visão geral) | `js/app.js` | Baixa (decisão de espaço) |
| 4 | Sem aviso antes do plano vencer (o usuário só vê quando vence) | — | Média (ideia futura) |
| 5 | Datas de plano/teste exibidas na tela usam o relógio do aparelho; o banco é quem decide de verdade | `js/store.js` | Baixa |
| 6 | Filtros salvos antigos no navegador podem conter `mod` (modalidade, removida); é ignorado | `js/views/candidato.js` | Nenhuma |

Nenhum bug de funcionamento foi relatado pelo Rafael em aberto.
Corrigidos: PR #18 — CPF do autônomo podia ser lido por empresas que recebiam a candidatura dele (falha de
privacidade). PR #19 — menu lateral do autônomo tinha dois itens "Meu perfil"; o de dados da conta (`#/perfil`) virou
**"Minha conta"** para todos os perfis (os números dos bugs acima foram mantidos).

## 6. Decisões tomadas (e por quê)
- Site estático + Supabase gratuito: custo zero e manutenção simples para iniciante.
- Regras de negócio no **banco** (RLS/gatilhos) para não serem burladas pelo navegador.
- **Pix manual** primeiro (sem taxa); pagamento automático só com muitos clientes.
- Teste grátis **por CNPJ** e documentos **únicos e travados** para evitar cadastro duplicado.
- Plano vencido **pausa** em vez de apagar (cliente volta com tudo ao pagar).
- **Um cartão por empresa** na lista de serviços (lista não fica poluída; destaque justo).
- PDF do currículo **grátis** com propaganda (cobrar seria fácil de burlar e afastaria o público).
- **Sem avisos "em breve"** no site (não criar expectativa).
- Admin dentro do próprio site (opção B), conta separada.
- Domínio `buscaquiarcos.com.br` com `www` como principal.

## 7. Materiais de marketing (fora do repositório)
Criados em 02-03/11/2026 como artifacts no claude.ai (privados; o Rafael compartilha pelo menu Compartilhar):
- Apresentação para empresas (11 slides): https://claude.ai/artifact/Bz6cjopoDYW6ReMpp3Q6kS
- Estratégia de divulgação e aquisição: https://claude.ai/artifact/D2memvvBDcQV3QWpXa5h2o
- Folder para redes sociais (3 posts 1080×1350 + 1 story 1080×1920): https://claude.ai/artifact/RbPWun8ubP9F7G39D3jbdL
- Guia do projeto (documento + .docx): https://claude.ai/artifact/ShY6BobY5zzKoB9sBahxaV (desatualizado desde o PR #8)
- Vídeos MP4 de 15 s (painel LED 1920×1080 e celular 1080×1920), entregues como arquivos na conversa; os arquivos
  ficaram só no ambiente temporário do Claude (o Rafael tem as cópias baixadas). Usam empresas fictícias.

## 8. Documentação × código (conferência de 03/11/2026)
- `CLAUDE.md` antigo dizia que funcionalidades futuras "aparecem como Em breve" → **corrigido** (não aparecem mais).
- `CLAUDE.md` antigo não listava `js/views/sugestoes.js` nem `PROJECT_STATUS.md` → **corrigido**.
- `README.md` estava desatualizado (filtro por modalidade, lista "Em breve", sem Admin/planos/Pix/CNPJ/sugestões)
  → **atualizado no PR #17**.
- Guia do projeto (artifact) também desatualizado.

## 9. Informações não confirmadas
- ⚠️ Chamada **real** à BrasilAPI nunca foi testada pelo Claude (ambiente sem internet); o Rafael não relatou teste
  com CNPJ real.
- ⚠️ Fluxos de planos **Profissional** e **Autônomo Destaque**, recusa de pagamento, bloqueio de conta, vaga
  pausando ao vencer e limite de 5 vagas/mês foram testados só no banco local, não no site real.
- ⚠️ Se a tarefa agendada de lembrete semanal continua ativa depende da conta do Rafael (id
  `trig_01WH61tmoqyXCDSifKYYvdrx`; última verificação em 03/11/2026: ativa).
- ⚠️ Regras atuais do Google Play (teste fechado, valores) não foram conferidas.
- ⚠️ Metas, orçamento (~R$ 600) e oferta de "empresa fundadora" do material de marketing são **sugestões** ainda
  não aprovadas pelo Rafael.
- ⚠️ Os textos de privacidade e termos foram escritos pelo Claude a partir do código; **não** foram revisados por
  advogado.

## 10. Histórico de alterações (PRs, todos com merge feito pelo Rafael)
| PR | Data | Mudança | Banco? |
|---|---|---|---|
| — | 01/11 | MVP + configuração (Supabase, Pages) | Sim |
| #1 | 01/11 | "Meus pedidos de serviço" | Não |
| #2 | 02/11 | Nova logo e ícone | Não |
| #3–#5 | 02/11 | Página inicial focada em Arcos (sem selo, sem sombreado) | Não |
| #6 | 02/11 | Um só campo de salário | Não |
| #7 | 02/11 | Empresas divulgam serviços | Sim |
| #8 | 02/11 | Admin, planos, Pix manual, CNPJ/CPF, teste por CNPJ, vagas pausadas | Sim |
| #9 | 02/11 | Vários serviços por empresa, botões do dono, `?v=` | Sim |
| #10–#11 | 02/11 | Rodapé do PDF (propaganda, pé de cada página) | Não |
| #12 | 02/11 | Docs do domínio próprio | Não |
| #13 | 02/11 | Logo encaixada no quadro | Não |
| #14 | 02/11 | Bairro na vaga, sem Cidade (candidato), sem filtro de modalidade | Não |
| #15 | 02/11 | Remove todos os "em breve" e o sino | Não |
| #16 | 02/11 | Sugestões e feedbacks | Sim |
| #17 | 03/11 | Documentação (`CLAUDE.md`, `PROJECT_STATUS.md`, `README.md`) e kit de testes `tools/testes/` (telas + banco). Sem mudança no site | Não |
| #18 | 03/11 | LGPD 1: CPF vai para a tabela protegida `user_docs` (empresa não vê mais o CPF de quem se candidata); CPF antigo migrado automaticamente | **Sim** |
| #19 | 03/11 | LGPD 2: páginas Política de privacidade e Termos de uso, links (cadastro, rodapé, menu, Minha conta), registro do aceite no cadastro; "Meu perfil" (conta) vira "Minha conta" | **Sim** |
| #20 | 03/11 | LGPD 3: botão "Excluir minha conta" (função `delete_my_account`, apaga arquivos e dados) | **Sim** |
| #21 | 03/11 | Documentação: checklist "antes de publicar oficialmente" (lembrete pedido pelo Rafael) | Não |
| #22 | 07/11 | Lançamento: `setup.sql` não recria os exemplos depois de `remover-exemplos.sql`; docs das configurações feitas no painel (Gmail, modelos de e-mail, Confirm email) e contas de teste apagadas | **Sim** (rodar `remover-exemplos.sql`) |
| #23 | 07/11 | Promoção de lançamento (etapa 1 dos novos modelos): `jobs.paid_until`, `promo_ate`, teste depois da promoção, avisos; ideia das empresas fundadoras nos lembretes | **Sim** |
| #24 | 07/11 | Vaga avulsa R$ 9,90 e renovação (etapa 2): `subscriptions.job_id`, plano `vaga_avulsa`, status de vaga `aguardando`, telas e Termos | **Sim** |
| #25 | 07/11 | Pacote de 3 vagas R$ 24,90 (etapa 3): `pacote3`, `credits_left`, `use_package_credit`; `jobs_protect` sem security definer; restrição de planos igual em todo o setup | **Sim** |
| #26 | 07/11 | Documentação: plano do dia do lançamento (data da promoção + teste das empresas antigas depois da promoção) | Não |
| #27 | 08/11 | Página inicial: tira o "gratuito" geral (só é grátis para candidatos/autônomos; empresas têm 30 dias grátis) e o "modalidade" (filtro removido no #14); item "teste completo no site real" no checklist | Não |

## 11. Próximas etapas sugeridas
1. Configurações técnicas do lançamento **feitas** (07/11/2026). Faltam do checklist da seção 4: CNPJ nas páginas,
   revisão jurídica e itens de marketing (o Rafael decidiu lançar sem CNPJ por ora).
2. Corrigir os bugs da seção 5 que o Rafael quiser.
3. Cadastrar as 15–20 empresas fundadoras antes de divulgar (ver estratégia).
4. Ideias aprovadas (em ordem sugerida): PWA "instalar app" → relatórios do Profissional → estatísticas do
   autônomo → pagamento automático → Play Store.
