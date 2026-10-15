#!/bin/sh
# One-off: copies catalog images from Supabase Storage to the catalog-images container,
# keeping the same paths, and rewrites the URLs in the database.
# Usage: migrate-catalog-images.sh <api-url> <old-prefix> <new-prefix> <storage-account>
set -eu

API_URL=$1
OLD_PREFIX=$2
NEW_PREFIX=$3
ACCOUNT=$4
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

curl -fsS "$API_URL/products" "$API_URL/categories" \
  | node -e '
    let raw = ""; process.stdin.on("data", c => raw += c).on("end", () => {
      const urls = raw.split(/(?<=\])(?=\[)/).flatMap(JSON.parse).map(x => x.imageUrl ?? x.iconUrl).filter(Boolean);
      console.log([...new Set(urls)].join("\n"));
    });' > "$WORK/urls"

count=0
while read -r url; do
  case "$url" in "$OLD_PREFIX"*) ;; *) continue ;; esac
  path=${url#"$OLD_PREFIX"}
  case "$path" in *.svg) type=image/svg+xml ;; *.png) type=image/png ;; *) type=application/octet-stream ;; esac
  curl -fsS "$url" -o "$WORK/file"
  az storage blob upload --only-show-errors --auth-mode login --account-name "$ACCOUNT" \
    --container-name catalog-images --name "$path" --file "$WORK/file" --overwrite \
    --content-type "$type" --content-cache-control "public, max-age=86400" --no-progress -o none
  count=$((count + 1))
done < "$WORK/urls"
echo "uploaded: $count" >&2

cat <<SQL
BEGIN;
UPDATE products SET "imageUrl" = replace("imageUrl", '$OLD_PREFIX', '$NEW_PREFIX') WHERE "imageUrl" LIKE '$OLD_PREFIX%';
UPDATE categories SET "iconUrl" = replace("iconUrl", '$OLD_PREFIX', '$NEW_PREFIX') WHERE "iconUrl" LIKE '$OLD_PREFIX%';
COMMIT;
SQL
