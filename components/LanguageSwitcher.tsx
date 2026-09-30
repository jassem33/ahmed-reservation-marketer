'use client';

import React, { useEffect, useRef, useState } from 'react';
import { localePath } from '@/lib/i18n';
import { useEdit } from './EditContext';
import { Flag } from './flags';

/**
 * Sélecteur de langue en liste déroulante : le bouton affiche la langue courante
 * (drapeau + libellé), le menu liste les autres langues actives. La langue par
 * défaut vit à la racine, les autres sous `/code`. En mode édition, un clic ouvre
 * le panneau « Langues » au lieu de naviguer ; le sélecteur reste visible même
 * désactivé pour rester accessible à l'administrateur.
 */
export default function LanguageSwitcher({
  className = '',
  floating = false,
}: {
  className?: string;
  floating?: boolean;
}) {
  const { i18n, locale, editMode, select, selected, t } = useEdit();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const list = (editMode ? i18n.locales : i18n.locales.filter((l) => l.enabled)).filter(
    (l) => l.code !== locale.code,
  );
  const hidden = !i18n.switcher.enabled || list.length < 1;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (hidden && !editMode) return null;

  const onEdit = (e: React.MouseEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    select({ kind: 'i18n', path: '' });
  };

  const cls = [
    'wl-lang',
    floating ? 'wl-lang-floating' : '',
    className,
    open ? 'open' : '',
    editMode ? 'wl-editable' : '',
    editMode && selected?.kind === 'i18n' ? 'wl-selected' : '',
    hidden ? 'wl-lang-off' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const showFlag = i18n.switcher.showFlag;
  const showLabel = i18n.switcher.showLabel;

  return (
    <div className={cls} ref={ref} onClick={onEdit}>
      <button
        type="button"
        className="wl-lang-btn"
        aria-label={t.language}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          if (editMode) return onEdit(e);
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {showFlag && locale.flag ? <Flag code={locale.flag} size={14} /> : null}
        {showLabel || !locale.flag ? <span>{locale.label}</span> : null}
        <svg className="wl-lang-chev" viewBox="0 0 12 12" width="11" height="11" aria-hidden>
          <path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <ul className="wl-lang-menu" role="listbox" aria-label={t.language} hidden={!open}>
        {list.map((l) => (
          <li key={l.code} role="option" aria-selected={false}>
            <a
              href={localePath(i18n, l.code)}
              hrefLang={l.code}
              lang={l.code}
              dir={l.dir}
              className={`wl-lang-item ${l.enabled ? '' : 'wl-lang-disabled'}`}
              onClick={onEdit}
            >
              {showFlag && l.flag ? <Flag code={l.flag} size={14} /> : null}
              <span>{l.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
