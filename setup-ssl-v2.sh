#!/bin/bash

# Configuration
DOMAIN="kanghan.site"
PORT=3004
EMAIL="totayk186@gmail.com"

echo "⏳ Waiting for rate limit (safe buffer)..."
# We won't actually sleep 3 mins here to avoid freezing the terminal, 
# but the user should wait before running this.

# 1. Prepare Webroot
sudo mkdir -p /var/www/letsencrypt
sudo chown -R www-data:www-data /var/www/letsencrypt

# 2. Reset Nginx to HTTP-Only (Clean Slate)
echo "📝 Resetting Nginx config..."
cat <<EOF | sudo tee /etc/nginx/sites-available/$DOMAIN
server {
    listen 80;
    server_name $DOMAIN;

    # Priority: ACME Challenge (No Redirects, No Proxy)
    location ^~ /.well-known/acme-challenge/ {
        default_type "text/plain";
        root /var/www/letsencrypt;
        allow all;
    }

    # Proxy everything else
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

# 3. Enable & Restart Nginx
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
echo "🔄 Restarting Nginx..."
sudo systemctl restart nginx

# 4. Request SSL (Webroot Mode)
echo "🔒 Requesting SSL Certificate (Webroot)..."
# Using --force-renewal only if needed, but standard run is fine
sudo certbot certonly --webroot -w /var/www/letsencrypt -d $DOMAIN --non-interactive --agree-tos -m $EMAIL

# 5. Apply HTTPS Config (Only if successful)
if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
    echo "✅ Monitor: SSL obtained. Updating Nginx to HTTPS..."
    cat <<EOF | sudo tee /etc/nginx/sites-available/$DOMAIN
server {
    listen 80;
    server_name $DOMAIN;
    
    # Allow ACME on HTTP
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }

    # Redirect others to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name $DOMAIN;

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
    sudo systemctl reload nginx
    echo "🎉 HTTPS Setup Complete!"
else
    echo "❌ SSL Request failed. Nginx is running in HTTP mode."
fi
