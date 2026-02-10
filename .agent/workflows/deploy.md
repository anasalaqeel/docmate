---
description: How to deploy Grud to a remote server via SSH
---

# SSH Deployment Workflow

This workflow guides you through deploying the Grud application to a remote Linux server using SSH
and Docker Compose.

## Prerequisites

1. A remote server with **Docker** and **Docker Compose** installed.
2. SSH access to the server (preferably via SSH keys).
3. `rsync` installed on your local machine.

## Steps

### 1. Configure the Server

Ensure your server is ready:

- Docker is running.
- Port `8000` (API) and `5173` (Frontend) are open in the firewall.

### 2. Prepare Environment Variables

Make sure you have a `.env.docker` file in the root directory with production-ready values (secure
passwords, correct database URLs).

### 3. Run Deployment Script

The easiest way is to use the included deployment script:

```bash
# Set your server IP and run the script
SERVER_IP=your_server_ip SERVER_USER=your_user ./scripts/deploy.sh
```

### 4. Manual Deployment (Alternative)

If you prefer manual steps:

1. **Copy files**:

   ```bash
   rsync -avz --exclude 'node_modules' ./ user@ip:/opt/grud
   ```

2. **Login to server**:

   ```bash
   ssh user@ip
   ```

3. **Start services**:
   ```bash
   cd /opt/grud
   docker compose up -d
   ```

## Post-Deployment

- Verify health: `docker compose ps` on the server.
- Check logs: `docker compose logs -f`
