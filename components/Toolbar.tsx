'use client';

import React, { useEffect, useState } from 'react';
import { useEdit } from './EditContext';

export default function Toolbar() {
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
  } = useEdit();
  const [pending, setPending] = useState(0);
  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/reservations?count=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPending(d.pending))
      .catch(() => {});
  }, [isAdmin, selected]);
  if (!isAdmin) return null;

  const saveLabel =
    saving === 'saving'
      ? 'Enregistrement…'
      : saving === 'saved'
        ? '✓ Enregistré'
        : saving === 'error'
          ? '⚠ Erreur — réessayer'
          : 'Enregistrer';

  return (
    <div className="wl-toolbar">
      <button
        type="button"
        className={`wl-tbtn ${editMode ? 'active' : ''}`}
        onClick={() => {
          setEditMode(!editMode);
          select(null);
        }}
        title={editMode ? "Quitter le mode édition (aperçu visiteur)" : 'Activer le mode édition'}
      >
        {editMode ? '👁 Aperçu' : '✏️ Éditer la page'}
      </button>
      <button
        type="button"
        className={`wl-tbtn ${selected?.kind === 'reservations' ? 'active' : ''}`}
        title="Réservations"
        onClick={() => select({ kind: 'reservations', path: '' })}
      >
        📅{pending > 0 && <span className="wl-badge">{pending}</span>}
      </button>
      {editMode && (
        <>
          <button type="button" className="wl-tbtn" onClick={() => select({ kind: 'theme', path: '' })}>
            🎨 Thème
          </button>
          <button type="button" className="wl-tbtn" onClick={() => select({ kind: 'nav', path: 'page.nav' })}>
            🧭 Menu
          </button>
          <button type="button" className="wl-tbtn" onClick={() => select({ kind: 'addSection', path: '' })}>
            ➕ Section
          </button>
          <button type="button" className="wl-tbtn" title="Historique des versions" onClick={() => select({ kind: 'history', path: '' })}>
            🕘
          </button>
          <span className="wl-sep" />
          <button type="button" className="wl-tbtn" disabled={!canUndo} onClick={undo} title="Annuler (Cmd/Ctrl+Z)">
            ↶
          </button>
          <button type="button" className="wl-tbtn" disabled={!canRedo} onClick={redo} title="Rétablir (Shift+Cmd/Ctrl+Z)">
            ↷
          </button>
          <button type="button" className="wl-tbtn wl-save" disabled={saving === 'saving'} onClick={() => void save()} title="Enregistrer (Cmd/Ctrl+S)">
            {saveLabel}
            {dirty && saving === 'idle' ? <span className="wl-dot" /> : null}
          </button>
        </>
      )}
      <button type="button" className="wl-tbtn" onClick={() => void logout()} title="Se déconnecter">
        ⏻
      </button>
    </div>
  );
}
