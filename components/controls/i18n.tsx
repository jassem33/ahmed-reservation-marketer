'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FLAG_KEYS,
  FLAG_LABELS,
  LOCALE_CODE_RE,
  localePath,
  normalizeI18n,
  type I18nConfig,
  type LocaleDef,
} from '@/lib/i18n';
import { useEdit } from '../EditContext';
import { Flag, isFlagKey } from '../flags';
import { Field } from './basic';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Panneau « Langues » : langue par défaut, affichage du sélecteur et, pour chaque
 * langue, libellé / drapeau / sens d'écriture / activation. La configuration est
 * globale (table `settings`) et s'enregistre immédiatement, indépendamment du
 * document de la page.
 */
export default function I18nControl() {
  const { i18n, setI18n, locale, dirty } = useEdit();
  const router = useRouter();
  const [draft, setDraft] = useState<I18nConfig>(() => structuredClone(i18n));
  const [translated, setTranslated] = useState<string[]>([]);
  const [state, setState] = useState<SaveState>('idle');
  const [newCode, setNewCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const changed = JSON.stringify(draft) !== JSON.stringify(i18n);

  useEffect(() => {
    fetch('/api/i18n')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setTranslated(d.translated))
      .catch(() => {});
  }, []);

  const patchLocale = (code: string, patch: Partial<LocaleDef>) =>
    setDraft((d) => ({ ...d, locales: d.locales.map((l) => (l.code === code ? { ...l, ...patch } : l)) }));
  const patchSwitcher = (patch: Partial<I18nConfig['switcher']>) =>
    setDraft((d) => ({ ...d, switcher: { ...d.switcher, ...patch } }));
  const moveLocale = (idx: number, delta: number) =>
    setDraft((d) => {
      const arr = d.locales.slice();
      const to = idx + delta;
      if (to < 0 || to >= arr.length) return d;
      const [it] = arr.splice(idx, 1);
      arr.splice(to, 0, it);
      return { ...d, locales: arr };
    });

  const save = async () => {
    setState('saving');
    try {
      const res = await fetch('/api/i18n', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizeI18n(draft)),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setI18n(data.config);
      setDraft(structuredClone(data.config));
      setTranslated(data.translated);
      setState('saved');
      // <html lang/dir> et les métadonnées sont rendus côté serveur
      router.refresh();
      setTimeout(() => setState('idle'), 1600);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2600);
    }
  };

  const resetContent = async (code: string) => {
    if (!window.confirm(`Supprimer le contenu enregistré pour « ${code} » ? Cette langue repartira d'une copie de la langue par défaut.`))
      return;
    const res = await fetch(`/api/i18n?locale=${encodeURIComponent(code)}`, { method: 'DELETE' });
    if (res.ok) {
      setTranslated((await res.json()).translated);
      if (code === locale.code) location.reload();
    }
  };

  const addLocale = () => {
    const code = newCode.trim().toLowerCase();
    if (!LOCALE_CODE_RE.test(code) || draft.locales.some((l) => l.code === code)) return;
    setDraft((d) => ({
      ...d,
      locales: [...d.locales, { code, label: newLabel.trim() || code.toUpperCase(), flag: '', dir: 'ltr', enabled: true }],
    }));
    setNewCode('');
    setNewLabel('');
  };

  const saveLabel =
    state === 'saving' ? 'Enregistrement…' : state === 'saved' ? '✓ Enregistré' : state === 'error' ? '⚠ Erreur — réessayer' : 'Enregistrer les langues';

  return (
    <>
      <p className="wl-hint" style={{ marginBottom: 14 }}>
        Chaque langue a sa propre version de la page. Vous éditez actuellement la version{' '}
        <strong>{locale.label}</strong> ({locale.code}). Pour traduire, ouvrez une autre langue ci-dessous puis modifiez
        les textes comme d&apos;habitude.
      </p>

      <Field label="Sélecteur de langue (barre de navigation)">
        <div className="wl-row">
          <button
            type="button"
            className={`wl-btn ${draft.switcher.enabled ? 'wl-btn-primary' : 'wl-btn-danger'}`}
            onClick={() => patchSwitcher({ enabled: !draft.switcher.enabled })}
          >
            {draft.switcher.enabled ? 'Visible' : 'Masqué'}
          </button>
          <button
            type="button"
            className={`wl-btn ${draft.switcher.showFlag ? 'wl-btn-primary' : ''}`}
            onClick={() => patchSwitcher({ showFlag: !draft.switcher.showFlag })}
          >
            Drapeaux
          </button>
          <button
            type="button"
            className={`wl-btn ${draft.switcher.showLabel ? 'wl-btn-primary' : ''}`}
            onClick={() => patchSwitcher({ showLabel: !draft.switcher.showLabel })}
          >
            Libellés
          </button>
        </div>
      </Field>

      <Field label="Langue par défaut (adresse racine « / »)">
        <select
          className="wl-input"
          value={draft.defaultLocale}
          onChange={(e) => setDraft((d) => ({ ...d, defaultLocale: e.target.value }))}
        >
          {draft.locales.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label} ({l.code})
            </option>
          ))}
        </select>
      </Field>

      <Field label="Langues">
        {draft.locales.map((l, idx) => {
          const isDefault = l.code === draft.defaultLocale;
          const isCurrent = l.code === locale.code;
          const hasContent = translated.includes(l.code);
          const customFlag = !!l.flag && !isFlagKey(l.flag);
          return (
            <div
              key={l.code}
              style={{ border: '1px solid #2c2c36', borderRadius: 10, padding: 10, marginBottom: 10, opacity: l.enabled ? 1 : 0.7 }}
            >
              <div className="wl-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
                  <Flag code={l.flag} size={14} />
                  {l.label} <span style={{ opacity: 0.55, fontWeight: 400 }}>· {l.code}</span>
                  {isDefault && <span className="wl-badge" style={{ position: 'static' }}>défaut</span>}
                </span>
                <span className="wl-hint" style={{ fontSize: 11 }}>
                  {isDefault ? '' : hasContent ? '✓ contenu traduit' : '⚠ pas encore traduit (copie de la langue par défaut)'}
                </span>
              </div>
              <input
                className="wl-input"
                style={{ marginBottom: 8 }}
                value={l.label}
                placeholder="Libellé affiché (ex. Français, العربية)"
                onChange={(e) => patchLocale(l.code, { label: e.target.value })}
              />
              <div className="wl-row" style={{ marginBottom: 8 }}>
                <select
                  className="wl-input"
                  style={{ flex: 1 }}
                  value={customFlag ? '__custom' : l.flag}
                  onChange={(e) => patchLocale(l.code, { flag: e.target.value === '__custom' ? '🏳️' : e.target.value })}
                >
                  <option value="">Sans drapeau</option>
                  {FLAG_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {FLAG_LABELS[k]}
                    </option>
                  ))}
                  <option value="__custom">Émoji / texte libre…</option>
                </select>
                {customFlag && (
                  <input
                    className="wl-input"
                    style={{ width: 90 }}
                    value={l.flag}
                    maxLength={16}
                    onChange={(e) => patchLocale(l.code, { flag: e.target.value })}
                  />
                )}
              </div>
              <div className="wl-row" style={{ marginBottom: 8 }}>
                <button
                  type="button"
                  className={`wl-btn ${l.dir === 'ltr' ? 'wl-btn-primary' : ''}`}
                  onClick={() => patchLocale(l.code, { dir: 'ltr' })}
                >
                  → Gauche à droite
                </button>
                <button
                  type="button"
                  className={`wl-btn ${l.dir === 'rtl' ? 'wl-btn-primary' : ''}`}
                  onClick={() => patchLocale(l.code, { dir: 'rtl' })}
                >
                  ← Droite à gauche
                </button>
              </div>
              <div className="wl-row" style={{ marginBottom: 8 }}>
                <button
                  type="button"
                  className={`wl-btn ${l.enabled ? 'wl-btn-primary' : 'wl-btn-danger'}`}
                  disabled={isDefault}
                  title={isDefault ? 'La langue par défaut est toujours active' : ''}
                  onClick={() => patchLocale(l.code, { enabled: !l.enabled })}
                >
                  {l.enabled ? 'Active' : 'Désactivée'}
                </button>
                <button type="button" className="wl-btn" disabled={idx === 0} onClick={() => moveLocale(idx, -1)}>
                  ↑
                </button>
                <button type="button" className="wl-btn" disabled={idx === draft.locales.length - 1} onClick={() => moveLocale(idx, +1)}>
                  ↓
                </button>
              </div>
              <div className="wl-row">
                {isCurrent ? (
                  <span className="wl-hint" style={{ alignSelf: 'center' }}>Version en cours d&apos;édition</span>
                ) : (
                  <a
                    className="wl-btn"
                    href={localePath(i18n, l.code)}
                    onClick={(e) => {
                      if (changed && !window.confirm('Les langues modifiées ne sont pas enregistrées. Continuer ?')) e.preventDefault();
                      else if (dirty && !window.confirm('La page a des modifications non enregistrées. Continuer ?')) e.preventDefault();
                    }}
                  >
                    ✏️ Ouvrir cette version
                  </a>
                )}
                {!isDefault && hasContent && (
                  <button type="button" className="wl-btn wl-btn-danger" onClick={() => void resetContent(l.code)}>
                    Réinitialiser le contenu
                  </button>
                )}
                {!isDefault && (
                  <button
                    type="button"
                    className="wl-btn wl-btn-danger"
                    onClick={() => {
                      if (window.confirm(`Retirer la langue « ${l.label} » ? Son contenu enregistré sera conservé jusqu'à réinitialisation.`))
                        setDraft((d) => ({ ...d, locales: d.locales.filter((x) => x.code !== l.code) }));
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div className="wl-row">
          <input
            className="wl-input"
            style={{ width: 70 }}
            value={newCode}
            placeholder="code"
            maxLength={5}
            onChange={(e) => setNewCode(e.target.value)}
          />
          <input
            className="wl-input"
            style={{ flex: 1 }}
            value={newLabel}
            placeholder="Libellé (ex. English)"
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <button type="button" className="wl-btn" disabled={!LOCALE_CODE_RE.test(newCode.trim().toLowerCase())} onClick={addLocale}>
            ＋
          </button>
        </div>
        <p className="wl-hint" style={{ marginTop: 6 }}>
          Code de langue en minuscules (fr, ar, en…). L&apos;adresse sera /code — la langue par défaut reste sur « / ».
        </p>
      </Field>

      <button type="button" className="wl-btn wl-btn-primary" disabled={state === 'saving' || !changed} onClick={() => void save()} style={{ width: '100%' }}>
        {saveLabel}
      </button>
    </>
  );
}
