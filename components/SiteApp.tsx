'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import type { SiteDoc } from '@/lib/types';
import { FONTS } from '@/lib/fonts';
import { EditProvider, useEdit } from './EditContext';
import { SectionBody, SectionFrame } from './sections';
import Navbar from './Navbar';
import Toolbar from './Toolbar';
import SidePanel from './controls/panels';
import { SocialIcon } from './icons';

function WhatsAppFab() {
  const { site, editMode } = useEdit();
  const footer = site.page.sections.find((s) => s.type === 'footer');
  if (!footer || footer.data.fabEnabled === false) return null;
  const wa = String(footer.data.whatsapp || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (!wa) return null;
  return (
    <a
      className="wl-fab"
      href={`https://wa.me/${wa}`}
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp"
      onClick={(e) => editMode && e.preventDefault()}
    >
      <SocialIcon kind="whatsapp" size={26} />
    </a>
  );
}

function Root() {
  const { site, editMode, selected, select, isAdmin } = useEdit();
  const t = site.theme;
  const c = t.colors;
  const vars: React.CSSProperties = {
    ['--c-bg' as any]: c.background,
    ['--c-surface' as any]: c.surface,
    ['--c-primary' as any]: c.primary,
    ['--c-accent' as any]: c.accent,
    ['--c-highlight' as any]: c.highlight,
    ['--c-text' as any]: c.text,
    ['--c-muted' as any]: c.muted,
    ['--c-star' as any]: c.star,
    ['--f-heading' as any]: FONTS[t.fonts.heading]?.family ?? FONTS.anton.family,
    ['--f-body' as any]: FONTS[t.fonts.body]?.family ?? FONTS.poppins.family,
    ['--radius' as any]: `${t.radius ?? 16}px`,
  };
  const panelOpen =
    !!selected && (editMode || ['reservations', 'mailSettings'].includes(selected.kind));
  const hasSiteFooter = site.page.sections.some((s) => s.type === 'sitefooter');
  return (
    <div style={vars} id="top">
      <div
        className={panelOpen ? 'lg:pr-[340px]' : ''}
        style={{
          background: 'var(--c-bg)',
          color: 'var(--c-text)',
          fontFamily: 'var(--f-body)',
          minHeight: '100vh',
          transition: 'padding 0.18s ease',
          overflowX: 'clip',
        }}
        onClick={() => editMode && select(null)}
      >
        {site.page.nav && <Navbar nav={site.page.nav} />}
        {site.page.sections.map((sec, i) => (
          <SectionFrame key={sec.id} sec={sec} i={i}>
            <SectionBody sec={sec} i={i} />
          </SectionFrame>
        ))}
        {!hasSiteFooter && (
          <footer
            className="flex items-center justify-between px-6 py-5 text-xs"
            style={{ background: '#0a0a0d', color: 'rgba(255,255,255,.45)' }}
          >
            <span>
              © {new Date().getFullYear()} {t.brand.siteTitle}
            </span>
            <a href="/admin" style={{ color: 'rgba(255,255,255,.45)' }}>
              Administration
            </a>
          </footer>
        )}
        <WhatsAppFab />
      </div>
      {isAdmin && <Toolbar />}
      <SidePanel />
    </div>
  );
}

export default function SiteApp({
  initial,
  initialAdmin,
}: {
  initial: SiteDoc;
  initialAdmin: boolean;
}) {
  return (
    <EditProvider initial={initial} initialAdmin={initialAdmin}>
      <Root />
    </EditProvider>
  );
}
