// Configuration multilingue (partagée client / serveur, sans accès base).
// Chaque langue a son propre document `site` ; la configuration ci-dessous
// (libellés, drapeaux, langue par défaut, affichage du sélecteur) est globale et
// stockée dans la table `settings` sous la clé 'i18n'.

export type LocaleDef = {
  code: string; // 'fr', 'ar', 'en'… (2 à 5 caractères, minuscules)
  label: string; // libellé affiché dans le sélecteur — modifiable par l'admin
  flag: string; // clé d'un drapeau intégré (voir FLAG_KEYS) ou texte/émoji libre
  dir: 'ltr' | 'rtl';
  enabled: boolean;
};

export type I18nConfig = {
  defaultLocale: string;
  locales: LocaleDef[];
  switcher: { enabled: boolean; showFlag: boolean; showLabel: boolean };
};

export const FLAG_KEYS = ['fr', 'tn', 'dz', 'ma', 'gb', 'us', 'it', 'de', 'es', 'sa', 'ae', 'tr'] as const;
export type FlagKey = (typeof FLAG_KEYS)[number];
export const FLAG_LABELS: Record<FlagKey, string> = {
  fr: 'France',
  tn: 'Tunisie',
  dz: 'Algérie',
  ma: 'Maroc',
  gb: 'Royaume-Uni',
  us: 'États-Unis',
  it: 'Italie',
  de: 'Allemagne',
  es: 'Espagne',
  sa: 'Arabie saoudite',
  ae: 'Émirats',
  tr: 'Turquie',
};

export const DEFAULT_I18N: I18nConfig = {
  defaultLocale: 'fr',
  locales: [
    { code: 'fr', label: 'Français', flag: 'fr', dir: 'ltr', enabled: true },
    { code: 'ar', label: 'العربية', flag: 'tn', dir: 'rtl', enabled: true },
  ],
  switcher: { enabled: true, showFlag: true, showLabel: true },
};

export const LOCALE_CODE_RE = /^[a-z]{2,5}$/;

/** Normalise / valide une configuration venant de l'admin ou de la base. */
export function normalizeI18n(input: unknown): I18nConfig {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<I18nConfig>;
  const seen = new Set<string>();
  const locales: LocaleDef[] = [];
  for (const l of Array.isArray(raw.locales) ? raw.locales : []) {
    const code = String(l?.code ?? '')
      .trim()
      .toLowerCase();
    if (!LOCALE_CODE_RE.test(code) || seen.has(code)) continue;
    seen.add(code);
    locales.push({
      code,
      label: String(l?.label ?? code).slice(0, 40) || code,
      flag: String(l?.flag ?? '').slice(0, 16),
      dir: l?.dir === 'rtl' ? 'rtl' : 'ltr',
      enabled: l?.enabled !== false,
    });
  }
  if (!locales.length) return structuredClone(DEFAULT_I18N);
  let defaultLocale = String(raw.defaultLocale ?? '').toLowerCase();
  if (!locales.some((l) => l.code === defaultLocale)) defaultLocale = locales[0].code;
  // la langue par défaut est toujours active
  locales.forEach((l) => l.code === defaultLocale && (l.enabled = true));
  const sw = raw.switcher ?? DEFAULT_I18N.switcher;
  return {
    defaultLocale,
    locales,
    switcher: {
      enabled: sw.enabled !== false,
      showFlag: sw.showFlag !== false,
      showLabel: sw.showLabel !== false,
    },
  };
}

export function findLocale(cfg: I18nConfig, code: string | null | undefined): LocaleDef | null {
  if (!code) return null;
  return cfg.locales.find((l) => l.code === code.toLowerCase()) ?? null;
}

/** Résout la langue d'une requête : segment d'URL valide et actif, sinon la langue par défaut. */
export function resolveLocale(cfg: I18nConfig, pathLang: string | null | undefined): LocaleDef {
  const l = findLocale(cfg, pathLang);
  if (l && l.enabled) return l;
  return findLocale(cfg, cfg.defaultLocale) ?? cfg.locales[0];
}

/** URL publique d'une langue : la langue par défaut vit à la racine. */
export function localePath(cfg: I18nConfig, code: string): string {
  return code === cfg.defaultLocale ? '/' : `/${code}`;
}
