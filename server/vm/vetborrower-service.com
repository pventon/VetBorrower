# This is the nginx configuration file for the Vet Borrower application.
# Copy this file to the following location on the server
#
# /etc/nginx/sites-available/vetborrower-service.com
#
# After making a change, use the following to test the configuration:
#
# $> sudo nginx -t
#
# Reload the NGINX server:
#
# $> sudo systemctl reload nginx

# HTTPS Server Block
server {
    server_name vetborrower.com www.vetborrower.com;

    # Added to increase the allowed upload file size
    client_max_body_size 20M;

    location / {

        # This sets the network to use IP V4
        proxy_pass http://localhost:9195;
        # This set the network to use IP V6
        # proxy_pass http://[::1]:9195;

        # Whitelist...
      	#allow xxx.xxx.xxx.xxx;

        # Block everything else
        #deny all;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # ADDED 11/03/2025: upstream keep-alive + longer timeouts to mitigate 504 errors ----
        # proxy_http_version 1.1;           # keep upstream connections alive
        # proxy_set_header Connection "";   # required for upstream keep-alive
        # proxy_connect_timeout 5s;         # upstream TCP connect
        # proxy_send_timeout    120s;       # send request body to upstream
        # proxy_read_timeout    420s;       # wait for upstream response (primary 504 guard)
        # send_timeout          120s;       # client read timeout
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/vetborrower.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/vetborrower.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

# HTTP to HTTPS redirect for both domains
server {
    listen 80;
    server_name vetborrower.com www.vetborrower.com;
    return 301 https://$host$request_uri;
}
