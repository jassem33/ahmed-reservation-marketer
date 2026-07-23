# Whitelabel Site — vitrine marketing 100 % personnalisable

Site one-page « white label » inspiré de la structure du site d'Ahmed (voir
`../ahmed-site-audit/DESIGN-GUIDE.md`), entièrement modifiable par un
administrateur **directement sur la page**, à la Canva : on clique sur un
élément, on le modifie dans le panneau latéral, on enregistre.

**Tout est dynamique et stocké dans PostgreSQL (local)** : textes, tailles,
polices, couleurs, thème global, sections (ordre, visibilité, fond,
espacement), images et vidéos (stockées en binaire dans la base, servies en
streaming avec prise en charge des requêtes `Range`).

## Prérequis

- Node.js ≥ 20
- PostgreSQL local en fonctionnement (testé avec PostgreSQL 14, Homebrew)

## Installation

```bash
createdb whitelabel_site          # une seule fois
npm install
npm run seed                      # schéma + admin + contenu de démonstration
npm run dev                       # http://localhost:3000 (ou port suivant libre)
```

Identifiants de départ (modifiables dans `.env.local`, appliqués par `npm run seed`) :
**admin / admin123** sur `/admin`.

`npm run seed -- --reset` réinstalle le modèle par défaut (efface contenu,
historique et médias).

## Utilisation

1. Ouvrez `/admin`, connectez-vous → vous revenez sur la page avec la barre
   d'outils en bas.
2. **✏️ Éditer la page** : chaque élément survolé se surligne ; un clic ouvre
   le panneau latéral :
   - **Texte** : contenu, police (10 familles intégrées), taille, graisse,
     couleur (nuancier du thème + couleur libre), alignement, casse, interligne.
   - **Image / vidéo** : téléversement (max 300 Mo), affiche de la vidéo,
     légende, texte alternatif.
   - **⚙ Section** (bouton en haut à droite de chaque section) : fond,
     espacement, visibilité, ordre, suppression, réglages spécifiques
     (colonnes de la grille vidéo, numéro WhatsApp du pied de page).
   - Les listes (services, vidéos, sites, statistiques, avis, réseaux) se
     réordonnent (‹ ›), se suppriment (✕) et s'agrandissent (tuiles « ＋ »).
3. **🎨 Thème** : 8 couleurs globales, police des titres / du texte, arrondis,
   titre et description du site (onglet + référencement).
4. **➕ Section** : ajoute une section (héro, services, vidéos, sites, stats,
   avis, contact) insérée avant le pied de page.
5. **Enregistrer** (ou Cmd/Ctrl+S) : écrit en base et crée une **version**
   restaurable via 🕘. Annuler/Rétablir : Cmd/Ctrl+Z / Shift+Cmd/Ctrl+Z.
6. **👁 Aperçu** : voir la page comme un visiteur.

## Architecture

| Élément | Choix |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, Tailwind 4 |
| Données | PostgreSQL via `pg` — table `site` (document JSONB thème + page), `revisions` (50 dernières sauvegardes), `media` (fichiers en `BYTEA`), `admins` (bcrypt) |
| Auth | cookie signé HMAC-SHA256 (`SESSION_SECRET`), httpOnly, 7 jours |
| Médias | `POST /api/media` (admin) ; `GET /api/media/:id` public, streaming partiel `Range` (chunks ≤ 8 Mo), cache immuable |
| Édition | document manipulé par chemins (`page.sections.2.data.items.0.title`), historique undo/redo côté client, sauvegarde explicite |

Le document par défaut est dans `lib/default-site.json` ; le thème s'applique
via des variables CSS (`--c-*`, `--f-*`, `--radius`) injectées à la racine.

## Sauvegarde / restauration complète

Tout (contenu, thème, médias, versions) vit dans la base :

```bash
pg_dump -Fc whitelabel_site > sauvegarde.dump
pg_restore -d whitelabel_site --clean sauvegarde.dump
```

## Vérification automatique

```bash
npm run verify            # ou : node scripts/verify.mjs http://localhost:3001
```

Parcours complet dans un navigateur headless : rendu public, connexion,
édition de texte, thème, téléversement d'image, enregistrement, persistance
après rechargement (12 vérifications). Captures dans `docs/screens/`.

## Production

```bash
npm run build && npm start
```
# ahmed-reservation-marketer
