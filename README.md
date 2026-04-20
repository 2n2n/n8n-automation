# n8n Docker Setup with PostgreSQL

This directory contains a Docker Compose setup for running n8n locally with PostgreSQL.

## Quick Start

1. **Environment file:**
   The `.env` file is already created with secure defaults. If you need to regenerate it:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and set:
   - `POSTGRES_PASSWORD`: A strong password for PostgreSQL
   - `N8N_ENCRYPTION_KEY`: A long random string (at least 32 characters). Generate one with:
     ```bash
     openssl rand -base64 32
     ```
   - `N8N_BASIC_AUTH_USER` and `N8N_BASIC_AUTH_PASSWORD`: Credentials for accessing the n8n UI

2. **Ensure Docker Desktop is running:**
   Make sure Docker Desktop is started and running on your Mac.

3. **Start the services:**

   ```bash
   ./start.sh
   ```

   Or manually:

   ```bash
   docker compose up -d
   ```

4. **Check service status:**

   ```bash
   docker compose ps
   ```

5. **View logs:**

   ```bash
   docker compose logs -f n8n
   ```

6. **Access n8n UI:**
   Open http://localhost:5678 in your browser and log in with your basic auth credentials.

## Stopping Services

```bash
docker compose down
```

To remove volumes (⚠️ **WARNING**: This deletes all data):

```bash
docker compose down -v
```

## Services

- **n8n**: Workflow automation engine (port 5678)
- **postgres**: PostgreSQL 16 database for n8n metadata and workflows

## Volumes

- `n8n_data`: Stores n8n configuration and local files
- `n8n_postgres_data`: PostgreSQL data directory

## Troubleshooting

### Docker Credential Helper Error

If you see an error like `error getting credentials`, this is a macOS keychain issue. Try:

1. Restart Docker Desktop
2. Or configure Docker to skip credential helpers for public registries:
   ```bash
   mkdir -p ~/.docker
   echo '{"credsStore":""}' > ~/.docker/config.json
   ```

### Services Won't Start

- Ensure Docker Desktop is running: `docker info`
- Check logs: `docker compose logs`
- Verify `.env` file exists and has all required variables

## Security Notes

- Secure keys (e.g., `N8N_ENCRYPTION_KEY`, passwords, auth credentials) are stored in your **LastPass**.
- This setup is configured for **local development only**
- For production, consider:
  - Using HTTPS/TLS (via reverse proxy)
  - Stronger authentication mechanisms
  - Regular database backups
  - Network isolation
