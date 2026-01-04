# Monke Bar Deployment Guide

This application is configured for automated deployment to a VPS using GitHub Actions.

## Required GitHub Secrets

Before deploying, configure the following secrets in your GitHub repository (Settings → Secrets and variables → Actions):

### Server Access

- `SERVER_IP` - Your VPS IP address or domain
- `DEPLOY_USER` - SSH username for deployment (e.g., `root` or dedicated deploy user)
- `DEPLOY_SSH_KEY` - Private SSH key for server authentication

### Application Configuration

- `GOOGLE_CLIENT_ID` - Google OAuth client ID for authentication
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `BETTER_AUTH_SECRET` - Random secret for better-auth session signing (generate with `openssl rand -base64 32`)
- `DOMAIN` - Your application domain (e.g., `strong.monkebrain.com`)
- `FRONTEND_URL` - Full frontend URL (e.g., `https://strong.monkebrain.com`)
- `ACME_EMAIL` - Email for Let's Encrypt SSL certificates

## Deployment Process

1. **Push to main branch** triggers automatic deployment
2. **Workflow dispatch** allows manual deployment from GitHub Actions tab
3. **Release published** triggers deployment when you create a release

### What Happens During Deployment

1. Builds Docker images for API and Web applications
2. Pushes images to GitHub Container Registry (ghcr.io)
3. Copies docker-compose.prod.yml to VPS
4. Connects to VPS via SSH
5. Creates `.env` file with secrets
6. Pulls latest images
7. Runs database migrations
8. Starts all services with Traefik reverse proxy
9. Automatically provisions SSL certificates

## Local Production Testing

Test the production setup locally:

```bash
# Set environment variables in .env file
cp .env.example .env  # Create if needed

# Build and run production stack
docker compose -f docker-compose.prod.yml up --build
```

## Server Setup Requirements

Your VPS should have:

- Docker and Docker Compose installed
- Port 80 and 443 open for HTTP/HTTPS
- SSH access configured

### First-Time Server Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Add deploy user to docker group (if not using root)
usermod -aG docker $DEPLOY_USER

# Create deployment directory
mkdir -p /opt/monke-bar
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Sheets API and Google Drive API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://strong.monkebrain.com/api/auth/callback/google`
6. Copy Client ID and Client Secret to GitHub secrets

## Traefik & SSL

The setup includes Traefik as a reverse proxy with automatic SSL:

- Automatically redirects HTTP to HTTPS
- Provisions Let's Encrypt certificates
- Handles routing for API (`/api/*`) and Web app
- Certificates stored in Docker volume for persistence

## Troubleshooting

### View logs on server

```bash
ssh user@server
cd /opt/monke-bar
docker compose -f docker-compose.prod.yml logs -f
```

### Check running containers

```bash
docker ps
```

### Restart services

```bash
docker compose -f docker-compose.prod.yml restart
```

### Force rebuild and redeploy

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```
