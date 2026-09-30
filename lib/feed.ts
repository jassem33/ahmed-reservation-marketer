// Flux des réservations (XML / CSV) destiné aux outils externes (Meta, etc.).
// Protégé par un jeton secret dans l'URL, conservé dans `settings['feed']` et
// régénérable depuis l'administration.
import crypto from 'crypto';
import { pool } from './db';

export async function getFeedToken(): Promise<string> {
  const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'feed'");
  const token = rows[0]?.value?.token;
  if (typeof token === 'string' && token.length >= 32) return token;
  return rotateFeedToken();
}

export async function rotateFeedToken(): Promise<string> {
  const token = crypto.randomBytes(24).toString('base64url');
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ('feed', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
    [{ token }],
  );
  return token;
}

export function tokenMatches(given: string | null, expected: string): boolean {
  if (!given || given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export type FeedRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  service: string | null;
  domain: string | null;
  date: string;
  slot: string;
  social_link: string | null;
  budget: string | null;
  status: string;
  created_at: string;
};

export async function feedRows(): Promise<FeedRow[]> {
  const { rows } = await pool.query(
    `SELECT id, name, email, phone, service, domain, to_char(date, 'YYYY-MM-DD') AS date, slot,
            social_link, budget, status, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
     FROM reservations ORDER BY created_at DESC`,
  );
  return rows;
}

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Flux RSS 2.0 : un <item> par réservation, avec des champs dédiés. */
export function toXml(rows: FeedRow[], siteTitle: string, siteUrl: string): string {
  const items = rows
    .map((r) => {
      const [firstName, ...rest] = r.name.trim().split(/\s+/);
      return `    <item>
      <guid isPermaLink="false">reservation-${r.id}</guid>
      <title>${esc(r.name)} — ${esc(r.service ?? '')}</title>
      <pubDate>${esc(r.created_at)}</pubDate>
      <name>${esc(r.name)}</name>
      <first_name>${esc(firstName)}</first_name>
      <last_name>${esc(rest.join(' '))}</last_name>
      <email>${esc(r.email)}</email>
      <phone>${esc(r.phone)}</phone>
      <service>${esc(r.service)}</service>
      <domain>${esc(r.domain)}</domain>
      <budget>${esc(r.budget)}</budget>
      <social_link>${esc(r.social_link)}</social_link>
      <date>${esc(r.date)}</date>
      <slot>${esc(r.slot)}</slot>
      <status>${esc(r.status)}</status>
      <created_at>${esc(r.created_at)}</created_at>
    </item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(siteTitle)} — Réservations</title>
    <link>${esc(siteUrl)}</link>
    <description>Clients ayant réservé un créneau sur ${esc(siteTitle)}</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

/** CSV au format « liste de clients » Meta (email, phone, fn, ln, country) + colonnes métier. */
export function toCsv(rows: FeedRow[]): string {
  const cell = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['email', 'phone', 'fn', 'ln', 'country', 'service', 'domain', 'budget', 'social_link', 'date', 'slot', 'status', 'created_at'];
  const lines = rows.map((r) => {
    const [fn, ...rest] = r.name.trim().split(/\s+/);
    return [r.email, r.phone, fn, rest.join(' '), 'TN', r.service, r.domain, r.budget, r.social_link, r.date, r.slot, r.status, r.created_at]
      .map(cell)
      .join(',');
  });
  return `﻿${[header.join(','), ...lines].join('\r\n')}\r\n`;
}
