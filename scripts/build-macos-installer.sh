#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$ROOT/dist/macos"
SERVER_SRC="$ROOT/apps/server"
CLIENT_SRC="$ROOT/apps/client"
SERVER_APP="$BUILD_DIR/WAAN Server.app"
CLIENT_APP="$BUILD_DIR/WAAN Client.app"
PKG_DIR="$BUILD_DIR/pkg"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

for cmd in node npm pkgbuild productbuild rsync; do
  require_cmd "$cmd"
done

echo "==> Preparing workspace"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR" "$PKG_DIR"

pushd "$ROOT" >/dev/null

if [[ "${SKIP_NPM_INSTALL:-0}" != "1" ]]; then
  echo "==> Installing workspace dependencies"
  npm install --workspaces
else
  echo "==> Skipping npm install (SKIP_NPM_INSTALL=1)"
fi

echo "==> Building Electron client"
npm run --workspace apps/client sync:web
npm run --workspace apps/client pack

CLIENT_APP_SRC=$(find "$CLIENT_SRC/dist" -name "WAAN Client.app" -type d | head -n 1)
if [[ -z "$CLIENT_APP_SRC" ]]; then
  echo "Could not find built WAAN Client.app. Check Electron build output." >&2
  exit 1
fi

echo "==> Staging client app"
rsync -a "$CLIENT_APP_SRC/" "$CLIENT_APP/"

echo "==> Staging server app"
mkdir -p "$SERVER_APP/Contents/MacOS" "$SERVER_APP/Contents/Resources"
rsync -a --exclude node_modules --exclude dist "$SERVER_SRC/" "$SERVER_APP/Contents/Resources/app/"
npm install --omit=dev --prefix "$SERVER_APP/Contents/Resources/app"

NODE_BIN="${NODE_BIN:-$(command -v node)}"
if [[ -z "$NODE_BIN" || ! -x "$NODE_BIN" ]]; then
  echo "Unable to locate node binary. Set NODE_BIN to a valid path." >&2
  exit 1
fi
cp "$NODE_BIN" "$SERVER_APP/Contents/MacOS/node"

cat > "$SERVER_APP/Contents/MacOS/waan-server" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
APP_ROOT="$(cd "$(dirname "$0")/../Resources/app" && pwd)"
DATA_DIR="${WAAN_DATA_DIR:-$HOME/Library/Application Support/WAAN}"
exec "$(dirname "$0")/node" "$APP_ROOT/src/index.js" --data-dir "$DATA_DIR" "$@"
EOF
chmod +x "$SERVER_APP/Contents/MacOS/waan-server"

SERVER_VERSION=$(node -p "require('./apps/server/package.json').version")
cat > "$SERVER_APP/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>WAAN Server</string>
  <key>CFBundleIdentifier</key>
  <string>com.waan.server</string>
  <key>CFBundleVersion</key>
  <string>${SERVER_VERSION}</string>
  <key>CFBundleShortVersionString</key>
  <string>${SERVER_VERSION}</string>
  <key>CFBundleExecutable</key>
  <string>waan-server</string>
  <key>LSBackgroundOnly</key>
  <true/>
</dict>
</plist>
EOF

echo "==> Building component packages"
pkgbuild \
  --component "$SERVER_APP" \
  --identifier "com.waan.server" \
  --install-location "/Applications/WAAN Server.app" \
  "$PKG_DIR/waan-server.pkg"

pkgbuild \
  --component "$CLIENT_APP" \
  --identifier "com.waan.client" \
  --install-location "/Applications/WAAN Client.app" \
  "$PKG_DIR/waan-client.pkg"

echo "==> Assembling final installer"
productbuild \
  --distribution "$ROOT/docs/macos/distribution.xml" \
  --package-path "$PKG_DIR" \
  "$BUILD_DIR/WAAN-Installer.pkg"

echo "Build complete:"
ls -1 "$BUILD_DIR" | sed 's/^/  - /'

popd >/dev/null
