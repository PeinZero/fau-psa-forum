#!/usr/bin/env bash
# Deletes the files of removed thread images from Backblaze, then clears their queue rows.
# Needs SUPABASE_DB_URL, MEDIA_B2_BUCKET, MEDIA_B2_REGION and AWS_* credentials for the bucket.
set -euo pipefail

pattern='^threads/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webp|jpg)$'
endpoint="https://s3.$MEDIA_B2_REGION.backblazeb2.com"

deleted=0
skipped=0
failed=0

# Queue rows are only written by the database trigger, but the key still decides what gets
# deleted from the bucket, so anything outside the upload naming scheme is left alone.
# Rows count toward a member's daily upload limit, so they stay until a day after the upload;
# clearing them sooner would let deleting and uploading again reset that limit.
keys=$(psql "$SUPABASE_DB_URL" -At -c "select storage_key from public.media_deletions
  where uploaded_at < now() - interval '24 hours' order by queued_at limit 1000")

while IFS= read -r key; do
  [ -n "$key" ] || continue
  if ! [[ "$key" =~ $pattern ]]; then
    echo "Skipping unexpected key: $key"
    skipped=$((skipped + 1))
    continue
  fi
  # A file that is already gone counts as deleted, so a retry after a half-finished run is safe.
  if aws s3api delete-object --bucket "$MEDIA_B2_BUCKET" --key "$key" --endpoint-url "$endpoint" >/dev/null; then
    # The row goes only after the file is gone; otherwise the file would keep counting toward
    # the upload limits with nothing left to retry it.
    # psql fills in :'key' only in statements it reads itself, not in a -c string.
    if psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -v key="$key" >/dev/null \
      <<< "delete from public.media_deletions where storage_key = :'key';"; then
      deleted=$((deleted + 1))
    else
      echo "Deleted the file but not the queue row: $key"
      failed=$((failed + 1))
    fi
  else
    echo "Delete failed: $key"
    failed=$((failed + 1))
  fi
done <<< "$keys"

echo "Media cleanup: $deleted deleted, $skipped skipped, $failed failed."
[ "$failed" -eq 0 ]
