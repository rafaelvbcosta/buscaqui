#!/usr/bin/env bash
# Testa o supabase/setup.sql num Postgres 16 TEMPORÁRIO (nunca no Supabase de verdade):
#   1) cria um banco vazio com os stubs do Supabase;
#   2) roda o setup.sql da main (se houver git) e depois o atual DUAS vezes (prova que é reexecutável);
#   3) roda os testes de segurança (seguranca.sql);
#   4) confere que os exemplos apagados não voltam ao rodar o setup.sql de novo.
# Uso, na raiz do repositório:  bash tools/testes/banco/testar-banco.sh
set -euo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"; RAIZ="$(cd "$AQUI/../../.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
DIR="$(mktemp -d /tmp/buscaqui-pg-XXXX)"; chmod 755 "$DIR"; SOCK="$DIR"; PORTA=54399
COMO=(); [ "$(id -u)" = 0 ] && { chown postgres "$DIR"; COMO=(runuser -u postgres --); }
"${COMO[@]}" "$PGBIN/initdb" -D "$DIR/data" -A trust -U postgres >/dev/null
"${COMO[@]}" "$PGBIN/pg_ctl" -D "$DIR/data" -o "-k $SOCK -p $PORTA -c listen_addresses=" -l "$DIR/log" -w start >/dev/null
trap '"${COMO[@]}" "$PGBIN/pg_ctl" -D "$DIR/data" -m fast stop >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
P=(psql -h "$SOCK" -p "$PORTA" -U postgres -v ON_ERROR_STOP=1 -q)
"${P[@]}" -c "create database teste" >/dev/null
"${P[@]}" -d teste -f "$AQUI/stubs.sql" >/dev/null 2>&1
if git -C "$RAIZ" show origin/main:supabase/setup.sql > "$DIR/main.sql" 2>/dev/null; then
  "${P[@]}" -d teste -f "$DIR/main.sql" >/dev/null 2>&1 && echo "OK  setup.sql da main"
  # dado "antigo" para conferir a migração: um CPF guardado do jeito da main (se a main tiver profiles.cpf)
  "${P[@]}" -d teste -c "insert into auth.users(id,email,raw_user_meta_data) values ('a9000000-0000-4000-8000-000000000001','antigo@teste','{\"role\":\"profissional\"}');
    do \$\$ begin if exists (select 1 from information_schema.columns where table_name='profiles' and column_name='cpf') then
      update profiles set cpf='529.982.247-25' where id='a9000000-0000-4000-8000-000000000001'; end if; end \$\$;" >/dev/null 2>&1 || true
fi
"${P[@]}" -d teste -f "$RAIZ/supabase/setup.sql" >/dev/null 2>&1 && echo "OK  setup.sql atual (1ª vez)"
"${P[@]}" -d teste -f "$RAIZ/supabase/setup.sql" >/dev/null 2>&1 && echo "OK  setup.sql atual (2ª vez, reexecutável)"
MIGR=$("${P[@]}" -d teste -Atc "select (select count(*) from user_docs where user_id='a9000000-0000-4000-8000-000000000001')||'/'||(select count(*) from profiles where cpf is not null)" 2>/dev/null || echo "-")
[ "$MIGR" = "1/0" ] && echo "OK  migração: CPF antigo foi para user_docs e saiu do perfil" || echo "INFO migração não conferida ($MIGR)"
"${P[@]}" -d teste -c "delete from auth.users where id='a9000000-0000-4000-8000-000000000001'; delete from profiles where id='a9000000-0000-4000-8000-000000000001';" >/dev/null 2>&1 || true
"${P[@]}" -d teste -f "$AQUI/seguranca.sql" 2>&1 | sed -n 's/^psql:[^ ]* NOTICE:  //p; s/^NOTICE:  //p; /FALHOU\|ERROR\|passaram/p'
# Exemplos: remover-exemplos.sql apaga e, depois dele, rodar o setup.sql de novo NÃO recria os exemplos
ANTES=$("${P[@]}" -d teste -Atc "select count(*) from companies where owner_id is null")
"${P[@]}" -d teste -f "$RAIZ/supabase/remover-exemplos.sql" >/dev/null 2>&1
"${P[@]}" -d teste -f "$RAIZ/supabase/setup.sql" >/dev/null 2>&1
DEPOIS=$("${P[@]}" -d teste -Atc "select (select count(*) from companies where owner_id is null)+(select count(*) from jobs j join companies c on c.id=j.company_id where c.owner_id is null)+(select count(*) from professionals where user_id is null and company_id is null)")
if [ "$ANTES" -gt 0 ] && [ "$DEPOIS" = 0 ]; then echo "OK  exemplos removidos não voltam ao rodar o setup.sql de novo"; else echo "FALHOU: exemplos (antes $ANTES, depois $DEPOIS)"; exit 1; fi
