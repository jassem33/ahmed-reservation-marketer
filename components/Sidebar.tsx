'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useEdit } from './EditContext';

function NavItem({
  icon,
  label,
  active,
  badge,
  danger,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  badge?: number;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`wl-nav-item ${active ? 'active' : ''} ${danger ? 'danger' : ''}`}
      onClick={onClick}
    >
      <span className="wl-nav-ico" aria-hidden>
        {icon}
      </span>
      <span className="wl-nav-label">{label}</span>
      {badge && badge > 0 ? <span className="wl-badge">{badge}</span> : null}
    </button>
  );
}

export default function Sidebar() {
  const {
    isAdmin,
    editMode,
    setEditMode,
    select,
    selected,
    undo,
    redo,
    canUndo,
    canRedo,
    dirty,
    saving,
    save,
    logout,
    site,
  } = useEdit();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/reservations?count=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPending(d.pending))
      .catch(() => {});
  }, [isAdmin, pathname]);

  if (!isAdmin) return null;

  const onSite = pathname === '/';
  const view = pathname === '/admin/reservations'
    ? 'reservations'
    : pathname.startsWith('/admin/visiteurs')
      ? 'analytics'
      : pathname.startsWith('/admin/reglages-email')
        ? 'mail'
        : onSite
          ? 'site'
          : 'other';
  const go = (fn: () => void) => {
    fn();
    setOpen(false);
  };
  // Navigation vers une vraie route (ferme le tiroir mobile)
  const goPath = (href: string) => go(() => router.push(href));
  const brand = site.page.nav?.brand ?? site.theme.brand.siteTitle ?? 'Administration';
  const saveLabel =
    saving === 'saving'
      ? 'Enregistrement…'
      : saving === 'saved'
        ? '✓ Enregistré'
        : saving === 'error'
          ? '⚠ Réessayer'
          : 'Enregistrer';

  return (
    <>
      <button type="button" className="wl-burger" aria-label="Menu admin" onClick={() => setOpen((o) => !o)}>
        ☰
      </button>
      {open && <div className="wl-sidebar-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`wl-sidebar ${open ? 'open' : ''}`}>
        <div className="wl-sidebar-brand">
          <span className="wl-sidebar-logo" aria-hidden>
            {(brand[0] ?? 'A').toUpperCase()}
          </span>
          <div>
            <strong>Administration</strong>
            <span>{brand}</span>
          </div>
        </div>

        <p className="wl-nav-group">Pages</p>
        <NavItem icon="🖥️" label="Mon site" active={view === 'site'} onClick={() => goPath('/')} />
        <NavItem
          icon="📅"
          label="Réservations"
          active={view === 'reservations'}
          badge={pending}
          onClick={() => goPath('/admin/reservations')}
        />
        <NavItem
          icon="📊"
          label="Visiteurs"
          active={view === 'analytics'}
          onClick={() => goPath('/admin/visiteurs')}
        />
        <NavItem
          icon="✉️"
          label="Réglages e-mail"
          active={view === 'mail'}
          onClick={() => goPath('/admin/reglages-email')}
        />

        {onSite && (
          <>
            <p className="wl-nav-group">Édition du site</p>
            <NavItem
              icon={editMode ? '🔒' : '✏️'}
              label={editMode ? "Désactiver l'édition" : "Activer l'édition"}
              active={editMode}
              onClick={() =>
                go(() => {
                  setEditMode(!editMode);
                  select(null);
                })
              }
            />
            {editMode && (
              <>
                <NavItem
                  icon="🎨"
                  label="Thème & couleurs"
                  active={selected?.kind === 'theme'}
                  onClick={() => go(() => select({ kind: 'theme', path: '' }))}
                />
                <NavItem
                  icon="🧭"
                  label="Menu de navigation"
                  active={selected?.kind === 'nav'}
                  onClick={() => go(() => select({ kind: 'nav', path: 'page.nav' }))}
                />
                <NavItem
                  icon="➕"
                  label="Ajouter une section"
                  active={selected?.kind === 'addSection'}
                  onClick={() => go(() => select({ kind: 'addSection', path: '' }))}
                />
                <NavItem
                  icon="🕘"
                  label="Historique"
                  active={selected?.kind === 'history'}
                  onClick={() => go(() => select({ kind: 'history', path: '' }))}
                />
                <div className="wl-nav-inline">
                  <button type="button" className="wl-btn" disabled={!canUndo} onClick={undo} title="Annuler (Ctrl+Z)">
                    ↶ Annuler
                  </button>
                  <button type="button" className="wl-btn" disabled={!canRedo} onClick={redo} title="Rétablir">
                    ↷
                  </button>
                </div>
                <button
                  type="button"
                  className="wl-nav-save"
                  disabled={saving === 'saving'}
                  onClick={() => void save()}
                >
                  💾 {saveLabel}
                  {dirty && saving === 'idle' ? <span className="wl-dot" /> : null}
                </button>
              </>
            )}
          </>
        )}

        <div className="wl-sidebar-foot">
          <NavItem icon="⏻" label="Déconnexion" danger onClick={() => void logout()} />
        </div>
      </aside>
    </>
  );
}
