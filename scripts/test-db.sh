#!/usr/bin/env bash
# Testa a migration e as políticas RLS num PostgreSQL local (simula auth do Supabase).
# Uso: PGHOST=/tmp PGPORT=5433 PGUSER=postgres npm run db:test
set -euo pipefail
cd "$(dirname "$0")/.."
psql -v ON_ERROR_STOP=1 -q -c "drop database if exists lume_test" -c "create database lume_test"
psql -v ON_ERROR_STOP=1 -q -d lume_test -f scripts/test-rls.sql
for f in supabase/migrations/*.sql; do psql -v ON_ERROR_STOP=1 -q -d lume_test -f "$f"; done
psql -q -d lume_test -f scripts/test-rls-checks.sql
