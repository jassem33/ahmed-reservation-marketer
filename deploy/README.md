# Déploiement — ahmedmarketer.com

Pile de production : **Docker Compose** avec PostgreSQL 16, l'application
Next.js (image autonome), **nginx** en proxy inverse HTTPS et **certbot**
(certificats Let's Encrypt renouvelés automatiquement).

## Prérequis

- Un serveur Linux (1 vCPU / 2 Go suffisent) avec Docker + le plugin Compose
- Le DNS de `ahmedmarketer.com` ET `www.ahmedmarketer.com` pointant vers
  l'IP du serveur (enregistrements A)
- Ports 80 et 443 ouverts

## Première installation

```bash
# 1. Copier le projet sur le serveur
git clone <votre-dépôt> ahmedmarketer && cd ahmedmarketer
# (ou rsync -a --exclude node_modules --exclude .next ./ serveur:ahmedmarketer/)

# 2. Configurer les secrets
cp .env.example .env
openssl rand -hex 24   # → POSTGRES_PASSWORD
openssl rand -hex 32   # → SESSION_SECRET
nano .env              # remplir aussi ADMIN_PASSWORD

# 3. Obtenir le certificat HTTPS et démarrer (une seule fois)
chmod +x deploy/ssl-init.sh
./deploy/ssl-init.sh votre-email@exemple.com
```

Le site est alors en ligne sur **https://ahmedmarketer.com** ; le premier
démarrage installe le schéma et le contenu de démonstration (white-label).
Connectez-vous sur `/admin` avec les identifiants du `.env`.

> Pour partir du contenu réel d'Ahmed plutôt que du modèle neutre :
> restaurez une sauvegarde de la base locale (voir « Reprendre le contenu
> local » ci-dessous) — c'est la méthode recommandée.

## Reprendre le contenu local (textes, médias, réservations)

Tout vit dans PostgreSQL, une seule commande suffit dans chaque sens :

```bash
# sur votre Mac : exporter
pg_dump -Fc whitelabel_site > site.dump

# sur le serveur : importer dans le conteneur
docker compose cp site.dump db:/tmp/site.dump
docker compose exec db pg_restore -U whitelabel -d whitelabel_site --clean --if-exists /tmp/site.dump
```

## Exploitation

| Action | Commande |
|---|---|
| Démarrer / arrêter | `docker compose up -d` / `docker compose down` |
| Journaux | `docker compose logs -f app` (ou `nginx`, `db`) |
| Mettre à jour le code | `git pull && docker compose build app && docker compose up -d app` |
| Sauvegarde complète | `docker compose exec db pg_dump -U whitelabel -Fc whitelabel_site > sauvegarde-$(date +%F).dump` |
| Restaurer | voir « Reprendre le contenu local » |
| Certificats | renouvelés automatiquement ; état : `docker compose logs certbot` |

Sauvegarde quotidienne automatique (sur le serveur, `crontab -e`) :

```cron
0 3 * * * cd /chemin/vers/ahmedmarketer && docker compose exec -T db pg_dump -U whitelabel -Fc whitelabel_site > /var/backups/ahmedmarketer-$(date +\%F).dump
```

## Notes techniques

- Le fuseau horaire des créneaux de réservation suit `TZ` dans `.env`
  (par défaut `Africa/Tunis`).
- nginx accepte les téléversements jusqu'à 350 Mo et diffuse les médias en
  streaming (`Range`) sans tampon disque.
- Les e-mails partent dès que le SMTP est configuré dans le panneau
  ✉️ (admin) — rien à faire côté serveur.
- HTTP redirige vers HTTPS ; `www` redirige vers le domaine nu ; HSTS actif.
