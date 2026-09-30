'use client';

import { useEffect, useState } from 'react';

/**
 * Bloc « Flux des réservations » de la page Réservations : affiche les adresses
 * XML / CSV (toujours à jour) à coller dans Meta ou tout autre outil, avec
 * copie en un clic et régénération du jeton secret.
 */
export default function FeedLink() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!open || token) return;
    fetch('/api/reservations/feed-token')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setToken(d.token))
      .catch(() => {});
  }, [open, token]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = token ? `${origin}/api/reservations/feed?key=${token}` : '';
  const urls = [
    { label: 'XML (RSS)', url: base },
    { label: 'CSV (liste de clients Meta)', url: base ? `${base}&format=csv` : '' },
  ];

  const copy = async (u: string) => {
    try {
      await navigator.clipboard.writeText(u);
      setCopied(u);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* presse-papiers indisponible : l'adresse reste sélectionnable */
    }
  };

  const rotate = async () => {
    if (!window.confirm("Régénérer le lien ? L'ancienne adresse cessera de fonctionner immédiatement."))
      return;
    const res = await fetch('/api/reservations/feed-token', { method: 'POST' });
    if (res.ok) setToken((await res.json()).token);
  };

  return (
    <div className="wl-avail">
      <button type="button" className="wl-avail-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span>
          <span aria-hidden style={{ marginRight: 8 }}>
            🔗
          </span>
          Flux des clients — lien XML / CSV pour Meta &amp; autres outils
        </span>
        <span className="wl-avail-chevron" aria-hidden>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div className="wl-avail-body">
          <p className="wl-hint" style={{ marginBottom: 14 }}>
            Ces adresses renvoient toujours la liste actuelle des clients ayant réservé (nom, e-mail,
            téléphone, service, domaine, date…). Le lien contient un jeton secret : ne le partagez
            qu&apos;avec les outils qui en ont besoin.
          </p>
          {!token ? (
            <p className="wl-hint">Chargement…</p>
          ) : (
            urls.map((u) => (
              <div key={u.label} style={{ marginBottom: 12 }}>
                <div className="wl-td-sub" style={{ marginBottom: 4 }}>{u.label}</div>
                <div className="wl-row">
                  <input className="wl-input" style={{ flex: 1, fontSize: 12 }} readOnly value={u.url} onFocus={(e) => e.target.select()} />
                  <button type="button" className="wl-btn" onClick={() => void copy(u.url)}>
                    {copied === u.url ? '✓ Copié' : 'Copier'}
                  </button>
                  <a className="wl-btn" href={u.url} target="_blank" rel="noreferrer">
                    Ouvrir
                  </a>
                </div>
              </div>
            ))
          )}
          <button type="button" className="wl-btn wl-btn-danger" onClick={() => void rotate()} disabled={!token}>
            Régénérer le lien secret
          </button>
        </div>
      )}
    </div>
  );
}
