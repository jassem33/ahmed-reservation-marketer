import React from 'react';
import { FLAG_KEYS, type FlagKey } from '@/lib/i18n';

/** Points d'une étoile à 5 branches (polygone SVG). */
function star(cx: number, cy: number, r: number, rot = -90): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = ((rot + i * 36) * Math.PI) / 180;
    const rr = i % 2 === 0 ? r : r * 0.382;
    pts.push(`${(cx + rr * Math.cos(rad)).toFixed(2)},${(cy + rr * Math.sin(rad)).toFixed(2)}`);
  }
  return pts.join(' ');
}

// Tous les drapeaux sont dessinés dans une boîte 3:2 (viewBox 0 0 30 20).
const FLAGS: Record<FlagKey, React.ReactNode> = {
  fr: (
    <>
      <rect width="10" height="20" fill="#0055A4" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <rect x="20" width="10" height="20" fill="#EF4135" />
    </>
  ),
  tn: (
    <>
      <rect width="30" height="20" fill="#E70013" />
      <circle cx="15" cy="10" r="5.5" fill="#fff" />
      <circle cx="15" cy="10" r="4.2" fill="#E70013" />
      <circle cx="16.1" cy="10" r="3.4" fill="#fff" />
      <polygon points={star(16.6, 10, 2.1, -90)} fill="#E70013" />
    </>
  ),
  dz: (
    <>
      <rect width="15" height="20" fill="#006233" />
      <rect x="15" width="15" height="20" fill="#fff" />
      <circle cx="15" cy="10" r="5" fill="#D21034" />
      <circle cx="16.6" cy="10" r="4.2" fill="#fff" />
      <polygon points={star(17.4, 10, 2.4, -90)} fill="#D21034" />
    </>
  ),
  ma: (
    <>
      <rect width="30" height="20" fill="#C1272D" />
      <polygon points={star(15, 10, 5.2, -90)} fill="none" stroke="#006233" strokeWidth="1.1" />
    </>
  ),
  gb: (
    <>
      <rect width="30" height="20" fill="#012169" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#fff" strokeWidth="4" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M15,0 V20 M0,10 H30" stroke="#fff" strokeWidth="6" />
      <path d="M15,0 V20 M0,10 H30" stroke="#C8102E" strokeWidth="3.4" />
    </>
  ),
  us: (
    <>
      <rect width="30" height="20" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={(i * 20) / 13} width="30" height={20 / 13} fill="#B22234" />
      ))}
      <rect width="12" height={(20 * 7) / 13} fill="#3C3B6E" />
    </>
  ),
  it: (
    <>
      <rect width="10" height="20" fill="#009246" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <rect x="20" width="10" height="20" fill="#CE2B37" />
    </>
  ),
  de: (
    <>
      <rect width="30" height="6.67" fill="#000" />
      <rect y="6.67" width="30" height="6.67" fill="#DD0000" />
      <rect y="13.33" width="30" height="6.67" fill="#FFCE00" />
    </>
  ),
  es: (
    <>
      <rect width="30" height="20" fill="#AA151B" />
      <rect y="5" width="30" height="10" fill="#F1BF00" />
    </>
  ),
  sa: (
    <>
      <rect width="30" height="20" fill="#006C35" />
      <rect x="7" y="7" width="16" height="2.2" rx="1" fill="#fff" />
      <rect x="9" y="11.5" width="12" height="1.6" rx="0.8" fill="#fff" />
    </>
  ),
  ae: (
    <>
      <rect width="30" height="6.67" fill="#00732F" />
      <rect y="6.67" width="30" height="6.67" fill="#fff" />
      <rect y="13.33" width="30" height="6.67" fill="#000" />
      <rect width="8" height="20" fill="#FF0000" />
    </>
  ),
  tr: (
    <>
      <rect width="30" height="20" fill="#E30A17" />
      <circle cx="11" cy="10" r="5.2" fill="#fff" />
      <circle cx="12.3" cy="10" r="4.2" fill="#E30A17" />
      <polygon points={star(17.2, 10, 2.5, 180)} fill="#fff" />
    </>
  ),
};

export function isFlagKey(v: string): v is FlagKey {
  return (FLAG_KEYS as readonly string[]).includes(v);
}

/** Drapeau intégré (SVG) ; toute autre valeur est affichée telle quelle (émoji, texte). */
export function Flag({ code, size = 18, className = '' }: { code: string; size?: number; className?: string }) {
  if (!code) return null;
  if (!isFlagKey(code)) {
    return (
      <span className={className} style={{ fontSize: size, lineHeight: 1 }} aria-hidden>
        {code}
      </span>
    );
  }
  return (
    <svg
      className={`wl-flag ${className}`}
      viewBox="0 0 30 20"
      width={Math.round(size * 1.5)}
      height={size}
      aria-hidden
      focusable="false"
    >
      {FLAGS[code]}
    </svg>
  );
}
