#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           shep-ai: Automated Bootstrap & Development Setup      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Interactive setup for local variants
echo -e "${YELLOW}[1/7] Configuration setup...${NC}"

# Ollama setup
read -p "Do you have Ollama already installed and running? (y/n) [default: n]: " OLLAMA_EXISTING
OLLAMA_EXISTING=${OLLAMA_EXISTING:-n}

if [[ "$OLLAMA_EXISTING" == "y" ]]; then
  read -p "Ollama host:port (default: localhost:11434): " OLLAMA_URL
  OLLAMA_URL=${OLLAMA_URL:-localhost:11434}
  OLLAMA_BASE_URL="http://$OLLAMA_URL"
  USE_DOCKER_OLLAMA=false
else
  OLLAMA_BASE_URL="http://localhost:11434"
  USE_DOCKER_OLLAMA=true
fi

# Database setup
read -p "Use default DB credentials? shep:shep_local@localhost:5433 (y/n) [default: y]: " DB_DEFAULT
DB_DEFAULT=${DB_DEFAULT:-y}

if [[ "$DB_DEFAULT" == "y" ]]; then
  DB_USER="shep"
  DB_PASSWORD="shep_local"
  DB_HOST="localhost"
  DB_PORT="5433"
  DB_NAME="shep_ai"
else
  read -p "Database user [default: shep]: " DB_USER
  DB_USER=${DB_USER:-shep}
  read -p "Database password [default: shep_local]: " DB_PASSWORD
  DB_PASSWORD=${DB_PASSWORD:-shep_local}
  read -p "Database host [default: localhost]: " DB_HOST
  DB_HOST=${DB_HOST:-localhost}
  read -p "Database port [default: 5433]: " DB_PORT
  DB_PORT=${DB_PORT:-5433}
  read -p "Database name [default: shep_ai]: " DB_NAME
  DB_NAME=${DB_NAME:-shep_ai}
fi

DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

echo ""
echo -e "${GREEN}Configuration:${NC}"
echo "  Ollama: $OLLAMA_BASE_URL (from: $([ "$USE_DOCKER_OLLAMA" = true ] && echo "docker-compose" || echo "existing install"))"
echo "  Database: $DATABASE_URL"
echo ""

# 2. Prerequisite checks
echo -e "${YELLOW}[2/7] Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
  echo -e "${RED}✗ Docker not found. Install from https://www.docker.com/products/docker-desktop${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Docker${NC}"

if ! command -v pnpm &> /dev/null; then
  echo -e "${YELLOW}Installing pnpm...${NC}"
  npm install -g pnpm
fi
echo -e "${GREEN}✓ pnpm${NC}"

if ! command -v git &> /dev/null; then
  echo -e "${RED}✗ Git not found${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Git${NC}"

# 2. Install Ollama (macOS only; comment out for Linux/Windows)
echo ""
echo -e "${YELLOW}[2/7] Checking Ollama...${NC}"

if [[ "$OSTYPE" == "darwin"* ]]; then
  if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}Installing Ollama via Homebrew...${NC}"
    brew install ollama
  fi
  echo -e "${GREEN}✓ Ollama${NC}"
else
  echo -e "${YELLOW}⚠ Ollama check skipped (macOS only in this script)${NC}"
  echo -e "  For Linux: curl https://ollama.ai/install.sh | sh"
  echo -e "  For Windows: Download from https://ollama.ai"
fi

# 3. Create .env.local if it doesn't exist
echo ""
echo -e "${YELLOW}[3/7] Configuring environment...${NC}"

if [ ! -f .env.local ]; then
  echo "Creating .env.local with generated secrets and your configuration..."

  # Generate secrets
  NEXTAUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  TOKEN_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

  cat > .env.local << EOF
# ═══════════════════════════════════════════════════════════════════════════
# Database (PostgreSQL + pgvector)
# ═══════════════════════════════════════════════════════════════════════════
DATABASE_URL="$DATABASE_URL"

# ═══════════════════════════════════════════════════════════════════════════
# AI Provider Configuration — Ollama (local LLM, no API keys needed)
# ═══════════════════════════════════════════════════════════════════════════
AI_PROVIDER="ollama"
OLLAMA_BASE_URL="$OLLAMA_BASE_URL"

# For production cross-provider support, add keys as needed:
# OPENAI_API_KEY="sk-..."
# ANTHROPIC_API_KEY="sk-ant-..."

# ═══════════════════════════════════════════════════════════════════════════
# Redis Cache (in-memory fallback used in dev, leaving URLs empty)
# ═══════════════════════════════════════════════════════════════════════════
# UPSTASH_REDIS_REST_URL="https://..."
# UPSTASH_REDIS_REST_TOKEN="..."

# ═══════════════════════════════════════════════════════════════════════════
# Authentication — Dev Mock Login (auto-login as test@shep.local)
# To use real Google OAuth instead:
#   1. Go to: https://console.developers.google.com
#   2. Create OAuth 2.0 Client ID (type: Web application)
#   3. Add http://localhost:3000 to Authorized redirect URIs
#   4. Uncomment GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET below
#   5. Comment out SESSION_MOCK
# ═══════════════════════════════════════════════════════════════════════════
SESSION_MOCK="true"

# GOOGLE_CLIENT_ID="<your-client-id>.apps.googleusercontent.com"
# GOOGLE_CLIENT_SECRET="<your-client-secret>"

NEXTAUTH_SECRET="$NEXTAUTH_SECRET"

# ═══════════════════════════════════════════════════════════════════════════
# MCP Token Encryption (for MCP server credentials at rest)
# ═══════════════════════════════════════════════════════════════════════════
TOKEN_ENCRYPTION_KEY="$TOKEN_ENCRYPTION_KEY"

# ═══════════════════════════════════════════════════════════════════════════
# Features & Environment
# ═══════════════════════════════════════════════════════════════════════════
NODE_ENV="development"
WORKSPACES_ENABLED="true"
EOF
  echo -e "${GREEN}✓ .env.local created${NC}"
  echo -e "  ${YELLOW}⚠ Review .env.local for GOOGLE_CLIENT_ID/SECRET or use SESSION_MOCK${NC}"
else
  echo -e "${GREEN}✓ .env.local already exists${NC}"
fi

# 4. Start Docker services
echo ""
echo -e "${YELLOW}[4/7] Starting Docker services (postgres, redis, ollama)...${NC}"

docker-compose up -d
echo -e "${GREEN}✓ Docker services started${NC}"

# Wait for postgres to be ready
echo -e "${YELLOW}Waiting for PostgreSQL to be healthy...${NC}"
for i in {1..30}; do
  if docker exec shep-ai-db pg_isready -U "$DB_USER" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL ready${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}✗ PostgreSQL failed to start${NC}"
    docker-compose logs shep-ai-db
    exit 1
  fi
  echo -n "."
  sleep 1
done

# Wait for Redis
echo -e "${YELLOW}Waiting for Redis to be healthy...${NC}"
for i in {1..10}; do
  if docker exec shep-ai-redis redis-cli ping >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis ready${NC}"
    break
  fi
  if [ $i -eq 10 ]; then
    echo -e "${RED}✗ Redis failed to start${NC}"
    exit 1
  fi
  echo -n "."
  sleep 1
done

# 5. Install dependencies
echo ""
echo -e "${YELLOW}[5/7] Installing Node dependencies...${NC}"
pnpm install --frozen-lockfile
echo -e "${GREEN}✓ Dependencies installed${NC}"

# 6. Run database migrations
echo ""
echo -e "${YELLOW}[6/7] Running database migrations...${NC}"
pnpm drizzle-kit push
echo -e "${GREEN}✓ Migrations applied${NC}"

# 7. Start dev server
echo ""
echo -e "${YELLOW}[7/7] Starting development server...${NC}"
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  ✓ Setup Complete!                             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BLUE}Local dev:${NC}     http://localhost:3000"
echo -e "  ${BLUE}API:${NC}           http://localhost:3000/api/*"
echo -e "  ${BLUE}Ollama:${NC}        http://localhost:11434"
echo ""
echo -e "${YELLOW}IMPORTANT:${NC}"
if grep -q 'SESSION_MOCK="true"' .env.local; then
  echo -e "  • Using dev-login mock (SESSION_MOCK=true)"
  echo -e "  • Auto-login as test@shep.local for testing"
  echo -e "  • For production, set GOOGLE_CLIENT_ID/SECRET and remove SESSION_MOCK"
else
  echo -e "  • Using Google OAuth — make sure GOOGLE_CLIENT_ID/SECRET are set"
  echo -e "  • If login fails, check the credentials in .env.local"
fi
echo ""
echo -e "  • Ollama: Models will auto-download on first use (llama3.1, nomic-embed-text)"
echo -e "  • Database: PostgreSQL at localhost:5433 (user:shep, password:shep_local)"
echo ""

pnpm dev
