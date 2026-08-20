#!/bin/sh
# Mise à jour du site en production. Sur le serveur :
#   cd /root/ahmedmarketer && ./deploy/update.sh
#
# Le `docker builder prune` final n'est pas optionnel : chaque build ajoute
# environ 3 Go de cache, et c'est ce cumul (avec les dumps) qui avait rempli le
# disque. Purger ici évite d'avoir à y penser.
set -e
cd /root/ahmedmarketer

echo '⏳ Récupération du code…'
git pull

echo '⏳ Construction de l’image…'
docker compose build app

echo '⏳ Redémarrage…'
docker compose up -d app

echo '⏳ Purge du cache de build Docker…'
docker builder prune -af >/dev/null

echo '⏳ Vérification…'
sleep 15
docker compose ps
code=$(curl -s -o /dev/null -w '%{http_code}' https://ahmedmarketer.com/)
echo "Page d'accueil : HTTP $code"
df -h /
[ "$code" = '200' ] || { echo '✗ Le site ne répond pas correctement !' >&2; exit 1; }
echo '✓ Déployé.'
