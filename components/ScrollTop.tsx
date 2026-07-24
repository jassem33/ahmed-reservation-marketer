'use client';

import { useEffect, useState } from 'react';

/** Bouton flottant « retour en haut » : apparaît après un défilement,
 *  ramène en haut de page en douceur. Placé au-dessus du bouton WhatsApp. */
export default function ScrollTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      className="wl-scrolltop"
      aria-label="Retour en haut de page"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      ↑
    </button>
  );
}
