# Testes do BuscAqui

Nada aqui vai para o site: são ferramentas para conferir mudanças **antes** de publicar.
Nenhum teste usa o Supabase de verdade nem a internet.

| Comando (na raiz do repositório) | O que confere | Precisa de |
|---|---|---|
| `for f in js/*.js js/views/*.js; do node --check "$f"; done` | Erros de sintaxe no JavaScript | Node |
| `node tools/testes/telas.js /tmp/prints` | Abre 31 telas (celular e computador, todos os perfis e o admin), salva um print de cada em `/tmp/prints` e lista erros de JavaScript. Para só algumas: `node tools/testes/telas.js /tmp/prints vagas admin` | Node + Playwright com Chromium |
| `bash tools/testes/banco/testar-banco.sh` | Roda o `supabase/setup.sql` da `main` e depois o atual **duas vezes** (precisa ser reexecutável) num Postgres temporário, e mais de 30 testes de segurança (admin, CNPJ/CPF, planos, Pix, vagas pausadas, limites, sugestões) | Postgres 16 em `/usr/lib/postgresql/16/bin` (ou `PGBIN=...`) |

## Arquivos
- `supabase-falso.js` — imita o Supabase no navegador, com dados **fictícios**. O cenário é escolhido por
  `window.__ROLE`, `__ADMIN`, `__MODE` e `__NOSESSION` (explicados no topo do arquivo).
- `telas.js` — lista de telas a testar (`TELAS`). Tela nova no site → acrescente uma linha. O 6º item (opcional) é
  um seletor para clicar antes do print (ex.: o cadastro clica em "Candidato" para mostrar o formulário).
- `banco/stubs.sql` — imita `auth` e `storage` do Supabase num Postgres comum.
- `banco/seguranca.sql` — os testes de regra do banco. Regra nova no `setup.sql` → acrescente um teste
  (`pg_temp.confere(...)` ou `pg_temp.deve_falhar(...)`).

## Limites
- O Supabase falso devolve sempre os mesmos dados e "aceita" qualquer gravação: ele testa a **tela**, não a regra.
  As regras são testadas pelo `testar-banco.sh`.
- Fontes do Google e a BrasilAPI não são acessadas (a BrasilAPI é simulada respondendo "ATIVA, ARCOS-MG").
- Teste no site real continua sendo feito pelo Rafael, com as contas de teste.
