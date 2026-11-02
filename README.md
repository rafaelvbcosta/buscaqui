# BuscAqui

**Encontre. Conecte. Trabalhe.**

Plataforma web (celular e computador) que conecta pessoas em busca de emprego, profissionais autônomos e empresas locais.

- Site: `https://www.buscaquiarcos.com.br/` (antes: `rafaelvbcosta.github.io/buscaqui/`, que redireciona)
- Hospedagem: GitHub Pages (gratuito)
- Banco de dados, login e arquivos: Supabase (plano gratuito)

---

## O que já funciona (MVP)

| Perfil | Recursos |
|---|---|
| **Candidato** | Cadastro, busca de vagas com filtros (categoria, salário, modalidade), favoritos, candidatura rápida, minhas candidaturas com status e data de entrevista, Currículo Fácil, prévia e download em PDF, envio de PDF próprio |
| **Profissional autônomo** | Cadastro em 4 etapas (dados, serviços com "Adicionar outro serviço", apresentação, valor opcional), ver pedidos de serviço e oferecer serviço pelo WhatsApp |
| **Empresa** | Cadastro (CNPJ, logo, redes sociais), publicar/editar/encerrar vagas, ver candidatos, ver currículo, aprovar/recusar, marcar entrevista, WhatsApp direto, painel com visualizações e candidatos, página pública da empresa |
| **Todos** | Serviços: encontrar profissional e publicar pedido de serviço; perfil com foto; troca de senha |

**Em breve (aparece como "Em breve" no app):** chat, notificações, avaliações, login com Google, vídeo de apresentação, planos pagos, relatórios avançados, inteligência artificial e painel administrativo.

---

## Configuração (uma vez só)

### 1. Banco de dados no Supabase
1. Abra o projeto no [Supabase](https://supabase.com/dashboard).
2. Menu lateral → **SQL Editor** → **New query**.
3. Abra o arquivo [`supabase/setup.sql`](supabase/setup.sql), copie **todo** o conteúdo e cole no editor.
4. Clique em **Run**. Deve aparecer *Success. No rows returned*.

Isso cria as tabelas, as regras de segurança, as pastas de arquivos e alguns dados de exemplo.

### 2. Conectar o site ao Supabase
1. No GitHub, abra o arquivo [`js/config.js`](js/config.js) e clique no lápis ✏️ (*Edit this file*).
2. Troque `COLE_AQUI_A_PROJECT_URL` pela **Project URL** e `COLE_AQUI_A_PUBLISHABLE_KEY` pela **Publishable key** (mantenha as aspas).
3. Clique em **Commit changes** → **Commit changes**.

> ⚠️ Use só a chave **Publishable** (ou *anon public*). **Nunca** coloque a chave *secret* / *service_role* no código.

### 3. Ligar o GitHub Pages
1. No repositório: **Settings** → **Pages**.
2. Em *Source*: **Deploy from a branch**. Em *Branch*: **main** e **/(root)** → **Save**.
3. Aguarde 1 a 2 minutos. O endereço aparece no topo da página.

### 4. Endereço do site no Supabase
**Authentication** → **URL Configuration** → *Site URL*: `https://www.buscaquiarcos.com.br/` → **Save**.

---

## Tarefas úteis

- **Apagar os dados de exemplo:** rode [`supabase/remover-exemplos.sql`](supabase/remover-exemplos.sql) no SQL Editor.
- **Antes de abrir ao público:** religue *Authentication → Sign In / Providers → Confirm email*.
- **Projeto pausado?** No plano gratuito, o Supabase pausa após 7 dias sem uso. Entre no painel e clique em **Restore project**.

---

## Estrutura dos arquivos

```
index.html            página principal
css/styles.css        visual (cores, tamanhos, layout)
js/config.js          ← URL e chave do Supabase
js/app.js             rotas e menus
js/views/*.js         telas (candidato, empresa, serviços, perfil, login)
assets/               logo e ícone
supabase/setup.sql    criação do banco de dados
```

Não há etapa de "build": o que está no repositório é exatamente o que vai para o ar.
