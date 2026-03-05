# OpenClaw Mini App - Security Options

## Option 1: Telegram-Only (Already Implemented)
✅ The Mini App now checks for Telegram WebApp and shows "Access Denied" if opened directly in browser.

## Option 2: Add Password Protection (Basic Auth)

Run these commands to add a password:

```bash
# Create password file (you'll be prompted for password)
sudo htpasswd -c /etc/nginx/.htpasswd admin

# Update nginx config
cat > /etc/nginx/sites-available/openclaw-miniapp << 'EOF'
server {
    listen 80;
    server_name claw.orbies.dev;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name claw.orbies.dev;

    ssl_certificate /etc/letsencrypt/live/claw.orbies.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/claw.orbies.dev/privkey.pem;

    # Password protection
    auth_basic "Restricted Access";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        root /var/www/openclaw-miniapp;
        try_files $uri $uri/ /index.html;
        gzip on;
    }

    location /api/status {
        proxy_pass http://127.0.0.1:3001/status;
        auth_basic off;  # Optional: allow status without auth
    }

    location /api/message {
        proxy_pass http://127.0.0.1:3001/message;
    }
}
EOF

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx
```

## Option 3: IP Whitelisting (Your IP Only)

```nginx
server {
    listen 443 ssl http2;
    server_name claw.orbies.dev;

    # Allow only your IP
    allow YOUR_IP_ADDRESS;
    deny all;

    # ... rest of config
}
```

## Option 4: Tailscale (Private Network)

Install Tailscale and bind to Tailscale interface only:

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Then use your Tailscale IP in Telegram bot
```

## Option 5: Cloudflare Access (Zero Trust)

If using Cloudflare:
1. Enable Cloudflare Access
2. Add email/OTP authentication
3. Visitors must authenticate before seeing the Mini App

## Recommendation

For your use case, **Option 1 (Telegram-only)** + **Option 2 (Basic Auth)** gives good protection:
- Casual visitors see "Access Denied"
- Even if they know the URL, they need the password
- Telegram Mini App works normally (auth happens before page loads)

Want me to set up basic auth with a password you choose?