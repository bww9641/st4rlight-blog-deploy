# Migration Helper

This helper keeps Jekyll YAML front matter intact and normalizes filenames for `_posts`.

## Usage
```bash
chmod +x tools/migrate/migrate_posts.sh
tools/migrate/migrate_posts.sh <legacy_markdown_dir> _posts
```

## Behavior
- If a filename already matches `YYYY-MM-DD-title.md`, it is copied as-is.
- Otherwise it derives date from front matter `date:` when present.
- If no valid front matter date exists, it uses today's date.
- Front matter/body content are copied without transformation.
