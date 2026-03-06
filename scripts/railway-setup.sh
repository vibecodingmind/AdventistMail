#!/bin/bash
# Railway setup script - sets variables via Railway CLI
# Run: ./scripts/railway-setup.sh
# Prerequisites: railway login, railway link (select your project & service)

set -e

URL="https://adventistmail-production.up.railway.app"

echo "Adventist Mail - Railway variable setup"
echo "====================================="
echo ""

# Check Railway CLI
if ! command -v railway &> /dev/null; then
  echo "Railway CLI not found. Install: npm i -g @railway/cli"
  echo "Then: railway login && railway link"
  exit 1
fi

# Check link
if ! railway status &> /dev/null; then
  echo "Not linked to a Railway project. Run: railway link"
  echo "Select your project and the main service (the one with adventistmail-production)"
  exit 1
fi

echo "Setting variables for $URL ..."
echo ""

# Generate JWT_SECRET
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
echo "Generated JWT_SECRET"

# Set variables (all except DATABASE_URL and REDIS_URL which need References)
railway variables set \
  NODE_ENV=production \
  APP_URL="$URL" \
  API_URL="http://localhost:3001" \
  NEXT_PUBLIC_API_URL="${URL}/api/v1" \
  JWT_SECRET="$JWT_SECRET"

echo ""
echo "Variables set successfully!"
echo ""
echo "IMPORTANT: Add these 2 variables manually in Railway dashboard (Variables tab):"
echo "  - DATABASE_URL  -> Add Variable -> Reference -> Postgres -> DATABASE_URL"
echo "  - REDIS_URL     -> Add Variable -> Reference -> Redis -> REDIS_URL"
echo ""
echo "Then redeploy your service."
echo ""
