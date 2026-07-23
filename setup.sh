#!/bin/bash
# Installation en une commande après extraction du zip :
#   ./setup.sh        puis        npm run dev
# Prérequis : Node.js ≥ 20 et PostgreSQL démarré (voir INSTALLATION.md)
set -e
cd "$(dirname "$0")"

DB="${WL_DB_NAME:-whitelabel_site}"

# ---------- Vérifications ----------
command -v node >/dev/null 2>&1 || {
  echo "✗ Node.js introuvable — installez Node.js ≥ 20 : https://nodejs.org"
  exit 1
}
node -e 'process.exit(parseInt(process.versions.node, 10) >= 20 ? 0 : 1)' || {
  echo "✗ Node.js ≥ 20 requis (version actuelle : $(node -v))"
  exit 1
}
command -v psql >/dev/null 2>&1 || {
  echo "✗ PostgreSQL introuvable — installez-le :"
  echo "   macOS : https://postgresapp.com  ou  brew install postgresql@16"
  echo "   Linux : sudo apt install postgresql"
  exit 1
}
pg_isready -q 2>/dev/null || {
  echo "✗ PostgreSQL ne répond pas — démarrez-le puis relancez ./setup.sh"
  exit 1
}
echo "✓ Node $(node -v) et PostgreSQL détectés"

# ---------- Base de données ----------
if ! psql -lqt | cut -d '|' -f 1 | grep -qw "$DB"; then
  createdb "$DB"
  echo "✓ Base « $DB » créée"
fi

if [ -f backup/site.dump ]; then
  HAS_SITE=$(psql -d "$DB" -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='site'" 2>/dev/null || true)
  if [ -z "$HAS_SITE" ]; then
    echo "⏳ Restauration du contenu (textes, médias, réservations)…"
    pg_restore -d "$DB" --clean --if-exists --no-owner backup/site.dump 2>/dev/null || true
    echo "✓ Contenu restauré"
  else
    echo "ℹ La base contient déjà des données — restauration ignorée."
    echo "  Pour forcer : dropdb $DB && ./setup.sh"
  fi
fi

# ---------- Environnement ----------
if [ ! -f .env.local ]; then
  SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  cat > .env.local <<EOF
DATABASE_URL=postgres://$(whoami)@localhost:5432/$DB
SESSION_SECRET=$SECRET
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
EOF
  echo "✓ .env.local généré"
fi

# ---------- Dépendances ----------
echo "⏳ Installation des dépendances (1 à 2 minutes)…"
npm install --no-audit --no-fund

# complète la base si elle était vide (idempotent)
npm run seed --silent

echo
echo "══════════════════════════════════════════════════"
echo "✓ Prêt ! Lancez le site :   npm run dev"
echo "  Site  : http://localhost:3000"
echo "  Admin : http://localhost:3000/admin"
echo "══════════════════════════════════════════════════"
