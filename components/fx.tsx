'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useEdit } from './EditContext';

/** Révélation douce au défilement (désactivée en mode édition et si
 *  l'utilisateur préfère réduire les animations). */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { editMode } = useEdit();
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (editMode) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [editMode]);
  if (editMode) return <div className={className}>{children}</div>;
  return (
    <div
      ref={ref}
      className={`wl-reveal ${shown ? 'wl-in' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/** Compteur animé : anime la partie numérique d'un texte (« 18 872 », « 92,9 % »,
 *  « 696 314 TND »…) lorsqu'il devient visible. Rend le texte brut en mode édition. */
export function CountUp({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const { editMode } = useEdit();
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    setDisplay(text);
    if (editMode) return;
    const m = /([\d][\d\s .,]*)/.exec(text);
    if (!m) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const raw = m[1].trim();
    const decimals = /,(\d+)\s*$/.exec(raw)?.[1]?.length ?? 0;
    const target = parseFloat(raw.replace(/[\s ]/g, '').replace(',', '.'));
    if (!isFinite(target)) return;
    const prefix = text.slice(0, m.index);
    const suffix = text.slice(m.index + m[1].length);
    const fmt = (v: number) =>
      prefix +
      v
        .toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        .replace(/ /g, ' ') +
      suffix;

    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const dur = 1300;
        const tick = (t: number) => {
          const k = Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - k, 3);
          setDisplay(fmt(target * eased));
          if (k < 1) raf = requestAnimationFrame(tick);
          else setDisplay(text);
        };
        raf = requestAnimationFrame(tick);
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [text, editMode]);

  return (
    <span ref={ref} className={className} style={style}>
      {display}
    </span>
  );
}
