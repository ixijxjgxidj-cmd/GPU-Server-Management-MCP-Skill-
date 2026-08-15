# ======================================================
# ⚡ GPU Server Management MCP (gpu-mcp-server-cf)
#    One-Click Automated Deployment Script (Windows PowerShell)
# ======================================================

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerDir = Join-Path $RootDir "gpu-mcp-server-cf"

if (-not (Test-Path $ServerDir)) {
    Write-Error "❌ Error: Directory gpu-mcp-server-cf not found at $ServerDir"
    exit 1
}

Set-Location $ServerDir

Write-Host "📦 Step 1: Checking dependencies..." -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
    npm install
} else {
    Write-Host "   Dependencies already installed." -ForegroundColor Green
}

Write-Host "🔑 Step 2: Checking Cloudflare authentication..." -ForegroundColor Cyan
try {
    npx wrangler whoami | Out-Null
} catch {
    Write-Host "🌐 Initiating Cloudflare OAuth login..." -ForegroundColor Yellow
    npx wrangler login
}

Write-Host "🗄️ Step 3: Applying D1 Database migrations..." -ForegroundColor Cyan
npx wrangler d1 migrations apply DB --remote

Write-Host "🚀 Step 4: Deploying Worker to Cloudflare..." -ForegroundColor Cyan
$DeployOutput = npx wrangler deploy 2>&1 | Out-String
Write-Host $DeployOutput

$WorkerUrl = ""
if ($DeployOutput -match '(https://[^\s]+\.workers\.dev)') {
    $WorkerUrl = $matches[1]
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "🎉 Deployment Completed Successfully!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green

if ($WorkerUrl) {
    Write-Host "🌐 Web Dashboard: $WorkerUrl" -ForegroundColor White
    Write-Host "🛠️ MCP Endpoint:  $WorkerUrl/mcp" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Client Configuration Snippet:" -ForegroundColor Yellow
    Write-Host @"
  [Antigravity / Gemini (~/.gemini/config/mcp_config.json)]:
  {
    "mcpServers": {
      "gpu-mcp-server-cf": {
        "serverUrl": "$WorkerUrl/mcp"
      }
    }
  }

  [Claude Code (~/.claude/settings.json)]:
  {
    "mcpServers": {
      "gpu-mcp-server-cf": {
        "type": "http",
        "url": "$WorkerUrl/mcp"
      }
    }
  }
"@
}
Write-Host "======================================================" -ForegroundColor Green
