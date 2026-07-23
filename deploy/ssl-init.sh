#!/bin/sh
# Première obtention du certificat Let's Encrypt pour ahmedmarketer.com.
# À lancer UNE FOIS sur le serveur, après avoir pointé le DNS et rempli .env :
#   ./deploy/ssl-init.sh votre-email@exemple.com
# (un certificat de démarrage auto-signé permet à nginx de démarrer,
#  puis il est remplacé par le vrai certificat)
set -e

DOMAIN="ahmedmarketer.com"
EMAIL="${1:?Usage : ./deploy/ssl-init.sh votre-email@exemple.com}"
DIR="$(cd "$(dirname "$0")" && pwd)"
CONF="$DIR/certbot/conf"
WWW="$DIR/certbot/www"
LIVE="$CONF/live/$DOMAIN"

mkdir -p "$LIVE" "$WWW"

if [ ! -f "$LIVE/fullchain.pem" ]; then
  echo "→ Certificat provisoire auto-signé (démarrage de nginx)…"
  docker run --rm -v "$CONF:/etc/letsencrypt" alpine/openssl req -x509 -nodes \
    -newkey rsa:2048 -days 2 \
    -keyout "/etc/letsencrypt/live/$DOMAIN/privkey.pem" \
    -out "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" \
    -subj "/CN=$DOMAIN"
fi

echo "→ Démarrage de la pile…"
docker compose up -d --build

echo "→ Attente de nginx…"
sleep 5

echo "→ Suppression du certificat provisoire et demande du certificat réel…"
rm -rf "$LIVE" "$CONF/archive/$DOMAIN" "$CONF/renewal/$DOMAIN.conf"
docker compose run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  --email "$EMAIL" --agree-tos --no-eff-email

echo "→ Rechargement de nginx…"
docker compose exec nginx nginx -s reload

echo "✓ HTTPS actif : https://$DOMAIN"
echo "  Le renouvellement est automatique (service certbot)."
