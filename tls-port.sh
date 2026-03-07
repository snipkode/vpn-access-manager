#!/bin/bash

CONFIG="/etc/stunnel/stunnel.conf"
PEM="/etc/stunnel/stunnel.pem"
DOMAIN=""
EMAIL=""

################################
# HELP
################################

help() {

echo ""
echo "TLS-PORT DevOps CLI"
echo ""
echo "Commands:"
echo ""
echo " add-auto        Auto deploy PM2 app with nginx + SSL"
echo " pm2-list        Show running PM2 apps"
echo " list            List TLS ports"
echo " remove          Remove TLS port"
echo " test            Test TLS port"
echo " renew           Renew LetsEncrypt"
echo ""
echo "Options:"
echo " --domain example.com"
echo " --email admin@example.com"
echo " --port 4000"
echo " --target 3000"
echo ""
exit 0
}

################################
# CONFIRM
################################

confirm() {

read -p "$1 (y/n): " c
if [[ "$c" != "y" ]]; then
 echo "Cancelled"
 exit 1
fi

}

################################
# DEPENDENCY CHECK
################################

check_dep() {

echo "Running preflight..."

if ! command -v node &> /dev/null
then
 confirm "NodeJS missing. Install?"
 curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
 apt install -y nodejs
fi

if ! command -v npm &> /dev/null
then
 apt install -y npm
fi

if ! command -v pm2 &> /dev/null
then
 confirm "PM2 missing. Install?"
 npm install -g pm2
 pm2 startup
fi

if ! command -v nginx &> /dev/null
then
 confirm "Install nginx?"
 apt install -y nginx
fi

if ! command -v certbot &> /dev/null
then
 confirm "Install certbot?"
 apt install -y certbot python3-certbot-nginx
fi

if ! command -v jq &> /dev/null
then
 apt install -y jq
fi

if ! command -v lsof &> /dev/null
then
 apt install -y lsof
fi

if ! command -v nc &> /dev/null
then
 apt install -y netcat
fi

if ! command -v stunnel &> /dev/null
then
 confirm "Install stunnel4?"
 apt install -y stunnel4
fi

echo "Preflight done"

}

################################
# PM2 LIST
################################

pm2_list() {

echo ""
echo "PM2 Apps"
echo "----------------"

pm2 jlist | jq -r '.[] | "\(.pm_id)) \(.name)"'

}

################################
# DETECT PORT
################################

detect_port() {

PORT=$(lsof -i -P -n | grep LISTEN | grep node | awk '{print $9}' | cut -d: -f2 | head -n1)

echo "Detected Node port: $PORT"

}

################################
# NGINX SETUP
################################

nginx_setup() {

CONF="/etc/nginx/sites-available/$SUBDOMAIN"

cat > $CONF <<EOF
server {

listen 80;
server_name $SUBDOMAIN;

location / {

proxy_pass http://127.0.0.1:$TARGET;

proxy_http_version 1.1;
proxy_set_header Upgrade \$http_upgrade;
proxy_set_header Connection 'upgrade';
proxy_set_header Host \$host;
proxy_cache_bypass \$http_upgrade;

}

}
EOF

ln -s $CONF /etc/nginx/sites-enabled/ 2>/dev/null

nginx -t && systemctl reload nginx

}

################################
# ENABLE SSL
################################

enable_ssl() {

certbot --nginx \
-d $SUBDOMAIN \
--non-interactive \
--agree-tos \
-m $EMAIL

}

################################
# CRON RENEW
################################

setup_cron() {

CRON="0 3 * * * certbot renew --quiet"

(crontab -l 2>/dev/null | grep -v certbot; echo "$CRON") | crontab -

}

################################
# STUNNEL TLS PORT
################################

add_tls_port() {

CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"

cat $CERT $KEY > $PEM

chmod 600 $PEM

if grep -q "accept = $PORT" $CONFIG
then
 echo "TLS port already exists"
 exit
fi

cat >> $CONFIG <<EOF

[https-$PORT]
accept = $PORT
connect = 127.0.0.1:$TARGET
cert = $PEM

EOF

sed -i 's/ENABLED=0/ENABLED=1/g' /etc/default/stunnel4

systemctl restart stunnel4

echo "TLS port ready"
echo "https://$DOMAIN:$PORT"

}

################################
# AUTO DEPLOY
################################

auto_deploy() {

check_dep

pm2_list

echo ""
read -p "Select PM2 ID: " ID

detect_port

read -p "Node port [$PORT]: " TARGET

if [[ -z "$TARGET" ]]; then
 TARGET=$PORT
fi

read -p "Subdomain name: " SUB

SUBDOMAIN="$SUB.$DOMAIN"

echo ""
echo "Deploy config"
echo "Domain: $SUBDOMAIN"
echo "Node port: $TARGET"
echo ""

confirm "Continue?"

nginx_setup

enable_ssl

setup_cron

echo ""
echo "Deployment ready:"
echo "https://$SUBDOMAIN"

}

################################
# LIST TLS
################################

list_tls() {

echo ""
echo "TLS Ports"
echo "----------"

grep accept $CONFIG 2>/dev/null

}

################################
# REMOVE TLS
################################

remove_tls() {

confirm "Remove TLS port $PORT?"

sed -i "/https-$PORT/,+3d" $CONFIG

systemctl restart stunnel4

echo "Removed"

}

################################
# TEST PORT
################################

test_port() {

echo "Testing port $PORT"

if nc -zv localhost $PORT
then
 echo "Port open"
else
 echo "Port closed"
fi

}

################################
# RENEW
################################

renew_ssl() {

confirm "Renew all LetsEncrypt certs?"

certbot renew

systemctl reload nginx

}

################################
# ARG PARSER
################################

CMD=$1
shift

while [[ "$#" -gt 0 ]]; do
 case $1 in
  --domain) DOMAIN="$2"; shift ;;
  --email) EMAIL="$2"; shift ;;
  --port) PORT="$2"; shift ;;
  --target) TARGET="$2"; shift ;;
 esac
 shift
done

################################
# COMMAND EXEC
################################

case $CMD in

add-auto)
 auto_deploy
 ;;

pm2-list)
 pm2_list
 ;;

list)
 list_tls
 ;;

remove)
 remove_tls
 ;;

test)
 test_port
 ;;

renew)
 renew_ssl
 ;;

*)
 help
 ;;

esac
