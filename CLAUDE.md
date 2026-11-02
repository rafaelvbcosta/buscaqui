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
- Hospedagem: **GitHub Pages** (branch `main`, pasta raiz) → `https://rafaelvbcosta.github.io/buscaqui/`
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

## Status (1º de novembro de 2026)
**Site no ar** em `https://rafaelvbcosta.github.io/buscaqui/`. Configuração concluída:
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

Fluxo combinado: o Claude mostra prévia (prints) → Rafael aprova → PR → Rafael faz o merge. Mudança no banco:
rodar o `setup.sql` da branch ANTES do merge.

Pendências antes de abrir ao público:
1. Religar "Confirm email" (Authentication → Sign In / Providers → Email).
2. Rodar `supabase/remover-exemplos.sql` e apagar as contas/vaga de teste, se quiser.
3. Lembrar que o Supabase gratuito pausa após 7 dias sem uso.

## Fora do MVP (próximas versões, aparecem como "Em breve")
Chat, notificações push, avaliações, login social, vídeo de apresentação, planos pagos
(Básico R$ 49,90 / Profissional R$ 99,90), relatórios avançados, IA, cursos e painel administrativo.

## Regras ao alterar o código
- Manter sem build e sem frameworks; textos da interface em português.
- Sempre escapar dados de usuário com `esc()` ao montar HTML.
- Qualquer mudança no banco: atualizar `supabase/setup.sql` de forma reexecutável (`if not exists`, `drop policy if exists`).
- Plano gratuito do Supabase: 500 MB de banco, 1 GB de arquivos e pausa após 7 dias sem uso.
