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

### Slack: Simple “send approval message” setup (n8n 2.16.1)

This repo’s “human approval” flow uses a **simple Slack message + Wait (webhook resume)** pattern:

- **Slack** posts an approval question into a channel with 2 links:
  - Override: `...$execution.resumeUrl?decision=Override`
  - Cancel: `...$execution.resumeUrl?decision=Cancel`
- **Wait** pauses execution until one of those links is clicked
- An **If** node checks `decision === "Override"` and (if true) deletes + re-copies the template

**Workflow**

- **workflow id**: `Tzn53YVSiK2wGIh7`
- **approval channel id**: `C0AUV3DGWQK`

#### 1) Create a Slack app + get the correct token

You must use a **Bot User OAuth Token** (`xoxb-...`). Do **not** use an app-level token (`xapp-...`) for posting messages.

In Slack:

1. Go to Slack apps: `https://api.slack.com/apps`
2. Select your app (or create one)
3. Go to **OAuth & Permissions**
4. Under **Bot Token Scopes**, add:
   - `chat:write`
   - `conversations:read` (or `channels:read`)
   - Optional (only if you want to post to channels without inviting the bot): `chat:write.public`
5. Click **Install to Workspace** (or **Reinstall**) so the scopes take effect
6. Copy **Bot User OAuth Token** (starts with **`xoxb-`**)

Then, in the target Slack channel (the one with id `C0AUV3DGWQK`), invite the app/bot to the channel:

```text
/invite @YourAppName
# (or /invite @YourBotName — either works depending on how Slack shows it)
```

#### 2) Create the n8n credential (token-based)

In n8n:

1. Go to **Credentials**
2. Create a **Slack** credential that accepts a token (often shown as “Slack API” / type `slackApi`)
3. Paste the **`xoxb-...`** token
4. Save

Then open the workflow node `Notify Slack (Approval Needed)` and select that credential.

#### 3) Configure the Slack node (simplest)

In the Slack node:

- **Resource**: Message
- **Operation**: Send
- **Channel ID**: `C0AUV3DGWQK`
- **Text**: includes the two resume links built from `$execution.resumeUrl`

#### Common errors we hit (and fixes)

- **OAuth: `error=access_denied`**
  - Meaning: the OAuth authorization was cancelled/denied on Slack’s side, or blocked by workspace policy.
  - Fix: click “Allow”, ensure you’re in the correct workspace, or have an admin allow the app.

- **OAuth: “problem generating the authorization URL” + HTTP `431`**
  - Meaning: **request headers too large**, usually due to oversized cookies for the n8n domain (especially `localhost`).
  - Fix: try Incognito, clear cookies/site data for your n8n URL, or try another browser. If behind a reverse proxy, increase header limits.

- **Slack API: `not_allowed_token_type`**
  - Meaning: you used a token Slack won’t accept for posting messages (commonly **`xapp-...`**).
  - Fix: use a **bot token** (`xoxb-...`) with `chat:write`, reinstall the app after adding scopes.

- **Slack API: `channel_not_found`**
  - Meaning: the bot token can’t “see” the channel (wrong workspace, private channel, or bot not invited).
  - Fix: invite the bot to the channel (`/invite @YourBotName`) and ensure the token/workspace matches the channel id.

## Security Notes

- Secure keys (e.g., `N8N_ENCRYPTION_KEY`, passwords, auth credentials) are stored in your **LastPass**.
- This setup is configured for **local development only**
- For production, consider:
  - Using HTTPS/TLS (via reverse proxy)
  - Stronger authentication mechanisms
  - Regular database backups
  - Network isolation
