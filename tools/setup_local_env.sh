#!/usr/bin/env bash
set -euo pipefail

# One-shot setup for:
# - Ruby bundler (user install)
# - Jekyll gems for st4rlight-blog
# - nvm + Node LTS
# - npm deps for st4rlight-writer

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLOG_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${BLOG_ROOT}/.." && pwd)"
WRITER_ROOT="${PROJECT_ROOT}/st4rlight-writer"

echo "[1/5] Installing bundler (user scope)..."
gem install --user-install bundler

RUBY_USER_BIN="$(ruby -e 'print Gem.user_dir')/bin"
export PATH="${RUBY_USER_BIN}:$PATH"

echo "[2/5] Installing blog gems into vendor/bundle..."
cd "${BLOG_ROOT}"
bundle config set --local path vendor/bundle
bundle install

echo "[3/5] Installing nvm (if missing)..."
if [[ ! -s "${HOME}/.nvm/nvm.sh" ]]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi

export NVM_DIR="${HOME}/.nvm"
# nvm scripts can reference unset vars internally; relax nounset only for this block.
set +u
# shellcheck disable=SC1090
source "${NVM_DIR}/nvm.sh"

echo "[4/5] Installing/using Node LTS..."
nvm install --lts
nvm use --lts
set -u

echo "[5/5] Installing writer npm dependencies..."
if [[ -d "${WRITER_ROOT}" ]]; then
  cd "${WRITER_ROOT}"
  npm install
else
  echo "warning: writer repo not found at ${WRITER_ROOT}"
fi

echo
echo "Setup complete."
echo "Blog run:"
echo "  cd ${BLOG_ROOT} && bundle exec jekyll serve --livereload --host 0.0.0.0 --port 4000"
echo "Writer run:"
echo "  cd ${WRITER_ROOT} && npm run dev"
