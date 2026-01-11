#!/bin/bash

# Configuration
DOMAIN="kanghan.site"
PORT=3004
EMAIL="totayk186@gmail.com"

echo "🧹 Starting Clean Slate Setup..."

# 1. Force Clean Ports
echo "🛑 Stopping all web servers..."
sudo systemctl stop nginx
sudo killall -9 nginx 2>/dev/null
sudo fuser -k 80/tcp 2>/dev/null
sudo fuser -k 443/tcp 2>/dev/null

# 2. Cleanup Old Configs
sudo rm -f /etc/nginx/sites-enabled/$DOMAIN
sudo rm -f /etc/nginx/sites-available/$DOMAIN

# 3. Prepare Challenge Directory
sudo mkdir -p /var/www/letsencrypt
sudo chown -R www-data:www-data /var/www/letsencrypt

# 4. Create TEMPORARY Minimal Config (Validation Only)
# No Proxy, No Redirects, Just Files
echo "📝 Creating Validation Config..."
cat <<EOF | sudo tee /etc/nginx/sites-available/$DOMAIN
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        root /var/www/letsencrypt;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# 5. Start Nginx
echo "▷ Starting Minimal Nginx..."
sudo systemctl start nginx

# 6. Request Cert
echo "🔒 Requesting Certificate..."
sudo certbot certonly --webroot -w /var/www/letsencrypt -d $DOMAIN --non-interactive --agree-tos -m $EMAIL

# 7. Final Configuration (If Verify Success)
if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
    echo "✅ Certificate Received! Building Final Config..."
    
    cat <<EOF | sudo tee /etc/nginx/sites-available/$DOMAIN
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
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
    
    echo "🔄 Reloading Nginx with HTTPS..."
    sudo systemctl reload nginx
    echo "🎉 DONE! https://$DOMAIN is live."
else
    echo "❌ Certificate request failed. Please check logs."
    # Restore minimal config or leave as is for debug
fi
