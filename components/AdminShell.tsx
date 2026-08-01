'use client';

import React from 'react';
import type { SiteDoc } from '@/lib/types';
import { themeCssVars } from '@/lib/theme-vars';
import { EditProvider } from './EditContext';
import Sidebar from './Sidebar';
import ScrollTop from './ScrollTop';

// Enveloppe des pages du tableau de bord (/admin/*) : contexte + barre latérale.
// L'authentification est déjà garantie par la mise en page serveur.
export default function AdminShell({ initial, children }: { initial: SiteDoc; children: React.ReactNode }) {
  return (
    <EditProvider initial={initial} initialAdmin={true}>
      <div style={themeCssVars(initial.theme)} id="top">
        <Sidebar />
        <div
          className="wl-admin-shell"
          style={{
            background: 'var(--c-bg)',
            color: 'var(--c-text)',
            fontFamily: 'var(--f-body)',
            minHeight: '100vh',
          }}
        >
          {children}
        </div>
        <ScrollTop />
      </div>
    </EditProvider>
  );
}
