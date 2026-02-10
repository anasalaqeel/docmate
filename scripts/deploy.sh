#!/bin/bash

# Grud Deployment Script
# This script helps deploy Grud to a remote server using SSH and Docker.

# --- Configuration ---
SERVER_USER=${SERVER_USER:-"root"}
SERVER_IP=${SERVER_IP:-""}
DEPLOY_PATH=${DEPLOY_PATH:-"/opt/grud"}
ENV_FILE=${ENV_FILE:-".env.docker"}

# --- Validation ---
if [ -z "$SERVER_IP" ]; then
  echo "Error: SERVER_IP is not set."
  echo "Usage: SERVER_IP=1.2.3.4 ./scripts/deploy.sh"
  exit 1
fi

echo "🚀 Deploying Grud to ${SERVER_USER}@${SERVER_IP}:${DEPLOY_PATH}..."

# 1. Create directory on server
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${DEPLOY_PATH}"

# 2. Sync files (excluding unnecessary ones)
echo "📦 Syncing files..."
rsync -avz --exclude '.git' \
           --exclude 'node_modules' \
           --exclude 'backend/node_modules' \
           --exclude 'frontend/node_modules' \
           --exclude 'frontend/dist' \
           --exclude 'backend/logs/*' \
           ./ ${SERVER_USER}@${SERVER_IP}:${DEPLOY_PATH}/

# 3. Handle environment file
if [ -f "$ENV_FILE" ]; then
  echo "🔐 Copying $ENV_FILE to server as .env.docker..."
  scp $ENV_FILE ${SERVER_USER}@${SERVER_IP}:${DEPLOY_PATH}/.env.docker
else
  echo "⚠️  Warning: $ENV_FILE not found locally. Ensure .env.docker exists on the server."
fi

# 4. Run Docker Compose on server
echo "🐳 Restarting containers on server..."
ssh ${SERVER_USER}@${SERVER_IP} "cd ${DEPLOY_PATH} && docker compose pull && docker compose up -d --remove-orphans"

echo "✅ Deployment complete!"
echo "📍 Access your app at http://${SERVER_IP}:5173"
echo "📍 API docs at http://${SERVER_IP}:8000/v1/docs"
