#!/bin/bash

ENV_FILE=".env"

if [ -f "$ENV_FILE" ]; then
    echo ".env already exists. Delete it first to regenerate."
    exit 1
fi

# Generate random secrets
POSTGRES_PASSWORD=$(openssl rand -hex 16)
SECRETS_ENCRYPTION_KEY=$(openssl rand -hex 32)

cat > "$ENV_FILE" << EOF
# Database
DATABASE_URL="postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/termflux"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"

# Redis
REDIS_URL="redis://localhost:6379"

# App
APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Docker (for workspace containers)
DOCKER_SOCKET="/var/run/docker.sock"
WORKSPACE_IMAGE="termflux-workspace:latest"
WORKSPACE_NETWORK="termflux-network"

# Secrets encryption (auto-generated)
SECRETS_ENCRYPTION_KEY="${SECRETS_ENCRYPTION_KEY}"

# GitHub OAuth (optional - fill in manually)
GITHUB_APP_ID=""
GITHUB_APP_PRIVATE_KEY=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
EOF

echo "Generated .env with random credentials:"
echo "  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}"
echo "  SECRETS_ENCRYPTION_KEY: ${SECRETS_ENCRYPTION_KEY}"
echo ""
echo "For Docker Compose, update DATABASE_URL host to 'postgres' instead of 'localhost'"
