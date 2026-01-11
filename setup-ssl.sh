#!/bin/bash

# Configuration
DOMAIN="kanghan.site"
PORT=3004
EMAIL="totayk186@gmail.com"

echo "🔍 Diagnosis & Cleanup..."

# 1. Force Stop Nginx and any process on Port 80
echo "🛑 Killing Nginx and Port 80 processes..."
sudo systemctl stop nginx
sudo killall nginx 2>/dev/null
sudo fuser -k 80/tcp 2>/dev/null

# 2. Wait a moment
sleep 3

# 3. Check if Port 80 is truly free
if sudo lsof -i :80; then
    echo "❌ Port 80 is STILL in use by:"
    sudo lsof -i :80
    echo "Please kill this process manually and try again."
    exit 1
fi

echo "✅ Port 80 is free."

# 4. Request SSL (Standalone)
echo "🔒 Requesting SSL Certificate (Standalone)..."
sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos -m $EMAIL

# 5. Create Final Nginx Config
if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
    echo "✅ SSL obtained! Creating config..."
    cat <<EOF | sudo tee /etc/nginx/sites-available/$DOMAIN
server {
    server_name $DOMAIN;
    listen 80;
    return 301 https://\$host\$request_uri;
}

server {
    server_name $DOMAIN;
    listen 443 ssl;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    
    sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
    sudo systemctl start nginx
    echo "🎉 Success! https://$DOMAIN is live."
else
    echo "⚠️ SSL Failed. Nginx will be restarted without SSL for now."
    sudo systemctl start nginx
fi
