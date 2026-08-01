/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CSSProperties } from 'react';
import { FONTS } from './fonts';
import type { Theme } from './types';

// Variables CSS dérivées du thème du site (couleurs, polices, rayon).
export function themeCssVars(t: Theme): CSSProperties {
  const c = t.colors;
  return {
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
}
