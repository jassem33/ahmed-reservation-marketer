'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from 'react';
import type { NavConfig } from '@/lib/types';
import { useEdit } from './EditContext';
import { mediaUrl } from './atoms';

export default function Navbar({ nav }: { nav: NavConfig }) {
  const { editMode, select, selected } = useEdit();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // referme le menu mobile après navigation
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('hashchange', close);
    return () => window.removeEventListener('hashchange', close);
  }, [open]);

  if (!nav || nav.enabled === false) return null;

  const editClick = (e: React.MouseEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    select({ kind: 'nav', path: 'page.nav' });
  };

  const linkProps = (href: string) => ({
    href,
    onClick: (e: React.MouseEvent) => {
      if (editMode) {
        editClick(e);
        return;
      }
      setOpen(false);
    },
  });

  return (
    <header
      className={`wl-nav ${scrolled || open ? 'wl-nav-solid' : ''} ${
        editMode && selected?.kind === 'nav' ? 'wl-selected' : ''
      } ${editMode ? 'wl-editable' : ''}`}
      onClick={editClick}
    >
      <div className="wl-nav-inner">
        <a {...linkProps('#top')} className="wl-nav-brand">
          {nav.logoMediaId && (
            <img src={mediaUrl(nav.logoMediaId)} alt="" className="wl-nav-logo" draggable={false} />
          )}
          <span>{nav.brand}</span>
        </a>
        <nav className="wl-nav-links" aria-label="Navigation principale">
          {nav.links.map((l, i) => (
            <a key={i} {...linkProps(l.href)} className="wl-nav-link">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="wl-nav-right">
          {nav.cta?.enabled !== false && nav.cta?.label && (
            <a {...linkProps(nav.cta.url)} className="wl-btn-cta wl-nav-cta">
              {nav.cta.label}
            </a>
          )}
          <button
            type="button"
            className={`wl-burger ${open ? 'open' : ''}`}
            aria-label="Menu"
            aria-expanded={open}
            onClick={(e) => {
              e.stopPropagation();
              if (editMode) {
                editClick(e);
                return;
              }
              setOpen(!open);
            }}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      <div className={`wl-nav-drawer ${open ? 'open' : ''}`}>
        {nav.links.map((l, i) => (
          <a key={i} {...linkProps(l.href)} className="wl-nav-drawer-link">
            {l.label}
          </a>
        ))}
        {nav.cta?.enabled !== false && nav.cta?.label && (
          <a {...linkProps(nav.cta.url)} className="wl-btn-cta" style={{ justifyContent: 'center' }}>
            {nav.cta.label}
          </a>
        )}
      </div>
    </header>
  );
}
