#!/usr/bin/env bash
# Restores a nightly backup (see docs/deployment.md, Backups) into the LOCAL Supabase.
# Usage: scripts/restore-backup.sh <backup.sql.gz.age> <age-identity-file>
# Start from a fresh local database (`npx supabase db reset`) at the commit whose migrations
# match the backup. RESTORE_DB_URL overrides the target but must stay on this machine.
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Usage: $0 <backup.sql.gz.age> <age-identity-file>" >&2
  exit 2
fi
backup=$1
identity=$2
db_url=${RESTORE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}

# Never let a restore wipe a shared or production database.
case $db_url in
  *host=* | *hostaddr=*) echo "Refusing a connection string with host parameters; use postgresql://user:pass@127.0.0.1:port/db." >&2; exit 1 ;;
esac
rest=${db_url#*://}
rest=${rest##*@}
host=${rest%%[/?]*}
case $host in
  \[*\]*) host=${host#[}; host=${host%%]*} ;;
  *) host=${host%%:*} ;;
esac
case $host in
  127.0.0.1 | localhost | ::1) ;;
  *)
    echo "Refusing to restore into '$host': only a local database (127.0.0.1, localhost, ::1) is allowed." >&2
    exit 1
    ;;
esac

for tool in age gunzip psql; do
  command -v "$tool" > /dev/null || { echo "Missing '$tool' (brew install age libpq)." >&2; exit 1; }
done

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
umask 077
age --decrypt --identity "$identity" "$backup" | gunzip > "$tmp/backup.sql"

# Empty exactly the tables the backup holds (rows from migrations and seeds would collide).
# CASCADE also clears rows that point at them, such as local sessions.
tables=$(awk '/^COPY / { printf "%s%s", sep, $2; sep = ", " }' "$tmp/backup.sql")
[ -n "$tables" ] || { echo "The backup contains no table data." >&2; exit 1; }

# One transaction: a failure leaves the local database as it was. The replica role skips
# triggers and foreign-key checks, so profiles are not recreated twice and load order is free.
psql "$db_url" --quiet --no-psqlrc --single-transaction --set ON_ERROR_STOP=1 \
  --command "SET session_replication_role = replica" \
  --command "TRUNCATE $tables CASCADE" \
  --file "$tmp/backup.sql" \
  --command "SET session_replication_role = origin" > /dev/null

psql "$db_url" --no-psqlrc --tuples-only --no-align --command \
  "select (select count(*) from auth.users) || ' users, ' || (select count(*) from public.threads) || ' threads, ' || (select count(*) from public.comments) || ' comments restored.'"
