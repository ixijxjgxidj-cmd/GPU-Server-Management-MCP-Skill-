#!/usr/bin/env bash
set -e

echo "======================================================"
echo "⚡ GPU Server Management MCP (gpu-mcp-server-cf)"
echo "   One-Click Automated Deployment Script (Linux/macOS)"
echo "======================================================"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$ROOT_DIR/gpu-mcp-server-cf"

if [ ! -d "$SERVER_DIR" ]; then
  echo "❌ Error: Directory gpu-mcp-server-cf not found!"
  exit 1
fi

cd "$SERVER_DIR"

echo "📦 Step 1: Installing dependencies..."
if [ ! -d "node_modules" ]; then
  npm install
else
  echo "   Dependencies already installed."
fi

echo "🔑 Step 2: Checking Cloudflare authentication..."
npx wrangler whoami || {
  echo "🌐 Initiating Cloudflare OAuth login..."
  npx wrangler login
}

echo "🗄️ Step 3: Applying D1 Database migrations..."
npx wrangler d1 migrations apply DB --remote

echo "🚀 Step 4: Deploying Worker to Cloudflare..."
DEPLOY_OUTPUT=$(npx wrangler deploy)
echo "$DEPLOY_OUTPUT"

WORKER_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[^ ]*\.workers\.dev' | head -n 1)

echo ""
echo "======================================================"
echo "🎉 Deployment Completed Successfully!"
echo "======================================================"
if [ -n "$WORKER_URL" ]; then
  echo "🌐 Web Dashboard: $WORKER_URL"
  echo "🛠️ MCP Endpoint:  $WORKER_URL/mcp"
  echo ""
  echo "📋 Client Configuration Snippet:"
  echo ""
  echo "  [Antigravity / Gemini (~/.gemini/config/mcp_config.json)]:"
  echo "  {"
  echo "    \"mcpServers\": {"
  echo "      \"gpu-mcp-server-cf\": {"
  echo "        \"serverUrl\": \"$WORKER_URL/mcp\""
  echo "      }"
  echo "    }"
  echo "  }"
  echo ""
  echo "  [Claude Code (~/.claude/settings.json)]:"
  echo "  {"
  echo "    \"mcpServers\": {"
  echo "      \"gpu-mcp-server-cf\": {"
  echo "        \"type\": \"http\","
  echo "        \"url\": \"$WORKER_URL/mcp\""
  echo "      }"
  echo "    }"
  echo "  }"
fi
echo "======================================================"
