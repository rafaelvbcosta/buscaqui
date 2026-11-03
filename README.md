# BuscAqui

**Encontre. Conecte. Trabalhe.**

Site (celular e computador) que conecta, em **Arcos - MG**, quem procura emprego, profissionais autônomos e empresas
locais. O foco principal é a mão de obra operacional (ajudante, serviços gerais, limpeza, atendimento, construção)
e as empresas que precisam dela; a parte de serviços atende todo mundo.

- Site: **https://www.buscaquiarcos.com.br/** (o endereço antigo `rafaelvbcosta.github.io/buscaqui/` redireciona)
- Hospedagem: GitHub Pages (grátis) · Banco de dados, login e arquivos: Supabase (plano grátis)
- Status detalhado, pendências e histórico: [`PROJECT_STATUS.md`](PROJECT_STATUS.md) ·
  Regras e arquitetura (para quem desenvolve): [`CLAUDE.md`](CLAUDE.md)

---

## O que o site faz

| Perfil | Recursos |
|---|---|
| **Candidato** (grátis) | Vagas de Arcos com busca, categoria, salário e favoritas; candidatura com um toque; acompanhar candidaturas e entrevistas; Currículo fácil pelo celular; PDF grátis; enviar PDF próprio |
| **Autônomo** | Perfil de serviços em 4 etapas (com CPF), aparecer em "Encontrar profissional", ver pedidos de serviço e oferecer pelo WhatsApp; plano **Autônomo Destaque** (R$ 14,90/mês) para ficar no topo |
| **Empresa** | Cadastro com CNPJ (conferido na Receita), publicar vagas, ver candidatos, aprovar/recusar, marcar entrevista, WhatsApp direto, painel, página pública, **divulgar os serviços da empresa**. **30 dias grátis** (uma vez por CNPJ); depois **Básico** R$ 29,90/mês ou **Profissional** R$ 49,90/mês |
| **Todos** | Encontrar profissionais e empresas de serviço, publicar pedido de serviço, perfil com foto, trocar senha, **enviar sugestões** |
| **Admin** | Visão geral, usuários (documentos, bloqueio, dar plano, possíveis duplicados), confirmar pagamentos por Pix, moderação, chave Pix e sugestões |

Pagamento dos planos: **Pix manual** (o usuário faz o Pix com o código do pedido e o admin confirma). Se o plano
vence, as vagas da empresa ficam **pausadas** (nada é apagado) e voltam ao renovar.

---

## Configuração (já feita — só para refazer do zero)

1. **Banco:** Supabase → **SQL Editor** → **New query** → cole todo o [`supabase/setup.sql`](supabase/setup.sql) →
   **Run** → deve aparecer *Success. No rows returned*. Pode ser rodado de novo sem perder dados.
2. **Conectar o site:** em [`js/config.js`](js/config.js), cole a **Project URL** e a **Publishable key** entre as
   aspas. ⚠️ **Nunca** use a chave *secret* / *service_role*.
3. **GitHub Pages:** Settings → Pages → *Deploy from a branch* → **main** e **/(root)**. Domínio:
   *Custom domain* `www.buscaquiarcos.com.br` + **Enforce HTTPS**. Não apague o arquivo `CNAME`.
4. **Supabase:** Authentication → URL Configuration → *Site URL* `https://www.buscaquiarcos.com.br/`.
5. **Admin:** crie a conta no site e rode no SQL Editor:
   `update public.profiles set is_admin = true where email = 'SEU_EMAIL';`
   Depois cadastre a chave Pix em **Admin › Configurações**.

## Como publicar uma mudança
1. A mudança é feita numa branch de trabalho e testada (`tools/testes/`).
2. Abre-se um **Pull Request**; se o banco mudou, rode o `setup.sql` da branch no Supabase **antes** do merge.
3. Merge no GitHub → o site atualiza em cerca de 2 minutos (aperte **Ctrl + Shift + R** para ver).
4. Antes de publicar, `python3 tools/versao.py` troca a versão dos arquivos para o navegador não usar a antiga.

## Tarefas úteis
- **Apagar os dados de exemplo:** rode [`supabase/remover-exemplos.sql`](supabase/remover-exemplos.sql).
- **Antes de abrir ao público:** religue *Authentication → Sign In / Providers → Confirm email*.
- **Projeto pausado?** O Supabase grátis pausa após 7 dias sem uso: painel → **Restore project**.
- **Testes:** veja [`tools/testes/README.md`](tools/testes/README.md).

## Arquivos
```
index.html             página principal (única)
CNAME, .nojekyll       domínio do GitHub Pages (não apagar)
css/styles.css         visual
js/config.js           URL e chave publishable do Supabase
js/app.js              rotas e menus
js/store.js            dados do usuário logado e planos
js/ui.js               ferramentas comuns (ícones, avisos, máscaras, CPF/CNPJ, categorias, planos)
js/views/*.js          telas (login, candidato, serviços, empresa, perfil, planos, admin, sugestões)
assets/                logo e ícone
supabase/setup.sql     banco de dados completo (reexecutável)
tools/versao.py        versão dos arquivos (cache do navegador)
tools/testes/          testes das telas e do banco (não vão para o site)
```

Não há etapa de "build": o que está no repositório é exatamente o que vai para o ar.
