#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF'
WAAN is now distributed purely as a static web application.

The previous macOS installer only wrapped the Electron desktop shell, which
has been removed. Open `index.html` in a browser or host the static assets
under the repository root (`index.html`, `styles.css`, `js/`, `analytics.json`,
`chat.json`) on any web server to use the dashboard.
EOF
