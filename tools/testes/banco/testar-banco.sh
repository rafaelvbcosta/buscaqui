#!/usr/bin/env bash
# Testa o supabase/setup.sql num Postgres 16 TEMPORÁRIO (nunca no Supabase de verdade):
#   1) cria um banco vazio com os stubs do Supabase;
#   2) roda o setup.sql da main (se houver git) e depois o atual DUAS vezes (prova que é reexecutável);
#   3) roda os testes de segurança (seguranca.sql).
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
fi
"${P[@]}" -d teste -f "$RAIZ/supabase/setup.sql" >/dev/null 2>&1 && echo "OK  setup.sql atual (1ª vez)"
"${P[@]}" -d teste -f "$RAIZ/supabase/setup.sql" >/dev/null 2>&1 && echo "OK  setup.sql atual (2ª vez, reexecutável)"
"${P[@]}" -d teste -f "$AQUI/seguranca.sql" 2>&1 | sed -n 's/^psql:[^ ]* NOTICE:  //p; s/^NOTICE:  //p; /FALHOU\|ERROR\|passaram/p'
