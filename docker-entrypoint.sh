#!/bin/sh
set -e

echo "⏳ Attente de la base de données…"
i=0
until node -e "const{Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL});c.connect().then(()=>{c.end();process.exit(0)}).catch(()=>process.exit(1))" 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    echo "✗ Base de données injoignable après 2 minutes" >&2
    exit 1
  fi
  sleep 2
done
echo "✓ Base de données prête"

echo "⏳ Initialisation (schéma + contenu par défaut si première installation)…"
node scripts/seed.mjs

echo "🚀 Démarrage du serveur"
exec node server.js
