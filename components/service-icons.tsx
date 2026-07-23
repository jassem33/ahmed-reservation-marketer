import React from 'react';

/** Icônes vectorielles professionnelles pour les cartes de service
 *  (trait 1.8, grille 24 px). */
const ICONS: Record<string, { label: string; paths: React.ReactNode }> = {
  megaphone: {
    label: 'Mégaphone (publicité)',
    paths: (
      <>
        <path d="m3 11 16.2-6.1a.6.6 0 0 1 .8.56v13.08a.6.6 0 0 1-.8.56L3 13" />
        <path d="M3 11v2" />
        <path d="M7.5 13.5V18a1.7 1.7 0 0 0 3.4 0v-3.2" />
      </>
    ),
  },
  video: {
    label: 'Caméra (vidéo)',
    paths: (
      <>
        <rect x="2.5" y="6.5" width="13" height="11" rx="2.5" />
        <path d="m15.5 10.5 5-3.2v9.4l-5-3.2" />
      </>
    ),
  },
  globe: {
    label: 'Globe (site web)',
    paths: (
      <>
        <circle cx="12" cy="12" r="9.2" />
        <path d="M2.8 12h18.4" />
        <path d="M12 2.8c2.6 2.5 4 5.7 4 9.2s-1.4 6.7-4 9.2c-2.6-2.5-4-5.7-4-9.2s1.4-6.7 4-9.2z" />
      </>
    ),
  },
  rocket: {
    label: 'Fusée (croissance)',
    paths: (
      <>
        <path d="M12 2.5c3.2 1.6 5 4.6 5 8.3 0 1.6-.3 3.1-.9 4.5H7.9a11.6 11.6 0 0 1-.9-4.5c0-3.7 1.8-6.7 5-8.3z" />
        <circle cx="12" cy="9.5" r="1.8" />
        <path d="M7.9 15.3 5.5 19l3.6-.8M16.1 15.3l2.4 3.7-3.6-.8" />
        <path d="M12 17.5v4" />
      </>
    ),
  },
  chart: {
    label: 'Courbe (résultats)',
    paths: (
      <>
        <path d="M3.5 3.5v17h17" />
        <path d="m7 14.5 4-4.5 3 3 5.5-6.5" />
        <path d="M19.5 10.5v-4h-4" />
      </>
    ),
  },
  target: {
    label: 'Cible (stratégie)',
    paths: (
      <>
        <circle cx="12" cy="12" r="9.2" />
        <circle cx="12" cy="12" r="5.4" />
        <circle cx="12" cy="12" r="1.6" />
      </>
    ),
  },
  pen: {
    label: 'Plume (rédaction / design)',
    paths: (
      <>
        <path d="m16.8 3.2 4 4L8 20l-5.2 1.2L4 16 16.8 3.2z" />
        <path d="m14.5 5.5 4 4" />
      </>
    ),
  },
  camera: {
    label: 'Appareil photo',
    paths: (
      <>
        <path d="M4 7.5h3l1.6-2.4a1 1 0 0 1 .8-.4h5.2a1 1 0 0 1 .8.4L17 7.5h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5z" />
        <circle cx="12" cy="13" r="3.6" />
      </>
    ),
  },
  bag: {
    label: 'Sac (e-commerce)',
    paths: (
      <>
        <path d="M5.8 7.5h12.4l1.1 12.2a1.5 1.5 0 0 1-1.5 1.8H6.2a1.5 1.5 0 0 1-1.5-1.8L5.8 7.5z" />
        <path d="M8.8 10V6.8a3.2 3.2 0 0 1 6.4 0V10" />
      </>
    ),
  },
  zap: {
    label: 'Éclair (performance)',
    paths: <path d="M13.2 2.2 4 14h6l-1.2 7.8L18 10h-6l1.2-7.8z" />,
  },
  users: {
    label: 'Personnes (communauté)',
    paths: (
      <>
        <circle cx="9" cy="8.5" r="3.5" />
        <path d="M3 20a6 6 0 0 1 12 0" />
        <path d="M16.5 5.6a3.5 3.5 0 0 1 0 5.8M17.8 14.6A6 6 0 0 1 21 20" />
      </>
    ),
  },
  star: {
    label: 'Étoile (premium)',
    paths: (
      <path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8L12 3z" />
    ),
  },
};

export const SERVICE_ICON_KEYS = Object.keys(ICONS);
export const serviceIconLabel = (key: string) => ICONS[key]?.label ?? key;
export const hasServiceIcon = (key?: string): boolean => !!key && !!ICONS[key];

export function ServiceIcon({ name, size = 26 }: { name: string; size?: number }) {
  const icon = ICONS[name];
  if (!icon) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {icon.paths}
    </svg>
  );
}
