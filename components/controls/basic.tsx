'use client';

import React, { useRef, useState } from 'react';
import { FONTS } from '@/lib/fonts';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="wl-field">
      <span className="wl-label">{label}</span>
      {children}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  onReset,
  unit = '',
}: {
  value?: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  onReset?: () => void;
  unit?: string;
}) {
  return (
    <div className="wl-row">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value ?? (min + max) / 2}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <span style={{ minWidth: 52, fontSize: 12, color: value === undefined ? '#777' : '#fff' }}>
        {value === undefined ? 'auto' : `${value}${unit}`}
      </span>
      {onReset && value !== undefined && (
        <button type="button" className="wl-btn" title="Réinitialiser" onClick={onReset}>
          ↺
        </button>
      )}
    </div>
  );
}

export function FontSelect({
  value,
  onChange,
  allowInherit = true,
}: {
  value?: string;
  onChange: (v?: string) => void;
  allowInherit?: boolean;
}) {
  return (
    <select
      className="wl-select"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      {allowInherit && <option value="">Par défaut</option>}
      <option value="heading">Police des titres (thème)</option>
      <option value="body">Police du texte (thème)</option>
      {Object.entries(FONTS).map(([k, f]) => (
        <option key={k} value={k}>
          {f.label}
        </option>
      ))}
    </select>
  );
}

export function WeightSelect({
  value,
  onChange,
}: {
  value?: number;
  onChange: (v?: number) => void;
}) {
  return (
    <select
      className="wl-select"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
    >
      <option value="">Par défaut</option>
      <option value="400">Normal (400)</option>
      <option value="500">Moyen (500)</option>
      <option value="600">Semi-gras (600)</option>
      <option value="700">Gras (700)</option>
      <option value="800">Très gras (800)</option>
      <option value="900">Noir (900)</option>
    </select>
  );
}

export function AlignPicker({
  value,
  onChange,
}: {
  value?: 'left' | 'center' | 'right';
  onChange: (v?: 'left' | 'center' | 'right') => void;
}) {
  const opts: Array<['left' | 'center' | 'right', string]> = [
    ['left', '⬅'],
    ['center', '↔'],
    ['right', '➡'],
  ];
  return (
    <div className="wl-row">
      {opts.map(([v, icon]) => (
        <button
          key={v}
          type="button"
          className={`wl-btn ${value === v ? 'wl-btn-primary' : ''}`}
          onClick={() => onChange(value === v ? undefined : v)}
          title={v}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

const THEME_SWATCHES: Array<{ v: string; t: string }> = [
  { v: 'var(--c-primary)', t: 'Primaire' },
  { v: 'var(--c-accent)', t: 'Accent' },
  { v: 'var(--c-highlight)', t: 'Surbrillance' },
  { v: 'var(--c-text)', t: 'Texte' },
  { v: 'var(--c-muted)', t: 'Texte secondaire' },
  { v: 'var(--c-bg)', t: 'Fond' },
  { v: 'var(--c-surface)', t: 'Surface' },
  { v: '#ffffff', t: 'Blanc' },
  { v: '#191919', t: 'Noir' },
  { v: '#ffb300', t: 'Ambre' },
];

export function ColorInput({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v?: string) => void;
}) {
  const hex = value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#ffffff';
  return (
    <div>
      <div className="wl-row" style={{ marginBottom: 8 }}>
        {THEME_SWATCHES.map((s) => (
          <button
            key={s.v}
            type="button"
            className={`wl-swatch ${value === s.v ? 'active' : ''}`}
            style={{ background: s.v }}
            title={s.t}
            onClick={() => onChange(s.v)}
          />
        ))}
      </div>
      <div className="wl-row">
        <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} title="Couleur personnalisée" />
        <input
          className="wl-input"
          style={{ flex: 1 }}
          value={value ?? ''}
          placeholder="Par défaut"
          onChange={(e) => onChange(e.target.value || undefined)}
        />
        {value && (
          <button type="button" className="wl-btn" title="Réinitialiser" onClick={() => onChange(undefined)}>
            ↺
          </button>
        )}
      </div>
    </div>
  );
}

export async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/media', { method: 'POST', body: fd });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Échec de l'envoi (${res.status})`);
  }
  const data = await res.json();
  return data.id as string;
}

export function FileButton({
  accept,
  label,
  onDone,
}: {
  accept: string;
  label: string;
  onDone: (id: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          setBusy(true);
          setError(null);
          try {
            onDone(await uploadFile(f));
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur');
          } finally {
            setBusy(false);
          }
        }}
      />
      <button type="button" className="wl-btn wl-btn-primary" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? 'Envoi en cours…' : label}
      </button>
      {error && <div style={{ color: '#ff8585', fontSize: 12, marginTop: 6 }}>{error}</div>}
    </div>
  );
}
