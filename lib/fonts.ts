export const FONTS: Record<string, { label: string; family: string }> = {
  anton: { label: 'Anton — display condensé', family: "'Anton', 'Arial Narrow', sans-serif" },
  'archivo-black': { label: 'Archivo Black — display', family: "'Archivo Black', sans-serif" },
  'bebas-neue': { label: 'Bebas Neue — display', family: "'Bebas Neue', sans-serif" },
  oswald: { label: 'Oswald — condensé', family: "'Oswald', sans-serif" },
  montserrat: { label: 'Montserrat', family: "'Montserrat', sans-serif" },
  poppins: { label: 'Poppins', family: "'Poppins', sans-serif" },
  inter: { label: 'Inter', family: "'Inter', sans-serif" },
  'space-grotesk': { label: 'Space Grotesk', family: "'Space Grotesk', sans-serif" },
  playfair: { label: 'Playfair Display — serif', family: "'Playfair Display', serif" },
  raleway: { label: 'Raleway', family: "'Raleway', sans-serif" },
};

/** Résout une clé de police vers une famille CSS.
 *  'heading' / 'body' pointent vers les polices du thème (variables CSS). */
export function fontFamily(key: string | undefined, fallback: 'heading' | 'body'): string {
  if (!key) return `var(--f-${fallback})`;
  if (key === 'heading' || key === 'body') return `var(--f-${key})`;
  return FONTS[key]?.family ?? `var(--f-${fallback})`;
}
