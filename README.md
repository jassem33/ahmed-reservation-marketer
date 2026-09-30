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

## Flux des clients (XML / CSV)

`GET /api/reservations/feed?key=<jeton>` renvoie en temps réel la liste des clients
ayant réservé au format RSS/XML ; ajoutez `&format=csv` pour un CSV au format
« liste de clients » Meta. Le jeton secret est affiché (et régénérable) dans
Administration → Réservations → « Flux des clients ».

## Suivi des conversions (OpenAI Ads)

Le pixel OpenAI Ads est chargé sur la page publique (`components/TrackingScripts.tsx`).
En plus, chaque réservation créée envoie côté serveur un événement `lead` à l'API
de conversions (`lib/openai-ads.ts`), dédupliqué par identifiant de réservation.
Renseignez `OPENAI_ADS_API_KEY` dans `.env` pour l'activer (vide = désactivé).

## Multilingue (français / arabe…)

Chaque langue possède **sa propre version de la page** (même éditeur, même
sauvegarde). La langue par défaut vit à la racine `/`, les autres sous
`/<code>` (ex. `/ar`). Tant qu'une langue n'a pas été enregistrée, elle affiche
une copie de la langue par défaut (avec des polices arabes pour une langue de
droite à gauche) : il suffit de l'ouvrir en mode édition, traduire, enregistrer.

- **🌐 Langues** (barre latérale, mode édition) : langue par défaut, affichage du
  sélecteur (drapeaux / libellés), et pour chaque langue son **libellé**, son
  **drapeau** (France, Tunisie, Algérie, Maroc, Royaume-Uni… ou un émoji), son
  sens d'écriture (RTL pour l'arabe) et son activation. On peut ajouter d'autres
  langues (`en`, `it`…).
- `node scripts/translate-ar.mjs [--force]` génère la version arabe à partir de
  la version française (dictionnaire de traduction dans le script).
- Le sélecteur (liste déroulante) s'affiche dans la barre de navigation (et dans le tiroir mobile) ;
  sans barre de navigation il flotte en haut de page. En mode édition, cliquer
  dessus ouvre le panneau Langues.
- Les réglages du serveur (créneaux de réservation, e-mails, numéro WhatsApp)
  sont toujours lus dans la version de la **langue par défaut**.
- Données : table `site` (une ligne par `locale`), `revisions.locale`
  (historique par langue), `settings` clé `i18n` (configuration). Les textes
  d'interface codés en dur (formulaire de réservation) sont traduits dans
  `lib/ui-strings.ts` ; `proxy.ts` transmet la langue de l'URL au layout pour
  `<html lang dir>`.

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
