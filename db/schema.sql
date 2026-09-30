CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site (
  id INT PRIMARY KEY CHECK (id = 1),
  theme JSONB NOT NULL,
  page JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revisions (
  id SERIAL PRIMARY KEY,
  theme JSONB NOT NULL,
  page JSONB NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  service TEXT,
  date DATE NOT NULL,
  slot TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS reservations_slot_uniq
  ON reservations (date, slot) WHERE status <> 'cancelled';

-- Ajouts après la première version : lien de la page Facebook/Instagram (obligatoire
-- côté formulaire) et budget marketing envisagé (facultatif).
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS social_link TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS budget TEXT;
-- Domaine d'activité du client (liste + « Autre : … » saisi librement)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS domain TEXT;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mail_queue (
  id SERIAL PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'error')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  data BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Les médias vivent désormais sur disque (volume `media-data`, voir lib/media.ts) :
-- `data` reste NULL pour les nouveaux, et NON NULL pour les médias historiques
-- pas encore déplacés par scripts/media-to-disk.mjs.
ALTER TABLE media ALTER COLUMN data DROP NOT NULL;

-- Suivi des visiteurs (pages vues, clics, profondeur de défilement)
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('view', 'click', 'scroll')),
  label TEXT,
  path TEXT,
  referrer TEXT,
  device TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_created_idx ON analytics_events (created_at);
CREATE INDEX IF NOT EXISTS analytics_events_kind_idx ON analytics_events (kind);

-- Multilingue : un document `site` par langue (clé = code de langue, ex. 'fr', 'ar').
-- L'ancienne ligne unique (id = 1) devient la version 'fr'. La configuration des
-- langues (libellés, drapeaux, langue par défaut) vit dans `settings` (clé 'i18n').
ALTER TABLE site ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'fr';
ALTER TABLE site DROP CONSTRAINT IF EXISTS site_id_check;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'site'::regclass AND c.contype = 'p' AND a.attname = 'id'
  ) THEN
    ALTER TABLE site DROP CONSTRAINT site_pkey;
    ALTER TABLE site ADD PRIMARY KEY (locale);
  END IF;
END $$;
ALTER TABLE revisions ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'fr';
CREATE INDEX IF NOT EXISTS revisions_locale_idx ON revisions (locale, id DESC);
