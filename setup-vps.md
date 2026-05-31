# UCCD VPS Setup

Production domain: `omniresol.me`

Recommended VPS layout:

```text
/opt/uccd              # project root
/opt/uccd/.env         # backend production env
/opt/uccd/.venv        # Python virtualenv
/opt/uccd/frontend     # Next.js frontend
```

Runtime layout:

```text
Nginx public 80/443 -> Next.js 127.0.0.1:3000
Nginx /api/*       -> FastAPI 127.0.0.1:8000
Nginx websocket    -> FastAPI 127.0.0.1:8000/api/v1/ws/*
Docker             -> Redis, Kafka, Zookeeper
systemd            -> uccd-api, uccd-frontend
```

## 1. DNS

At the domain/DNS provider, use DNS-only/non-proxied records:

```text
A     @      YOUR_VPS_IP
A     www    YOUR_VPS_IP
```

Verify on the VPS:

```bash
dig +short omniresol.me
dig +short www.omniresol.me
```

Both should return the VPS IP.

## 2. Install System Packages

Azure images usually log in as `azureuser`, so use `sudo`.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx certbot python3-certbot-nginx python3.11-venv python3-pip docker.io docker-compose-plugin curl build-essential
sudo systemctl enable --now docker nginx
```

Install Node.js 22:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:

```bash
node -v
npm -v
docker --version
sudo systemctl status nginx --no-pager
```

Optional: allow `azureuser` to run Docker without `sudo`.

```bash
sudo usermod -aG docker azureuser
newgrp docker
```

If you skip this, use `sudo docker ...` commands.

## 3. Put Project on VPS

```bash
sudo mkdir -p /opt/uccd
sudo chown -R azureuser:azureuser /opt/uccd
cd /opt/uccd
git clone YOUR_REPO_URL .
```

If not using Git, upload the project folder contents into `/opt/uccd`.

## 4. Create Production Env

```bash
nano /opt/uccd/.env
```

Minimum production shape:

```env
POSTGRES_URL=your_postgres_url
POSTGRES_SSLMODE=require

REDIS_PASSWORD=change_this_redis_password
REDIS_URL=redis://:change_this_redis_password@localhost:6379/0
KAFKA_BOOTSTRAP_SERVERS=localhost:9093

SECRET_KEY=change_this_to_long_random_secret
JWT_SECRET=change_this_to_long_random_secret
JWT_ALG=HS256
JWT_EXPIRES_MINUTES=720

API_HOST=https://omniresol.me
CORS_ORIGINS=https://omniresol.me,https://www.omniresol.me

GROQ_API_KEY=your_groq_key
SARVAM_ACCESS_TOKEN=your_sarvam_key

INSTAGRAM_USERNAME=your_bot_username
INSTAGRAM_PASSWORD=your_bot_password
INSTAGRAM_SESSION_FILE=instagram_session.json
INSTAGRAM_VERIFICATION_HANDLER=console

TELEGRAM_BOT_TOKEN=
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
EMAIL_FROM_ADDRESS=support@omniresol.me
MAILGUN_INBOUND_WEBHOOK_KEY=
EMAIL_COMPLAINTS_CONVERSATION_MODE=false

OPENWA_BASE_URL=http://localhost:8081
# Fill this after OpenWA starts once. See "Optional WhatsApp/OpenWA Setup".
OPENWA_API_KEY=
OPENWA_WEBHOOK_URL=https://omniresol.me/api/v1/webhooks/whatsapp
```

## 5. Start Redis and Kafka

```bash
cd /opt/uccd
docker compose up -d zookeeper kafka redis
```

If Docker permission is not configured:

```bash
sudo docker compose up -d zookeeper kafka redis
```

Check:

```bash
docker compose ps
```

## 5A. Optional WhatsApp/OpenWA Setup

Skip this section if you are not using WhatsApp yet.

OpenWA generates an API key on first startup and saves it in the mounted data directory:

```text
/opt/uccd/openwa-data/.api-key
```

Start OpenWA:

```bash
cd /opt/uccd
docker compose up -d openwa
```

If Docker permission is not configured:

```bash
sudo docker compose up -d openwa
```

Read the generated API key:

```bash
sudo cat /opt/uccd/openwa-data/.api-key
```

You can also inspect the startup logs:

```bash
sudo docker compose logs openwa | grep -i "API Key" -A 3
```

Now edit `/opt/uccd/.env` and set:

```env
OPENWA_API_KEY=owa_k1_the_generated_key_here
OPENWA_BASE_URL=http://localhost:8081
OPENWA_WEBHOOK_URL=https://omniresol.me/api/v1/webhooks/whatsapp
```

The key should stay stable as long as this directory is kept:

```text
/opt/uccd/openwa-data
```

Do not delete `openwa-data` after pairing WhatsApp, otherwise OpenWA may generate a new API key and lose session data.

Start the OpenWA dashboard (accessible at `https://omniresol.me/openwa-dashboard/`):

```bash
cd /opt/uccd/openwa
docker compose --profile full up -d
```

If Docker permission is not configured:

```bash
sudo docker compose --profile full up -d
```

Verify the dashboard is running:

```bash
curl -s http://127.0.0.1:2886/ | head -5
```

## 6. Backend Setup

```bash
cd /opt/uccd
python3.11 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python scripts/seed_users.py
python scripts/setup_instagram_session.py
```

Enter Instagram OTP in the console if prompted. A successful run saves:

```text
/opt/uccd/instagram_session.json
```

Quick backend test:

```bash
. /opt/uccd/.venv/bin/activate
uvicorn api.main:app --host 127.0.0.1 --port 8000
```

In another SSH session:

```bash
curl http://127.0.0.1:8000/api/health
```

Stop the manual `uvicorn` with `Ctrl+C`.

## 7. Frontend Build

```bash
cd /opt/uccd/frontend
npm install
BACKEND_URL=http://127.0.0.1:8000 NEXT_PUBLIC_WS_BASE_URL=wss://omniresol.me/api/v1 npm run build
```

## 8. systemd Backend Service

```bash
sudo nano /etc/systemd/system/uccd-api.service
```

Paste:

```ini
[Unit]
Description=UCCD FastAPI Backend
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=azureuser
WorkingDirectory=/opt/uccd
EnvironmentFile=/opt/uccd/.env
ExecStart=/opt/uccd/.venv/bin/python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now uccd-api
sudo systemctl status uccd-api --no-pager
```

Logs:

```bash
sudo journalctl -u uccd-api -f
```

## 9. systemd Frontend Service

```bash
sudo nano /etc/systemd/system/uccd-frontend.service
```

Paste:

```ini
[Unit]
Description=UCCD Next.js Frontend
After=network.target uccd-api.service
Requires=uccd-api.service

[Service]
Type=simple
User=azureuser
WorkingDirectory=/opt/uccd/frontend/.next/standalone
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=BACKEND_URL=http://127.0.0.1:8000
Environment=NEXT_PUBLIC_WS_BASE_URL=wss://omniresol.me/api/v1
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now uccd-frontend
sudo systemctl status uccd-frontend --no-pager
```

Logs:

```bash
sudo journalctl -u uccd-frontend -f
```

## 10. Nginx Config

```bash
sudo nano /etc/nginx/sites-available/omniresol.me
```

Paste:

```nginx
server {
    listen 80;
    server_name omniresol.me www.omniresol.me;

    location /openwa-dashboard/ {
        proxy_pass http://127.0.0.1:2886/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/v1/ws/ {
        proxy_pass http://127.0.0.1:8000/api/v1/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/omniresol.me /etc/nginx/sites-enabled/omniresol.me
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 11. SSL

```bash
sudo certbot --nginx -d omniresol.me -d www.omniresol.me
```

Choose redirect HTTP to HTTPS.

Verify renewal:

```bash
sudo certbot renew --dry-run
```

## 12. Final Verify

```bash
curl https://omniresol.me/api/health
sudo systemctl status uccd-api --no-pager
sudo systemctl status uccd-frontend --no-pager
docker compose -f /opt/uccd/docker-compose.yml ps
```

Open:

```text
https://omniresol.me
```

## 13. Deploy Updates Later

```bash
cd /opt/uccd
git pull
. .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head

cd /opt/uccd/frontend
npm install
BACKEND_URL=http://127.0.0.1:8000 NEXT_PUBLIC_WS_BASE_URL=wss://omniresol.me/api/v1 npm run build

sudo systemctl restart uccd-api uccd-frontend
```

## 14. Useful Debug Commands

Backend logs:

```bash
sudo journalctl -u uccd-api -f
```

Frontend logs:

```bash
sudo journalctl -u uccd-frontend -f
```

Nginx logs:

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

Docker services:

```bash
cd /opt/uccd
docker compose ps
docker compose logs -f kafka
docker compose logs -f redis
```

Restart everything:

```bash
sudo systemctl restart uccd-api uccd-frontend nginx
cd /opt/uccd && docker compose restart zookeeper kafka redis
```
