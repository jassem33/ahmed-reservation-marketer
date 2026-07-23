# Installation sur un nouveau PC

Ce dossier contient **tout le projet** : le code source et une sauvegarde
complète de la base de données (`backup/site.dump`) avec les textes, les
images, les vidéos et les réservations.

## 1. Prérequis (une seule fois)

- **Node.js ≥ 20** — https://nodejs.org (version LTS)
- **PostgreSQL** démarré :
  - macOS : https://postgresapp.com (le plus simple) ou `brew install postgresql@16`
  - Linux : `sudo apt install postgresql && sudo systemctl start postgresql`
  - Windows : voir « Windows » plus bas

## 2. Installation (macOS / Linux)

```bash
./setup.sh
npm run dev
```

C'est tout : le script crée la base, restaure le contenu, génère la
configuration et installe les dépendances.

- Site : http://localhost:3000
- Administration : http://localhost:3000/admin (admin / admin123 —
  modifiable dans `.env.local`, appliqué par `npm run seed`)

## Windows

Deux options :

**Option A — WSL (recommandée) :** installez WSL (`wsl --install`), puis
Node et PostgreSQL dans Ubuntu, et suivez les étapes macOS/Linux ci-dessus.

**Option B — manuelle :**
1. Installez Node.js et PostgreSQL (l'installeur officiel inclut pgAdmin).
2. Créez une base `whitelabel_site` puis restaurez la sauvegarde :
   `pg_restore -U postgres -d whitelabel_site --clean --if-exists --no-owner backup\site.dump`
3. Créez un fichier `.env.local` à la racine :
   ```
   DATABASE_URL=postgres://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/whitelabel_site
   SESSION_SECRET=une-longue-chaine-aleatoire
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin123
   ```
4. `npm install` puis `npm run dev`

## Notes

- La sauvegarde `backup/site.dump` date du jour de création du zip. Pour
  emporter un contenu plus récent : `pg_dump -Fc whitelabel_site > backup/site.dump`
  avant de re-zipper.
- Si le PC a déjà une base `whitelabel_site`, le script ne l'écrase pas
  (message affiché) — supprimez-la d'abord pour repartir de la sauvegarde.
- Déploiement en production : voir `deploy/README.md`.
