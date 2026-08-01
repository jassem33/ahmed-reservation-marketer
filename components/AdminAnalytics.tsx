'use client';

import { useEffect, useMemo, useState } from 'react';

type Totals = { views: number; clicks: number; visitors: number };
type Stats = {
  days: number;
  totals: Totals;
  byDay: Array<{ day: string; views: number; visitors: number }>;
  scroll: Array<{ depth: string; sessions: number }>;
  clicks: Array<{ label: string; count: number }>;
  devices: Array<{ device: string; sessions: number }>;
};

const RANGES = [
  { days: 7, label: '7 jours' },
  { days: 30, label: '30 jours' },
  { days: 90, label: '90 jours' },
];

const DEVICE_FR: Record<string, string> = {
  mobile: '📱 Mobile',
  desktop: '💻 Ordinateur',
  tablet: '📲 Tablette',
  inconnu: '❔ Inconnu',
};

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Stats | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    setState('loading');
    fetch(`/api/analytics?days=${days}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setData(d);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [days]);

  const frDay = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

  const maxViews = useMemo(() => Math.max(1, ...(data?.byDay.map((r) => r.views) ?? [0])), [data]);
  const totalDevices = useMemo(
    () => Math.max(1, (data?.devices ?? []).reduce((a, d) => a + d.sessions, 0)),
    [data],
  );
  const engagement =
    data && data.totals.visitors > 0 ? Math.round((data.totals.clicks / data.totals.visitors) * 100) / 100 : 0;

  return (
    <div className="wl-admin-page">
      <div className="wl-page-head">
        <div>
          <h1>Visiteurs</h1>
          <p className="wl-hint" style={{ marginTop: 6 }}>
            Ce que font les visiteurs sur votre site : pages vues, clics et jusqu'où ils défilent.
          </p>
        </div>
        <div className="wl-rez-tabs" style={{ margin: 0 }}>
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              className={`wl-rez-tab ${days === r.days ? 'active' : ''}`}
              onClick={() => setDays(r.days)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {state === 'loading' ? (
        <div className="wl-empty">Chargement…</div>
      ) : state === 'error' || !data ? (
        <div className="wl-empty">Impossible de charger les statistiques.</div>
      ) : (
        <>
          <div className="wl-stat-grid">
            <div className="wl-stat">
              <span className="wl-stat-value">{data.totals.visitors}</span>
              <span className="wl-stat-label">Visiteurs uniques</span>
            </div>
            <div className="wl-stat">
              <span className="wl-stat-value">{data.totals.views}</span>
              <span className="wl-stat-label">Pages vues</span>
            </div>
            <div className="wl-stat">
              <span className="wl-stat-value">{data.totals.clicks}</span>
              <span className="wl-stat-label">Clics</span>
            </div>
            <div className="wl-stat">
              <span className="wl-stat-value">{engagement}</span>
              <span className="wl-stat-label">Clics / visiteur</span>
            </div>
          </div>

          <div className="wl-analytics-cols">
            <section className="wl-card">
              <h2 className="wl-card-title">Pages vues par jour</h2>
              {data.byDay.length === 0 ? (
                <p className="wl-hint">Aucune donnée sur la période.</p>
              ) : (
                <div className="wl-daybars">
                  {data.byDay.map((r) => (
                    <div className="wl-daybar" key={r.day} title={`${r.views} vues · ${r.visitors} visiteurs`}>
                      <div className="wl-daybar-track">
                        <div
                          className="wl-daybar-fill"
                          style={{ height: `${Math.round((r.views / maxViews) * 100)}%` }}
                        />
                      </div>
                      <span className="wl-daybar-x">{frDay(r.day)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="wl-card">
              <h2 className="wl-card-title">Profondeur de défilement</h2>
              <p className="wl-hint" style={{ marginBottom: 12 }}>
                Combien de visiteurs atteignent chaque niveau de la page.
              </p>
              {['25', '50', '75', '100'].map((depth) => {
                const row = data.scroll.find((s) => s.depth === depth);
                const n = row?.sessions ?? 0;
                const pct = Math.round((n / Math.max(1, data.totals.visitors)) * 100);
                return (
                  <div className="wl-hbar" key={depth}>
                    <span className="wl-hbar-label">{depth === '100' ? "Bas de page" : `${depth} %`}</span>
                    <div className="wl-hbar-track">
                      <div className="wl-hbar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="wl-hbar-val">
                      {n} <span className="wl-td-sub">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </section>
          </div>

          <div className="wl-analytics-cols">
            <section className="wl-card">
              <h2 className="wl-card-title">Éléments les plus cliqués</h2>
              {data.clicks.length === 0 ? (
                <p className="wl-hint">Aucun clic enregistré.</p>
              ) : (
                <table className="wl-table" style={{ minWidth: 0 }}>
                  <tbody>
                    {data.clicks.map((c) => (
                      <tr key={c.label}>
                        <td>{c.label}</td>
                        <td style={{ textAlign: 'right', width: 80 }}>
                          <strong>{c.count}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="wl-card">
              <h2 className="wl-card-title">Appareils</h2>
              {data.devices.length === 0 ? (
                <p className="wl-hint">Aucune donnée.</p>
              ) : (
                data.devices.map((d) => {
                  const pct = Math.round((d.sessions / totalDevices) * 100);
                  return (
                    <div className="wl-hbar" key={d.device}>
                      <span className="wl-hbar-label">{DEVICE_FR[d.device] ?? d.device}</span>
                      <div className="wl-hbar-track">
                        <div className="wl-hbar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="wl-hbar-val">
                        {d.sessions} <span className="wl-td-sub">({pct}%)</span>
                      </span>
                    </div>
                  );
                })
              )}
            </section>
          </div>

          <p className="wl-hint" style={{ marginTop: 16 }}>
            Les statistiques sont anonymes (aucune donnée personnelle) et n'incluent pas vos propres visites en tant
            qu'administrateur.
          </p>
        </>
      )}
    </div>
  );
}
