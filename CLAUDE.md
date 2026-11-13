# BuscAqui — contexto para o Claude

> Leia também **`PROJECT_STATUS.md`** (o que está pronto, pendências, bugs e próximos passos).
> Atualizado em 03/11/2026, conferido contra o código da branch `main` (commit `db70b17`, PR #16).

## 1. Objetivo e escopo
BuscAqui ("Encontre. Conecte. Trabalhe.") é um site responsivo (celular e computador) **exclusivo para Arcos - MG**
que conecta:
- **Candidatos** a emprego — foco principal: trabalhadores com pouca instrução formal (ajudante, serviços gerais,
  limpeza, atendimento, construção, cozinha) e as **empresas** que precisam dessa mão de obra;
- **Profissionais autônomos** e **empresas que prestam serviço** a quem precisa contratar (todas as classes).

Dono: **Rafael** (GitHub `rafaelvbcosta`). Site: **https://www.buscaquiarcos.com.br/**. Ainda **não foi aberto ao
público** (fase de testes; ver pendências em `PROJECT_STATUS.md`).

## 2. Como falar com o Rafael
- Sempre em **português do Brasil**.
- Ele é **iniciante**: instruções **um passo de cada vez**, bem detalhadas (onde clicar, nome exato dos botões), e
  peça "pronto" antes do próximo passo. Quando algo der errado, peça **print da tela**.
- **Fluxo combinado para toda mudança:** o Claude faz a mudança na branch de trabalho → mostra **prévia em imagens**
  (prints gerados no navegador de teste) → Rafael responde "aprovado" → Claude abre **Pull Request** → **Rafael faz
  o merge** no GitHub (Claude não faz merge). Se o banco mudou: Rafael roda o `supabase/setup.sql` **da branch** no
  SQL Editor do Supabase **ANTES** do merge.
- **Toda mudança atualiza também o `PROJECT_STATUS.md`** no mesmo PR (seção "Histórico de alterações" com data,
  PR e se mexeu no banco; funcionalidades, pendências e bugs quando mudarem). Se uma regra, rota, tabela ou
  padrão mudar, atualize também este `CLAUDE.md`. Documentação desatualizada é pior que nenhuma.
- **Antes de abrir o PR**, rode os testes de `tools/testes/` (seção 7) e, se criou tela ou regra nova, acrescente
  o teste correspondente.
- Ele prefere **não criar expectativa** nos clientes: nada de avisos "em breve" no site.
- **Antes do lançamento oficial**, lembre o Rafael do checklist da seção 4 do `PROJECT_STATUS.md` (o que ainda falta:
  CNPJ nas páginas legais, revisão por advogado, marketing). Sempre que ele falar em abrir ao
  público, divulgar ou lançar, mostre a lista antes de qualquer outra coisa.
- Pediu **lembretes semanais** das ideias aprovadas (seção 9) e do checklist do lançamento. Existe uma tarefa agendada (segunda, 18h37, horário de
  Brasília) que envia o lembrete na sessão do Claude.

## 3. Tecnologias (tudo gratuito, exceto domínio)
- Site estático: **HTML + CSS + JavaScript em módulos ES**, **sem build, sem frameworks, sem npm**.
- Hospedagem: **GitHub Pages**, branch `main`, pasta raiz. Domínio próprio no **Registro.br**
  (`buscaquiarcos.com.br`, ~R$ 40/ano). Arquivo **`CNAME`** na raiz guarda o domínio — **não apagar**. `.nojekyll`
  também deve ficar.
- Backend: **Supabase** plano gratuito, projeto `buscaqui` (região São Paulo, ref `tjfzpobrqqoecktotlzy`):
  Auth e-mail/senha, Postgres com RLS, Storage.
- CDN: `@supabase/supabase-js@2.49.4` (jsdelivr, `+esm`) e `html2pdf.js@0.10.1` (cdnjs, carregado só ao baixar PDF).
- API externa: **BrasilAPI** (`https://brasilapi.com.br/api/cnpj/v1/<cnpj>`) para conferir CNPJ (existe, situação,
  município). Se falhar, o cadastro **não trava**.
- Fonte da interface: Plus Jakarta Sans (Google Fonts). Cores: verde `#0EAC40`, verde-escuro `#003515`,
  amarelo `#FDB904` (`:root` em `css/styles.css`).

## 4. Arquitetura e arquivos
```
index.html               página única; carrega css/styles.css e js/app.js (com ?v=)
CNAME, .nojekyll          domínio do GitHub Pages / desliga o Jekyll
assets/logo.png, icone.png  logo (transparente) e ícone
css/styles.css           todo o visual
js/config.js             SUPABASE_URL e SUPABASE_KEY (publishable). NUNCA a secret/service_role
js/supabase.js           cria o cliente; `configured` = config preenchida
js/app.js                rotas (hash), menus por perfil (NAV), moldura, tela de conta bloqueada, start()
js/store.js              estado do usuário: profile, company, professional, resume, favorites, applied,
                         subs (assinaturas), trialEnds; helpers role(), isAdmin(), activePlan(),
                         pendingSub(), trialDaysLeft(), companyActive(), homeFor()
js/ui.js                 utilitários: esc(), ícones SVG (ICON), toast, modal, confirmBox, errMsg (traduz erros
                         do banco), máscaras, validCPF/validCNPJ, checkCNPJ (BrasilAPI), pixCode, avatar,
                         uploadFile, constantes (CATEGORIAS_*, PLANOS, LIMITE_SERVICOS=3, DIAS_TESTE_EMPRESA=30,
                         CONTATO_EMAIL, TERMOS_VERSAO)
js/views/auth.js         página inicial, entrar, cadastro (escolha de perfil), nova senha
js/views/candidato.js    vagas (filtros: busca, categoria, salário, favoritas), detalhe da vaga, candidaturas,
                         Currículo fácil, prévia e PDF (rodapé desenhado em cada página A4)
js/views/servicos.js     Serviços (hub), Encontrar profissional (filtro Todos/Autônomos/Empresas, destaques),
                         detalhe do autônomo, Pedidos de serviço, Publicar pedido, perfil do autônomo (4 etapas)
js/views/empresa.js      painel, minhas vagas, formulário de vaga, candidatos, cadastro da empresa (CNPJ),
                         página pública da empresa, Divulgar serviços (#/divulgar)
js/views/perfil.js       Minha conta (foto, nome, telefone; cidade só p/ autônomo/empresa), trocar senha, quadro
                         Privacidade (links, e-mail de contato, Excluir minha conta), sair
js/views/legal.js        Política de privacidade (#/privacidade) e Termos de uso (#/termos)
js/views/planos.js       Planos (empresa e autônomo) + pedido com chave Pix e código
js/views/admin.js        Admin: visão geral, usuários, pagamentos, moderação, configurações (chave Pix)
js/views/sugestoes.js    Enviar sugestão (#/sugestao) e lista do admin (#/admin/sugestoes)
supabase/setup.sql       banco inteiro (tabelas, gatilhos, RLS, buckets, exemplos). REEXECUTÁVEL
supabase/remover-exemplos.sql  apaga empresas/vagas/profissionais de exemplo (owner_id/user_id nulos)
supabase/emails/         modelos dos e-mails de login (colar no painel do Supabase)
tools/versao.py          troca o ?v=AAAAMMDDHHMM de TODOS os imports (cache do navegador)
```

**Rotas** (`js/app.js`): públicas `#/`, `#/entrar`, `#/cadastro`; logado ou não (`LEGAL`): `#/privacidade`,
`#/termos`. Logado: `#/vagas`, `#/vaga/:id`,
`#/candidaturas`, `#/curriculo`, `#/previa`, `#/servicos`, `#/profissionais`, `#/profissional/:id`, `#/pedidos`,
`#/pedido-novo`, `#/meu-servico`, `#/perfil`, `#/nova-senha`, `#/sugestao`, `#/empresa/:id`;
só empresa: `#/painel`, `#/minhas-vagas`, `#/vaga-form[/:id]`, `#/candidatos/:jobId`, `#/empresa`, `#/divulgar`;
empresa e autônomo: `#/planos`; só admin: `#/admin`, `#/admin/usuarios`, `#/admin/pagamentos`,
`#/admin/moderacao`, `#/admin/config`, `#/admin/sugestoes`.

**Menus** (`NAV`, máx. **5 itens** — o menu de baixo do celular não comporta mais): candidato (Vagas, Serviços,
Candidaturas, Currículo, Prévia/PDF); empresa (Painel, Minhas vagas, Empresa, Planos, Serviços); profissional
(Pedidos, Serviços, Meu perfil→`/meu-servico`, Vagas, Candidaturas); admin (Visão geral, Usuários, Pagamentos,
Moderação, Configurações). Menu lateral (computador) tem ainda "Enviar sugestão" (admin: "Sugestões"), "Minha conta"
(`#/perfil`), "Sair" e, no pé, links Privacidade · Termos. "Meu perfil" é só o perfil profissional do autônomo.

**Banco** (`supabase/setup.sql`): tabelas `profiles`, `resumes`, `companies`, `jobs`, `applications`, `favorites`,
`professionals` (autônomos E divulgação de empresas via `company_id`), `service_requests`, `subscriptions`,
`app_settings` (`pix_chave`, `pix_nome`, `promo_ate`, `exemplos_removidos`), `trial_registry`, `feedbacks`, `user_docs` (CPF do autônomo; só o dono e o
admin leem — **nunca** guardar CPF em `profiles`, que outras pessoas podem ler). Buckets: `avatars` e `logos` (públicos),
`curriculos` (privado). Gatilho `handle_new_user` cria o profile no cadastro (role vem do metadata; nunca admin).
Algumas funções são redefinidas mais abaixo no arquivo (`protect_profile_flags`, `company_can_publish`,
`professionals_check_plan`, `jobs_check_plan`, `jobs_protect`, `companies_guard`, `handle_new_user`, `plan_price`,
`subscriptions_guard`, `active_plan`, `featured_users`, `confirm_subscription`) e a política `jobs_select`. Restrições
`check` redefinidas (ex.: `subscriptions_plan_check`) precisam ter **os mesmos valores em todas as versões** do arquivo,
senão rodar o setup de novo falha quando já há dados (o teste do banco roda o setup outra vez no fim, com dados):
**vale a última definição**. A coluna `profiles.cpf` ainda existe mas fica sempre
vazia (o gatilho `protect_profile_flags` apaga); o site lê o CPF de `user_docs` e coloca em `state.profile.cpf`.

## 5. Regras de negócio (todas conferidas no código/banco)
- **Perfis:** `candidato`, `profissional` (autônomo), `empresa`; **admin** = `profiles.is_admin = true`, marcado
  **só pelo SQL Editor** (conta `rafaelvbcosta+admin@gmail.com`, perfil candidato). Admin vê/modera tudo (RLS).
- **Conta bloqueada** (`profiles.blocked`, só o admin muda): vê a tela "Conta bloqueada"; o conteúdo dela continua
  no ar até ser removido na Moderação.
- **Documentos:** empresa precisa de **CNPJ válido e único**; autônomo precisa de **CPF válido e único** para
  divulgar. Depois de salvo, **só o admin troca** (Admin › Usuários › Documento). O CPF fica em `user_docs` (RLS: dono lê e
  grava o próprio uma vez; só o admin altera/apaga). No cadastro da empresa o site
  consulta a BrasilAPI: barra CNPJ inexistente ou não ATIVO; se não for de Arcos, só avisa.
- **Teste grátis da empresa:** **30 dias, uma vez por CNPJ para sempre** (`trial_registry`, mesmo se a empresa for
  apagada). Durante o teste: vagas ilimitadas e até 3 serviços.
- **Planos** (preço sempre do banco, `plan_price`; usuário só PEDE ou cancela pedido pendente):
  - Básico **R$ 29,90/mês** (empresa): até **5 vagas por mês do calendário** (fuso de São Paulo), até **3 serviços**,
    selo Destaque.
  - Profissional **R$ 49,90/mês** (empresa): vagas e serviços ilimitados, **topo** da lista de serviços.
  - Autônomo Destaque **R$ 14,90/mês** (autônomo): topo da lista + selo Destaque.
  - **Vaga avulsa R$ 9,90** (empresa, sem mensalidade, desde a etapa 2): UMA vaga no ar por 30 dias; **renovar** a
    mesma vaga custa R$ 9,90 e **soma** mais 30 dias. É um pedido em `subscriptions` com `plan = 'vaga_avulsa'` e
    `job_id` (código `VA-XXXX`, mesmo Pix e Admin › Pagamentos). **Não é plano**: `active_plan`, `featured_users` e
    `activePlan()` ignoram. Vaga nova sem plano é gravada com `status = 'aguardando'` (ninguém vê; a empresa não
    consegue colocar no ar sozinha — `PAGAMENTO_PENDENTE`); ao confirmar, `confirm_subscription` põe `paid_until`
    e status `aberta`. Um pedido pendente por vaga (`subscriptions_job_pend_uniq`). Telas: formulário de vaga
    ("Continuar para o pagamento"), Minhas vagas ("Ver Pix", "Cancelar pedido", "Renovar"/"Colocar no ar por R$ 9,90"),
    cartão "Vaga avulsa" em Planos. No Básico, ao passar de 5 vagas no mês, o site oferece a avulsa.
  - **Pacote 3 vagas R$ 24,90** (empresa, etapa 3): pedido `plan = 'pacote3'` (código `P3-XXXX`); ao confirmar, ganha
    `credits_left = 3` válidos por **90 dias** (`ends_at`). Cada vaga usada = 30 dias no ar, para **publicar** (vaga
    gravada como `aguardando` e liberada na hora) ou **renovar**, pela função `use_package_credit(jid)` (erro
    `SEM_CREDITO`). Não é plano. Só essa função desconta vagas (marca de transação `buscaqui.uso_pacote` no
    `subscriptions_guard`). `jobs_protect` **não** é security definer de propósito: barra a edição direta
    (`current_user = 'authenticated'`) e deixa passar o próprio banco (confirmar Pix, usar pacote). Telas:
    `packageCredits()` (`js/store.js`), aviso no formulário ("Publicar usando o pacote"), botões "… com o pacote
    (X restantes)" em Minhas vagas, cartão "Pacote 3 vagas" e aviso de vagas restantes em Planos e no painel.
  - Pagamento por **Pix manual**: usuário pede → aparece chave Pix + **código do pedido** (ex. `BA-7F3K`, prefixo
    BA/PR/AD/VA/P3 + 4 primeiros caracteres do id) → admin confere no banco e clica **Confirmar pagamento** → plano ativo
    por **30 dias** (renovação **soma** os dias). Admin também pode **Dar plano** (cortesia).
  - Destaques: Profissional e Autônomo Destaque aparecem no topo, **revezando a ordem** a cada visita; Básico só
    ganha o selo.
- **Plano/teste vencido (empresa):** vagas e divulgação ficam **pausadas** (escondidas do público via RLS
  `company_active`), **nada é apagado**, voltam sozinhas ao confirmar o pagamento. Sem plano a empresa não publica
  vaga nova nem começa divulgação (`PLANO_NECESSARIO`).
- **Prazo de cada vaga (`jobs.paid_until`):** a vaga aparece se estiver aberta e (empresa em dia **ou**
  `paid_until > now()`). Só o banco grava esse prazo (gatilhos `jobs_check_plan` no insert e `jobs_protect` no
  update; a empresa não consegue mudar). No Básico, vagas com `paid_until` não contam no limite de 5 por mês.
  Tela: `jobLive(j)` em `js/store.js`; vaga fora do prazo e sem plano aparece como "Vencida".
- **Promoção de lançamento** (desde 07/11/2026, etapa 1 dos novos modelos de cobrança): o admin escolhe o último dia
  em Admin › Configurações (`app_settings.promo_ate`, AAAA-MM-DD, fim do dia em Brasília; vazio = sem promoção e
  nada aparece no site). Enquanto vale (`promo_active()`), **qualquer empresa publica vagas grátis** e cada vaga fica
  **30 dias no ar** (`paid_until = publicação + 30 dias`). Empresa **cadastrada durante a promoção** começa o teste
  de 30 dias só quando ela termina (`trial_registry.started_at = promo_ends()`). Avisos: painel, Planos e formulário
  de vaga. Vaga avulsa e renovação = etapa 2; pacote de 3 vagas = etapa 3 (todas feitas, também usando `paid_until`).
  **No dia do lançamento**, as empresas cadastradas antes dele também começam o teste depois da promoção (decisão do
  Rafael): rodar o SQL da seção 3 do `PROJECT_STATUS.md` logo depois que ele salvar a data.
- **Serviços de empresa:** um cartão por empresa, vários serviços (categoria + descrição), limite 3 sem o
  Profissional (`LIMITE_SERVICOS`, conferido no banco). Nome/logo/telefone/endereço vêm do cadastro da empresa.
- **Vaga:** salário em **um campo** (gravado igual em `salary_min` e `salary_max`; vazio = "Salário a combinar");
  campo **Bairro** (coluna `location`; vazio mostra "Arcos"); modalidade existe no formulário mas não no filtro.
- **Candidato:** sem campo Cidade (currículo mostra "Arcos - MG" se vazio); PDF grátis com rodapé de propaganda
  em cada página A4 ("Página X de Y" quando há mais de uma).
- **Sugestões:** usuário só envia (tipo + 5 a 1000 caracteres), **máx. 5 por dia**; não vê o histórico. Admin lê,
  anota e marca nova/lida/resolvida.
- **Cidade:** o site é para Arcos, mas o cadastro **não bloqueia** outras cidades.
- **Idade:** só **maiores de 18 anos** (declarado no aceite do cadastro; não há conferência de data de nascimento).

## 6. Padrões de código (obrigatórios)
- Sem build, sem frameworks; textos da interface em **português**.
- Sempre escapar dado de usuário com **`esc()`** ao montar HTML.
- Toda mudança no banco vai para **`supabase/setup.sql` de forma reexecutável** (`if not exists`,
  `create or replace`, `drop policy if exists`, `drop trigger if exists`, limpeza antes de índices únicos). Regras de
  negócio importantes são **garantidas no banco** (gatilhos/RLS), não só na tela.
- Erros do banco com prefixo (`PLANO_NECESSARIO:`, `LIMITE_VAGAS:`, `LIMITE_SERVICOS:`, `LIMITE_SUGESTOES:`,
  `CNPJ_INVALIDO:`, `CPF_INVALIDO:`, `CPF_NECESSARIO:`, `PAGAMENTO_PENDENTE:`, `SEM_CREDITO:`) são traduzidos em `errMsg()` (`js/ui.js`).
- **Versão dos arquivos:** todo import local e o `index.html` levam `?v=AAAAMMDDHHMM`. **Antes de cada publicação
  rode `python3 tools/versao.py`** (troca todos ao mesmo tempo). Todos precisam da MESMA versão, senão o navegador
  carrega `store.js` duas vezes (estado duplicado). Arquivo JS novo: importe com `?v=` e rode o script.
- Menus com no máximo 5 itens; atalhos novos entram dentro das telas.
- Branch de trabalho: `claude/sleepy-thompson-oqj14v`. Commits em português. Nunca usar a chave secret.

## 7. Testes (pasta `tools/testes/`, detalhes no `README.md` dela)
Nenhum teste usa o Supabase de verdade nem a internet. Rode na raiz do repositório:
- **Sintaxe JS:** `for f in js/*.js js/views/*.js; do node --check "$f"; done`
- **Telas:** `node tools/testes/telas.js /tmp/prints` — Playwright abre 46 telas (celular e computador, todos os
  perfis e o admin) com o `supabase-falso.js` (dados fictícios), salva prints e falha se houver erro de JavaScript.
  Olhe os prints principais antes de mostrar a prévia ao Rafael. Tela nova → acrescente em `TELAS`.
- **Banco:** `bash tools/testes/banco/testar-banco.sh` — Postgres 16 temporário com `stubs.sql` (imita `auth` e
  `storage`), roda o `setup.sql` da `main` e o atual DUAS vezes (reexecutável) e os testes de `seguranca.sql`
  (mais de 30 regras). Regra nova → acrescente um teste.
- **PDF do currículo:** não está automatizado. Para testar: baixar `html2pdf.js@0.10.1` (`npm pack`), servir no
  lugar do cdnjs, clicar em "Baixar PDF" pelo Playwright e converter as páginas com `pdftoppm`.
- O ambiente do Claude **não acessa** o site real, o Supabase real nem a BrasilAPI (o proxy bloqueia). Quem testa
  no site real é o Rafael.

## 8. Dados de teste no site real
Desde 07/11/2026 (preparação do lançamento) o site real tem **só contas de pessoas reais + a conta Admin**
(`rafaelvbcosta+admin@gmail.com`). As contas de teste antigas e os exemplos foram apagados. Para testar no site real,
crie uma conta nova (ex.: `rafaelvbcosta+testeN@gmail.com`, o e-mail chega no Gmail do Rafael) e apague-a depois
com **Excluir minha conta**. **Nunca** mexa nas contas de outras pessoas sem o Rafael pedir.
Os exemplos do `setup.sql` (Padaria Pão Dourado etc., `owner_id`/`user_id` nulos) só são criados enquanto não existir
`exemplos_removidos` em `app_settings` (gravado pelo `remover-exemplos.sql`) — rodar o `setup.sql` não os traz de volta.

**E-mails (Auth):** saem pelo **Gmail `buscaqui.arcos@gmail.com`** (SMTP próprio no Supabase, senha de app do Google;
~500/dia). O e-mail embutido do Supabase só entrega para a equipe do projeto — nunca volte para ele. **Confirm email
está ligado.** Modelos "Confirm signup" e "Reset password" em português (Authentication → Emails → Templates); a
cópia oficial fica em `supabase/emails/` (mudou o texto → atualize o arquivo e peça ao Rafael para colar no painel).
Os e-mails podem cair no Spam (remetente Gmail + link do Supabase + domínio novo): as telas avisam para olhar o Spam.
Solução completa pendente no checklist (domínio próprio no e-mail).

## 8.1 LGPD
Contato de privacidade: **buscaqui.arcos@gmail.com**. Etapas e situação na seção 3 do `PROJECT_STATUS.md`.
Documento pessoal (CPF) nunca vai em tabela que outros usuários leem (`profiles` é lida por empresas e no admin).
Textos em `js/views/legal.js`. **Se o site passar a guardar um dado novo, compartilhar com outro serviço ou mudar
quem vê o quê, atualize a Política de privacidade no mesmo PR** e troque `TERMOS_VERSAO` (`js/ui.js`) quando a
mudança for importante. O cadastro grava `profiles.terms_version` e `terms_accepted_at` (gatilho
`handle_new_user`, versão final no fim do `setup.sql`; o usuário não consegue alterar — `protect_profile_flags`).
**Excluir minha conta:** o site apaga os arquivos da pasta `<id do usuário>/` nos buckets e chama a função
`delete_my_account()` (apaga `auth.users`; o resto sai por `on delete cascade`). **Tabela nova ligada a um usuário
precisa de `on delete cascade`** (ou `set null`, se o dado deve ficar sem o nome) e, se guardar arquivo, na pasta do
usuário. Ficam de propósito: `trial_registry` e `feedbacks` (sem `user_id`). Admin não se exclui pelo site.

## 9. Ideias aprovadas para depois (LEMBRAR o Rafael de vez em quando)
1. **Relatórios do plano Profissional** (gráficos de visualizações e candidatos por vaga).
2. **Estatísticas do autônomo** (quantas pessoas viram o perfil e clicaram no WhatsApp).
3. ~~Domínio próprio~~ **FEITO em 02/11/2026** (`www.buscaquiarcos.com.br`; DNS no Registro.br: CNAME `www` →
   `rafaelvbcosta.github.io` + 4 registros A `185.199.108-111.153`; Custom domain + Enforce HTTPS no GitHub Pages;
   Site URL do Supabase = `https://www.buscaquiarcos.com.br/`, Redirect URL extra = endereço antigo).
4. **Pagamento automático** (Mercado Pago ou similar) no lugar do Pix manual, quando houver muitos clientes.
5. **Aplicativo Android na Play Store** (03/11/2026): primeiro **PWA** (manifest + service worker + "Instalar app",
   grátis); depois **TWA** na Play Store (Bubblewrap/PWABuilder), conta Google ~US$ 25 (taxa única), exige página de
   **política de privacidade** (também útil pela LGPD) e teste fechado para conta pessoal nova (conferir regra
   atual). iPhone (US$ 99/ano) depois. App nativo do zero: não recomendado.
   **13/11/2026:** o Rafael pediu para **avaliar a publicação na Play Store** para facilitar o acesso como "app",
   mesmo sendo a mesma plataforma web (é exatamente o TWA: o site empacotado como aplicativo, sem reescrever nada;
   atualizações do site chegam sozinhas no app). Lembrar nos lembretes semanais.
6. **Empresas fundadoras** (aprovada a ideia em 07/11/2026, **ainda não implementar**): primeiras 20 empresas que
   entrarem até ~30 dias após o lançamento ganham 30 dias de teste + 30 dias do plano Profissional de cortesia
   (botão "Dar plano" do Admin, sem programar), post semanal "Empresa parceira" nas redes, ajuda presencial para
   publicar a 1ª vaga e logo na apresentação; em troca, publicam ao menos 1 vaga e autorizam logo + depoimento.

7. **Notificações de candidaturas** (aprovada em 10/11/2026, **implementar depois**; decisões do Rafael):
   - **Aviso no site** para a empresa: número de candidatos novos no menu (Minhas vagas) e no painel; zera quando ela
     abre a lista de candidatos da vaga.
   - **E-mail para a empresa**: no máximo **1 por empresa a cada hora**, agrupado ("2 candidatos novos na vaga X"),
     **sem dados do candidato** (só nome da vaga, quantidade e botão para o site).
   - **E-mail para o candidato** quando a empresa muda o status da candidatura (ex.: chamado para entrevista),
     também agrupado e sem detalhes sensíveis. Decidir com o Rafael o texto para "recusado".
   - Opção **"Receber e-mails de avisos"** em Minha conta (ligada por padrão; dá para desligar).
   - Envio pelo Gmail `buscaqui.arcos@gmail.com` (grátis, ~500/dia, junto com os e-mails de login). Como fazer:
     `pg_cron` a cada poucos minutos + `pg_net` chamando uma **Edge Function** que envia por SMTP
     (`smtp.gmail.com:465`); a **senha de app** do Gmail fica como segredo da Edge Function (o Rafael cola no painel
     do Supabase; **nunca** pela conversa nem no repositório). Colunas de controle (ex.: quando cada candidatura/status
     já foi avisado) e preferência no perfil; tudo testado no banco local (o ambiente do Claude não envia e-mail real).
   - Atualizar a **Política de privacidade** (envio de e-mails pelo Google/Gmail e como desligar) e `TERMOS_VERSAO`.
   - Fora por enquanto: notificação no celular (depende do PWA, ideia 5) e WhatsApp automático (API paga).

Também conversadas e **fora por enquanto**: chat, notificações no celular/WhatsApp (ver ideia 7), avaliações, login com Google, vídeo de apresentação,
IA, cursos. Currículo em PDF **continua grátis** (decisão: rodapé de propaganda em vez de cobrar R$ 6,90).
