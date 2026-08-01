'use client';

import { useEffect } from 'react';
import { useEdit } from './EditContext';

const THRESHOLDS = [25, 50, 75, 100];

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem('wl_sid');
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `s_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
      sessionStorage.setItem('wl_sid', id);
    }
    return id;
  } catch {
    return `s_${Date.now()}`;
  }
}

function detectDevice(): string {
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
  return 'desktop';
}

// Tracker visiteurs — inactif en mode admin/édition
export default function Analytics() {
  const { isAdmin } = useEdit();

  useEffect(() => {
    if (isAdmin) return; // on ne suit pas l'administrateur
    if (typeof window === 'undefined') return;

    const sessionId = getSessionId();
    const device = detectDevice();
    const base = { sessionId, device, path: window.location.pathname };

    const send = (kind: 'view' | 'click' | 'scroll', label?: string) => {
      const payload = JSON.stringify({ ...base, kind, label, referrer: document.referrer || '' });
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/analytics', new Blob([payload], { type: 'application/json' }));
          return;
        }
      } catch {
        /* repli sur fetch */
      }
      void fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    };

    // Page vue
    send('view');

    // Profondeur de défilement
    const fired = new Set<number>();
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const pct = scrollable <= 0 ? 100 : Math.round(((window.scrollY || doc.scrollTop) / scrollable) * 100);
      for (const t of THRESHOLDS) {
        if (pct >= t && !fired.has(t)) {
          fired.add(t);
          send('scroll', String(t));
        }
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Clics sur liens et boutons
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest('a, button');
      if (!el) return;
      const label =
        el.getAttribute('data-analytics') ||
        (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60) ||
        el.getAttribute('aria-label') ||
        el.getAttribute('href') ||
        '(élément)';
      send('click', label);
    };
    document.addEventListener('click', onClick, true);

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClick, true);
    };
  }, [isAdmin]);

  return null;
}
