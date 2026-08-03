'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEdit } from './EditContext';
import { BookingAvailability } from './controls/panels';

type Status = 'pending' | 'confirmed' | 'cancelled';
type Reservation = {
  id: number;
  name: string;
  email: string;
  phone: string;
  service: string | null;
  date: string;
  slot: string;
  message: string | null;
  status: Status;
  created_at: string;
};

const STATUS_FR: Record<Status, { label: string; color: string }> = {
  pending: { label: 'En attente', color: '#ffb300' },
  confirmed: { label: 'Confirmée', color: '#35d07f' },
  cancelled: { label: 'Annulée', color: '#8a8a97' },
};

const TABS: Array<{ key: 'all' | Status; label: string }> = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'confirmed', label: 'Confirmées' },
  { key: 'cancelled', label: 'Annulées' },
];

type SortKey = 'name' | 'service' | 'date' | 'created_at' | 'status';
const STATUS_ORDER: Record<Status, number> = { pending: 0, confirmed: 1, cancelled: 2 };
// Colonnes dont le tri par défaut est décroissant (les plus récentes d'abord)
const DESC_FIRST: SortKey[] = ['date', 'created_at'];

const PAGE_SIZES = [10, 25, 50];

export default function AdminReservations() {
  const { site, save, saving, dirty } = useEdit();
  const router = useRouter();
  const [list, setList] = useState<Reservation[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState<number | null>(null);
  const [tab, setTab] = useState<'all' | Status>('all');
  const [query, setQuery] = useState('');
  const [showAvail, setShowAvail] = useState(false);

  // Index de la section « réservation » dans le document du site : c'est là que
  // vivent les disponibilités (planning, créneaux, exceptions) proposées aux clients.
  const bookingIdx = useMemo(
    () => site.page.sections.findIndex((s) => s.type === 'booking'),
    [site.page.sections],
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'created_at',
    dir: 'desc',
  });

  const load = () =>
    fetch('/api/reservations')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setList(d.reservations);
        setState('ready');
      })
      .catch(() => setState('error'));
  useEffect(() => {
    void load();
  }, []);

  // Revenir à la première page dès qu'un filtre ou le tri change
  useEffect(() => {
    setPage(1);
  }, [tab, query, pageSize, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: DESC_FIRST.includes(key) ? 'desc' : 'asc' },
    );

  const setStatus = async (id: number, status: Status) => {
    setBusy(id);
    await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setBusy(null);
    void load();
  };

  const frDay = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  const frDateTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return {
      day: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
  };
  const brand = site.page.nav?.brand ?? site.theme.brand.siteTitle;

  const counts = useMemo(
    () => ({
      all: list.length,
      pending: list.filter((r) => r.status === 'pending').length,
      confirmed: list.filter((r) => r.status === 'confirmed').length,
      cancelled: list.filter((r) => r.status === 'cancelled').length,
    }),
    [list],
  );

  const filtered = useMemo(() => {
    const byTab = tab === 'all' ? list : list.filter((r) => r.status === tab);
    const q = query.trim().toLowerCase();
    if (!q) return byTab;
    return byTab.filter((r) =>
      [r.name, r.email, r.phone, r.service, r.message]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q)),
    );
  }, [list, tab, query]);

  const sorted = useMemo(() => {
    const val = (r: Reservation): string | number => {
      switch (sort.key) {
        case 'name':
          return r.name.toLowerCase();
        case 'service':
          return (r.service ?? '').toLowerCase();
        case 'date':
          return `${r.date} ${r.slot}`;
        case 'created_at':
          return new Date(r.created_at).getTime() || 0;
        case 'status':
          return STATUS_ORDER[r.status];
      }
    };
    const arr = [...filtered].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      const cmp = typeof va === 'number' ? va - (vb as number) : String(va).localeCompare(String(vb), 'fr');
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sort]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;
  const rows = sorted.slice(start, start + pageSize);

  // Fenêtre de numéros de page (max 5 boutons)
  const pageNums = useMemo(() => {
    const win = 5;
    let from = Math.max(1, current - Math.floor(win / 2));
    const to = Math.min(totalPages, from + win - 1);
    from = Math.max(1, to - win + 1);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [current, totalPages]);

  const sortTh = (k: SortKey, label: string) => (
    <th className="wl-th-sortable">
      <button
        type="button"
        className={`wl-th-sort ${sort.key === k ? 'active' : ''}`}
        onClick={() => toggleSort(k)}
        title="Trier"
      >
        <span>{label}</span>
        <span className="wl-sort-ico" aria-hidden>
          {sort.key === k ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );

  return (
    <div className="wl-admin-page">
      <div className="wl-page-head">
        <div>
          <h1>Réservations</h1>
          <p className="wl-hint" style={{ marginTop: 6 }}>
            {counts.all} au total · <strong style={{ color: '#ffb300' }}>{counts.pending}</strong> en attente ·{' '}
            {counts.confirmed} confirmée(s)
          </p>
        </div>
        <button type="button" className="wl-btn" onClick={() => router.push('/admin/reglages-email')}>
          ✉️ Réglages e-mail
        </button>
      </div>

      {bookingIdx >= 0 && (
        <div className="wl-avail">
          <button
            type="button"
            className="wl-avail-head"
            onClick={() => setShowAvail((v) => !v)}
            aria-expanded={showAvail}
          >
            <span>
              <span aria-hidden style={{ marginRight: 8 }}>
                🗓️
              </span>
              Disponibilités — jours &amp; créneaux proposés aux clients
            </span>
            <span className="wl-avail-chevron" aria-hidden>
              {showAvail ? '▲' : '▼'}
            </span>
          </button>
          {showAvail && (
            <div className="wl-avail-body">
              <p className="wl-hint" style={{ marginBottom: 14 }}>
                Ces réglages déterminent les dates et heures que vos clients peuvent choisir sur le
                site. Cliquez « Enregistrer » pour les appliquer immédiatement.
              </p>
              <BookingAvailability path={`page.sections.${bookingIdx}`} />
              <div className="wl-avail-save">
                <button
                  type="button"
                  className="wl-btn wl-btn-primary"
                  disabled={saving === 'saving' || !dirty}
                  onClick={() => void save()}
                >
                  {saving === 'saving'
                    ? 'Enregistrement…'
                    : saving === 'saved'
                      ? '✓ Enregistré'
                      : saving === 'error'
                        ? '⚠ Réessayer'
                        : '💾 Enregistrer les disponibilités'}
                </button>
                {dirty && saving === 'idle' && (
                  <span className="wl-hint">Modifications non enregistrées</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="wl-rez-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`wl-rez-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      <div className="wl-rez-toolbar">
        <div className="wl-search">
          <span aria-hidden>🔍</span>
          <input
            type="search"
            className="wl-search-input"
            placeholder="Rechercher un nom, e-mail, téléphone, service…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className="wl-search-clear" onClick={() => setQuery('')} aria-label="Effacer">
              ✕
            </button>
          )}
        </div>
        <label className="wl-pagesize">
          Par page
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {state === 'loading' ? (
        <div className="wl-empty">Chargement…</div>
      ) : state === 'error' ? (
        <div className="wl-empty">Impossible de charger les réservations.</div>
      ) : total === 0 ? (
        <div className="wl-empty">
          {query
            ? `Aucun résultat pour « ${query} ».`
            : `Aucune réservation ${tab !== 'all' ? 'dans cette catégorie' : 'pour le moment'}.`}
        </div>
      ) : (
        <div className="wl-table-wrap">
          <table className="wl-table">
            <thead>
              <tr>
                {sortTh('name', 'Client')}
                <th>Contact</th>
                {sortTh('service', 'Service')}
                {sortTh('date', 'Date & heure')}
                {sortTh('created_at', 'Reçue le')}
                {sortTh('status', 'Statut')}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const wa = r.phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
                const confirmMsg = `Bonjour ${r.name}, votre réservation « ${r.service ?? ''} » du ${frDay(r.date)} à ${r.slot} est confirmée ✅ — ${brand}`;
                const st = STATUS_FR[r.status];
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="wl-td-strong">{r.name}</div>
                      {r.message ? (
                        <div className="wl-td-sub" style={{ fontStyle: 'italic', maxWidth: 220 }}>
                          « {r.message} »
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div>{r.email || <span className="wl-td-sub">— pas d'e-mail</span>}</div>
                      <div className="wl-td-sub">{r.phone}</div>
                    </td>
                    <td>{r.service || '—'}</td>
                    <td>
                      <div className="wl-td-strong">{frDay(r.date)}</div>
                      <div className="wl-td-sub">{r.slot}</div>
                    </td>
                    <td>
                      {(() => {
                        const c = frDateTime(r.created_at);
                        return typeof c === 'string' ? (
                          <span className="wl-td-sub">{c}</span>
                        ) : (
                          <>
                            <div className="wl-td-strong">{c.day}</div>
                            <div className="wl-td-sub">{c.time}</div>
                          </>
                        );
                      })()}
                    </td>
                    <td>
                      <span className="wl-pill" style={{ color: st.color, background: `${st.color}1f` }}>
                        {st.label}
                      </span>
                    </td>
                    <td>
                      <div className="wl-actions">
                        {r.status !== 'confirmed' && (
                          <button
                            type="button"
                            className="wl-act ok"
                            disabled={busy === r.id}
                            onClick={() => setStatus(r.id, 'confirmed')}
                          >
                            ✓ Confirmer
                          </button>
                        )}
                        {r.status !== 'cancelled' && (
                          <button
                            type="button"
                            className="wl-act no"
                            disabled={busy === r.id}
                            onClick={() => setStatus(r.id, 'cancelled')}
                          >
                            ✕ Annuler
                          </button>
                        )}
                        {wa && (
                          <a
                            className="wl-act wa"
                            href={`https://wa.me/${wa}?text=${encodeURIComponent(confirmMsg)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            WhatsApp
                          </a>
                        )}
                        {r.email && (
                          <a className="wl-act" href={`mailto:${r.email}`}>
                            ✉️
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <div className="wl-pagination">
          <span className="wl-page-info">
            {start + 1}–{Math.min(start + pageSize, total)} sur {total}
          </span>
          <div className="wl-page-btns">
            <button
              type="button"
              className="wl-page-btn"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
              aria-label="Page précédente"
            >
              ‹
            </button>
            {pageNums[0] > 1 && (
              <>
                <button type="button" className="wl-page-btn" onClick={() => setPage(1)}>
                  1
                </button>
                {pageNums[0] > 2 && <span className="wl-page-gap">…</span>}
              </>
            )}
            {pageNums.map((n) => (
              <button
                key={n}
                type="button"
                className={`wl-page-btn ${n === current ? 'active' : ''}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            {pageNums[pageNums.length - 1] < totalPages && (
              <>
                {pageNums[pageNums.length - 1] < totalPages - 1 && <span className="wl-page-gap">…</span>}
                <button type="button" className="wl-page-btn" onClick={() => setPage(totalPages)}>
                  {totalPages}
                </button>
              </>
            )}
            <button
              type="button"
              className="wl-page-btn"
              disabled={current >= totalPages}
              onClick={() => setPage(current + 1)}
              aria-label="Page suivante"
            >
              ›
            </button>
          </div>
        </div>
      )}

      <p className="wl-hint" style={{ marginTop: 14 }}>
        « Confirmer » envoie automatiquement l'e-mail de confirmation au client (si un e-mail est renseigné). Le bouton
        WhatsApp ouvre une conversation avec un message pré-rempli.
      </p>
    </div>
  );
}
