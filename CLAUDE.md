# BuscAqui — contexto para o Claude

## Sobre o projeto
BuscAqui ("Encontre. Conecte. Trabalhe.") é um app web responsivo (celular e computador) que conecta
candidatos a emprego, profissionais autônomos e empresas locais. Dono: Rafael (usuário GitHub `rafaelvbcosta`).

## Como falar com o Rafael
- Sempre em **português do Brasil**.
- Ele é **iniciante** em programação e no Claude: dê instruções **um passo de cada vez**, bem detalhadas
  (onde clicar, nome exato dos botões), e peça para ele responder "pronto" antes do próximo passo.
- Quando algo der errado, peça um print da tela.

## Tecnologia (tudo gratuito)
- Site estático (HTML + CSS + JavaScript em módulos ES), **sem etapa de build**.
- Hospedagem: **GitHub Pages** (branch `main`, pasta raiz) → **`https://www.buscaquiarcos.com.br/`** (domínio próprio,
  Registro.br; o endereço antigo `rafaelvbcosta.github.io/buscaqui/` redireciona). O arquivo `CNAME` na raiz guarda o domínio: não apagar.
- Backend: **Supabase** plano gratuito (Auth e-mail/senha, Postgres com RLS, Storage).
- Bibliotecas por CDN: `@supabase/supabase-js@2.49.4` (jsdelivr) e `html2pdf.js@0.10.1` (cdnjs, carregado só na tela de PDF).
- Rotas por hash (`#/vagas`, `#/painel`...), definidas em `js/app.js`.

## Arquivos
- `js/config.js` — URL e chave **publishable** do Supabase (o Rafael cola manualmente; nunca usar a secret/service_role).
- `js/app.js` — rotas, menus por perfil, inicialização.
- `js/store.js` — estado do usuário logado.
- `js/ui.js` — utilitários (escape de HTML, ícones SVG, toast, modal, máscaras, categorias).
- `js/views/` — `auth.js`, `candidato.js`, `servicos.js`, `empresa.js`, `perfil.js`.
- `supabase/setup.sql` — tabelas, trigger de perfil, RLS, buckets (`avatars`, `logos` públicos; `curriculos` privado) e dados de exemplo. Pode ser rodado de novo sem perder dados.
- `supabase/remover-exemplos.sql` — apaga os dados de exemplo.
- `js/views/admin.js` (área do admin), `js/views/planos.js` (planos e Pix), `tools/versao.py` (versão dos arquivos).

## Status (1º de novembro de 2026)
**Site no ar** em `https://www.buscaquiarcos.com.br/` (domínio próprio desde 02/11/2026). Configuração concluída:
`setup.sql` rodado, `js/config.js` preenchido (projeto `tjfzpobrqqoecktotlzy`), GitHub Pages ativo
(main / root) e Site URL do Supabase configurada.

Testado no site real com os três perfis (contas `rafaelvbcosta+candidato|profissional|empresa@gmail.com`):
cadastro, currículo, candidatura, perfil profissional, cadastro de empresa, publicação de vaga e
lista de candidatos — tudo funcionando.

Também testado: contratar serviço (encontrar profissional → WhatsApp; publicar pedido → profissional
"Oferecer serviço" → cliente "Já resolvi"). Melhoria já publicada (PR #1): cartão "Meus pedidos de serviço"
na tela Serviços e "Meus pedidos" no topo da tela Pedidos (para quem não é profissional).

Rafael está fazendo mais testes por conta própria. Ideia para depois: domínio próprio (ex.: `buscaqui.com.br`
no Registro.br, ~R$ 40/ano). Passos: verificar se está livre → DNS (CNAME `www` → `rafaelvbcosta.github.io`;
registros A da raiz para os IPs do GitHub Pages) → Settings → Pages → Custom domain + Enforce HTTPS →
atualizar Site URL no Supabase. O código não tem o endereço fixo, não precisa mudar nada nele.

Publicado depois (PRs #2 a #7, todos com merge feito pelo Rafael):
- Nova logo (`assets/logo.png` transparente) e ícone (`assets/icone.png`).
- Página inicial focada em Arcos: título "Oportunidades de vagas e serviços em Arcos." (sem selo, sem sombreado
  amarelo) e rodapé "Feito para Arcos - MG". O app é só para Arcos - MG, mas o cadastro não bloqueia outras cidades.
- Vaga com um só campo "Salário (R$)" (salvo igual em `salary_min` e `salary_max`).
- Empresas divulgam serviços: tela `#/divulgar`, `professionals.company_id` + `address`, categorias
  `CATEGORIAS_EMPRESA` em `js/ui.js`, etiqueta "Empresa" e filtro Todos/Autônomos/Empresas. O `setup.sql`
  novo já foi rodado no Supabase e testado no site real.

PR #8 (publicado): Admin + planos + Pix manual + controle contra fraude.
- Conta admin: `rafaelvbcosta+admin@gmail.com` (perfil candidato, `profiles.is_admin = true`, marcado no SQL Editor).
  Telas `#/admin`, `/admin/usuarios`, `/admin/pagamentos`, `/admin/moderacao`, `/admin/config` (chave Pix já cadastrada).
- Planos (preço vale o do banco, `plan_price`): Básico R$ 29,90 (5 vagas/mês do calendário, até 3 serviços, selo
  Destaque), Profissional R$ 49,90 (ilimitado, topo da lista), Autônomo Destaque R$ 14,90 (topo + selo).
  Empresa: 30 dias grátis uma vez por CNPJ (`trial_registry`), com vagas ilimitadas e até 3 serviços.
  Pix manual: usuário pede (código ex. BA-7F3K) → admin confirma → 30 dias (renovação soma).
  Vencido: vagas e divulgação da empresa ficam pausadas (RLS `company_active`), nada é apagado.
- CNPJ obrigatório/único/travado (consulta BrasilAPI no cadastro), CPF obrigatório/único/travado para autônomo.
- Testado no site real: CNPJ de teste via Admin › Documento, pedido do Básico, confirmação e plano ativo.

Publicado depois do PR #8 (PRs #9 a #16): vários serviços por empresa (até 3 no teste/Básico), botões de editar
para o dono, rodapé do PDF no pé de cada página A4, logo encaixada no quadro, Bairro na vaga, sem Cidade no
candidato, sem filtro de modalidade, sem nenhum aviso de "em breve" (nem o sino), e **Sugestões**: tabela
`feedbacks` (usuário só envia, máx. 5/dia), tela `#/sugestao` (menu lateral + Meu perfil) e `#/admin/sugestoes`.

Fluxo combinado: o Claude mostra prévia (prints) → Rafael aprova → PR → Rafael faz o merge. Mudança no banco:
rodar o `setup.sql` da branch ANTES do merge. Testes do banco: Postgres 16 local com stubs de `auth`/`storage`.

**Versão dos arquivos (cache do navegador):** todos os imports de `js/` e o `index.html` levam `?v=AAAAMMDDHHMM`.
Antes de cada publicação, rode `python3 tools/versao.py` (troca a versão em todos ao mesmo tempo). Todos os
arquivos precisam ter a MESMA versão, senão o navegador carrega o `store.js` duas vezes (estado duplicado).

Pendências antes de abrir ao público:
1. Religar "Confirm email" (Authentication → Sign In / Providers → Email).
2. Rodar `supabase/remover-exemplos.sql` e apagar as contas/vaga de teste, se quiser.
3. Lembrar que o Supabase gratuito pausa após 7 dias sem uso.

## Ideias aprovadas para depois (LEMBRAR o Rafael de vez em quando, no começo das conversas)
O Rafael pediu para ser lembrado de forma esporádica destas melhorias (aprovadas em 02/11/2026):
1. **Relatórios do plano Profissional** (gráficos de visualizações e candidatos por vaga).
2. **Estatísticas do autônomo** (quantas pessoas viram o perfil e clicaram no WhatsApp).
3. ~~Domínio próprio~~ **FEITO em 02/11/2026:** `www.buscaquiarcos.com.br` (DNS no Registro.br: CNAME `www` →
   `rafaelvbcosta.github.io` + 4 registros A 185.199.108-111.153; Custom domain no GitHub Pages; Site URL do Supabase).
4. **Pagamento automático** (Mercado Pago ou similar) no lugar do Pix manual, quando houver muitos clientes.
5. **Aplicativo Android na Play Store** (aprovado como ideia em 03/11/2026). Plano: (1) PWA primeiro — manifest +
   service worker + botão "Instalar app", grátis; (2) depois do lançamento, publicar na Play Store como TWA
   (Bubblewrap/PWABuilder) usando o próprio site; conta Google Play ~US$ 25 (taxa única), exige página de
   política de privacidade (também útil pela LGPD) e, para conta pessoal nova, teste fechado antes de publicar
   (conferir regra atual). iPhone (App Store, US$ 99/ano) fica para depois. App nativo do zero: não recomendado.
Em discussão: monetizar o currículo em PDF (R$ 6,90). Opções apresentadas: PDF grátis com rodapé de
propaganda; "Currículo em Destaque" pago; ou PDF pago só depois do pagamento automático (o PDF é gerado no
navegador e pode ser burlado pelo "Imprimir").

## Fora do MVP (próximas versões, aparecem como "Em breve")
Chat, notificações push, avaliações, login social, vídeo de apresentação, relatórios avançados (plano
Profissional) e estatísticas do autônomo, pagamento automático (Mercado Pago), IA e cursos.

## Regras ao alterar o código
- Manter sem build e sem frameworks; textos da interface em português.
- Sempre escapar dados de usuário com `esc()` ao montar HTML.
- Qualquer mudança no banco: atualizar `supabase/setup.sql` de forma reexecutável (`if not exists`, `drop policy if exists`).
- Plano gratuito do Supabase: 500 MB de banco, 1 GB de arquivos e pausa após 7 dias sem uso.
