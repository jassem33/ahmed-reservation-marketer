'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SiteDoc } from '@/lib/types';
import { themeCssVars } from '@/lib/theme-vars';
import { EditProvider, useEdit } from './EditContext';
import { SectionBody, SectionFrame } from './sections';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Analytics from './Analytics';
import SidePanel from './controls/panels';
import ScrollTop from './ScrollTop';
import { SocialIcon } from './icons';

function WhatsAppFab() {
  const { site, editMode } = useEdit();
  const booking = site.page.sections.find((s) => s.type === 'booking')?.data as any;
  const footer = site.page.sections.find((s) => s.type === 'footer')?.data as any;
  const fabEnabled = booking?.fabEnabled ?? footer?.fabEnabled;
  if (fabEnabled === false) return null;
  const wa = String(booking?.whatsapp || footer?.whatsapp || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
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
  const rightPanelOpen = !!selected && editMode;
  const hasSiteFooter = site.page.sections.some((s) => s.type === 'sitefooter');
  return (
    <div style={themeCssVars(t)} id="top">
      {isAdmin && <Sidebar />}
      <div
        className={[isAdmin ? 'wl-admin-shell' : '', rightPanelOpen ? 'lg:pr-[340px]' : '']
          .filter(Boolean)
          .join(' ')}
        style={{
          background: 'var(--c-bg)',
          color: 'var(--c-text)',
          fontFamily: 'var(--f-body)',
          minHeight: '100vh',
          transition: 'padding 0.18s ease',
          overflowX: 'clip',
        }}
        onClick={() => {
          if (editMode) select(null);
        }}
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
        <Analytics />
      </div>
      <ScrollTop />
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
