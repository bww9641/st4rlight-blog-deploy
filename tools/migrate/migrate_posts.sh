#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <source_dir> <target_posts_dir>"
  exit 1
fi

SOURCE_DIR="$1"
TARGET_DIR="$2"
TODAY="$(date +%Y-%m-%d)"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Source directory not found: $SOURCE_DIR"
  exit 1
fi

mkdir -p "$TARGET_DIR"

slugify() {
  echo "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g' \
    | sed -E 's/^-+|-+$//g'
}

extract_date_from_frontmatter() {
  local file="$1"
  local d
  d="$(awk '
    NR==1 && $0 != "---" { exit }
    NR>1 && $0 == "---" { exit }
    /^date:[[:space:]]*/ { sub(/^date:[[:space:]]*/, "", $0); print $0; exit }
  ' "$file" | sed -E 's/[T ].*$//' | sed -E 's/^"|"//g')"
  if [[ "$d" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    echo "$d"
  else
    echo "$TODAY"
  fi
}

find "$SOURCE_DIR" -maxdepth 1 -type f \( -name "*.md" -o -name "*.markdown" \) | while read -r src; do
  base="$(basename "$src")"

  if [[ "$base" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}-.+\.(md|markdown)$ ]]; then
    cp "$src" "$TARGET_DIR/$base"
    echo "copied $base"
    continue
  fi

  stem="${base%.*}"
  date_part="$(extract_date_from_frontmatter "$src")"
  slug="$(slugify "$stem")"
  dest="${TARGET_DIR}/${date_part}-${slug}.md"
  cp "$src" "$dest"
  echo "migrated $base -> $(basename "$dest")"
done

echo "Done."
