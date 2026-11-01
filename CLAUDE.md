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
MVP pronto e enviado. Testado com servidor simulado (sem erros). **Configuração ainda pendente**, nesta ordem:
1. Rodar `supabase/setup.sql` no SQL Editor do Supabase.
2. Colar Project URL e Publishable key em `js/config.js` (pela edição do GitHub).
3. Ativar GitHub Pages (Settings → Pages → Deploy from a branch → main / root).
4. No Supabase, Authentication → URL Configuration → Site URL = endereço do GitHub Pages.
5. Testar o site real com os três perfis (candidato, profissional, empresa).

Já feito no Supabase: projeto `buscaqui` criado (região São Paulo); "Confirm email" **desligado** para testes
(religar antes de abrir ao público).

## Fora do MVP (próximas versões, aparecem como "Em breve")
Chat, notificações push, avaliações, login social, vídeo de apresentação, planos pagos
(Básico R$ 49,90 / Profissional R$ 99,90), relatórios avançados, IA, cursos e painel administrativo.

## Regras ao alterar o código
- Manter sem build e sem frameworks; textos da interface em português.
- Sempre escapar dados de usuário com `esc()` ao montar HTML.
- Qualquer mudança no banco: atualizar `supabase/setup.sql` de forma reexecutável (`if not exists`, `drop policy if exists`).
- Plano gratuito do Supabase: 500 MB de banco, 1 GB de arquivos e pausa após 7 dias sem uso.
