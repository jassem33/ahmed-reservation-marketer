'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

/** Défilement automatique continu (façon bandeau de témoignages) :
 *  le contenu est dupliqué pour une boucle parfaite, en pause au survol.
 *  À n'utiliser qu'en lecture publique — en mode édition, préférez <Carousel>. */
export function AutoMarquee({
  children,
  itemWidth = 'clamp(280px, 80vw, 380px)',
  duration,
  reverse = false,
  className = '',
}: {
  children: React.ReactNode[];
  itemWidth?: string;
  duration?: number;
  reverse?: boolean;
  className?: string;
}) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (!items.length) return null;
  const secs = duration ?? Math.max(24, items.length * 9);
  return (
    <div className={`wl-automarquee ${className}`}>
      <div
        className="wl-automarquee-inner"
        style={{ animationDuration: `${secs}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
      >
        {[0, 1].map((k) => (
          <div key={k} className="wl-amq-group" aria-hidden={k === 1}>
            {items.map((c, j) => (
              <div key={j} className="wl-amq-item" style={{ width: itemWidth }}>
                {c}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Carrousel horizontal à défilement magnétique (scroll-snap) :
 *  glissement au doigt sur mobile, flèches sur ordinateur. */
export default function Carousel({
  children,
  itemWidth = 'clamp(220px, 62vw, 300px)',
  className = '',
  ariaLabel,
}: {
  children: React.ReactNode[];
  itemWidth?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanL(el.scrollLeft > 8);
    setCanR(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    el?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const ro = new ResizeObserver(update);
    if (el) ro.observe(el);
    return () => {
      el?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      ro.disconnect();
    };
  }, [update, children.length]);

  const nudge = (dir: number) => {
    const el = ref.current;
    el?.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <div className={`wl-carousel ${className}`} role="region" aria-label={ariaLabel}>
      <div className="wl-track" ref={ref}>
        {React.Children.map(children, (c) =>
          c == null ? null : (
            <div className="wl-slide" style={{ width: itemWidth }}>
              {c}
            </div>
          ),
        )}
      </div>
      <button
        type="button"
        className="wl-arrow wl-arrow-l"
        style={{ opacity: canL ? 1 : 0, pointerEvents: canL ? 'auto' : 'none' }}
        onClick={(e) => {
          e.stopPropagation();
          nudge(-1);
        }}
        aria-label="Précédent"
      >
        ‹
      </button>
      <button
        type="button"
        className="wl-arrow wl-arrow-r"
        style={{ opacity: canR ? 1 : 0, pointerEvents: canR ? 'auto' : 'none' }}
        onClick={(e) => {
          e.stopPropagation();
          nudge(1);
        }}
        aria-label="Suivant"
      >
        ›
      </button>
    </div>
  );
}
