#!/bin/bash

# Configuration
DOMAIN="kanghan.site"
PORT=3004
EMAIL="admin@kanghan.site"

# 1. Update and Install Nginx & Certbot
echo "🔧 Installing Nginx and Certbot..."
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx

# 2. Create webroot directory for challenges
sudo mkdir -p /var/www/letsencrypt

# 3. Create Nginx Configuration
echo "📝 Creating Nginx configuration for $DOMAIN..."
cat <<EOF | sudo tee /etc/nginx/sites-available/$DOMAIN
server {
    server_name $DOMAIN;

    # Handle ACME Challenge locally (Bypass Proxy)
    location ^~ /.well-known/acme-challenge/ {
        default_type "text/plain";
        root /var/www/letsencrypt;
    }

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

# 4. Enable Site
echo "🔗 Enabling site..."
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# 5. Test and Reload Nginx
echo "🔄 Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

# 6. Request SSL Certificate (Using Webroot Mode)
echo "🔒 Requesting SSL Certificate from Let's Encrypt..."
sudo certbot certonly --webroot -w /var/www/letsencrypt -d $DOMAIN --non-interactive --agree-tos -m $EMAIL

# 7. Update Nginx Config to use SSL (if cert exists)
if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
    echo "✅ SSL Certificate obtained! Updating Nginx config..."
    cat <<EOF | sudo tee /etc/nginx/sites-available/$DOMAIN
server {
    server_name $DOMAIN;

    # Redirect HTTP to HTTPS
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
    sudo nginx -t && sudo systemctl reload nginx
    echo "🎉 Successfully configured HTTPS for $DOMAIN"
else
    echo "⚠️  SSL Certificate request failed. Please check the error logs."
fi
