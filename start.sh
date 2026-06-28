#!/bin/bash
set -e

# Re-download Node if /tmp was cleared
if [ ! -f /tmp/node-v20.18.0-darwin-arm64/bin/node ]; then
  echo "Downloading Node.js..."
  curl -sL https://nodejs.org/dist/v20.18.0/node-v20.18.0-darwin-arm64.tar.gz -o /tmp/node.tar.gz
  tar -xzf /tmp/node.tar.gz -C /tmp
fi

export PATH="/tmp/node-v20.18.0-darwin-arm64/bin:$PATH"
NODE="/tmp/node-v20.18.0-darwin-arm64/bin/node"
NPM="$NODE /tmp/node-v20.18.0-darwin-arm64/bin/npm"

DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "🧠  Starting FocusLens..."
echo ""

# Start backend
cd "$DIR/backend"
$NODE --loader ts-node/esm --no-warnings src/index.ts &
BACKEND_PID=$!

# Start frontend
cd "$DIR/frontend"
$NPM run dev -- --host &
FRONTEND_PID=$!

echo ""
echo "━━━━━━━━���━━━━━━━━━���━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Frontend  →  http://localhost:5173"
echo "  Backend   →  http://localhost:3001"
echo "��━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT INT TERM
wait
