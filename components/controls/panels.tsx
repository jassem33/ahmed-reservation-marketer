'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import React, { useEffect, useState } from 'react';
import type { ImageNode, SectionType, TextNode, Theme, VideoNode } from '@/lib/types';
import { getAtPath } from '@/lib/path';
import { newSection, SECTION_LABELS } from '@/lib/templates';
import { FONTS } from '@/lib/fonts';
import { SOCIAL_KINDS } from '../icons';
import { SERVICE_ICON_KEYS, ServiceIcon, serviceIconLabel } from '../service-icons';
import { mediaUrl } from '../atoms';
import { useEdit } from '../EditContext';
import { AlignPicker, ColorInput, Field, FileButton, FontSelect, Slider, WeightSelect } from './basic';

/* ------------------------------------------------------------------ */
/* Texte                                                               */
/* ------------------------------------------------------------------ */
function TextControl({ path }: { path: string }) {
  const { site, update } = useEdit();
  const node = (getAtPath(site, path) ?? { text: '' }) as TextNode;
  const set = (patch: Partial<TextNode>) => {
    const next: any = { ...node, ...patch };
    Object.keys(next).forEach((k) => next[k] === undefined && delete next[k]);
    update(path, next);
  };
  return (
    <>
      <Field label="Texte">
        <textarea
          className="wl-textarea"
          rows={3}
          value={node.text}
          autoFocus
          onChange={(e) => set({ text: e.target.value })}
        />
      </Field>
      <Field label="Police">
        <FontSelect value={node.font} onChange={(v) => set({ font: v })} />
      </Field>
      <Field label="Taille">
        <Slider value={node.size} min={10} max={140} unit=" px" onChange={(v) => set({ size: v })} onReset={() => set({ size: undefined })} />
      </Field>
      <Field label="Graisse">
        <WeightSelect value={node.weight} onChange={(v) => set({ weight: v })} />
      </Field>
      <Field label="Couleur">
        <ColorInput value={node.color} onChange={(v) => set({ color: v })} />
      </Field>
      <Field label="Alignement">
        <AlignPicker value={node.align} onChange={(v) => set({ align: v })} />
      </Field>
      <Field label="Casse">
        <div className="wl-row">
          <button type="button" className={`wl-btn ${node.transform === undefined ? 'wl-btn-primary' : ''}`} onClick={() => set({ transform: undefined })}>
            Par défaut
          </button>
          <button type="button" className={`wl-btn ${node.transform === 'uppercase' ? 'wl-btn-primary' : ''}`} onClick={() => set({ transform: 'uppercase' })}>
            MAJUSCULES
          </button>
          <button type="button" className={`wl-btn ${node.transform === 'none' ? 'wl-btn-primary' : ''}`} onClick={() => set({ transform: 'none' })}>
            Normale
          </button>
        </div>
      </Field>
      <Field label="Interligne">
        <Slider value={node.lh} min={0.9} max={2.2} step={0.05} onChange={(v) => set({ lh: v })} onReset={() => set({ lh: undefined })} />
      </Field>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Image                                                               */
/* ------------------------------------------------------------------ */
function ImageControl({ path }: { path: string }) {
  const { site, update } = useEdit();
  const node = (getAtPath(site, path) ?? {}) as ImageNode;
  const set = (patch: Partial<ImageNode>) => update(path, { ...node, ...patch });
  return (
    <>
      {node.mediaId && (
        <div className="wl-field">
          <img src={mediaUrl(node.mediaId)} alt="" style={{ width: '100%', borderRadius: 10 }} />
        </div>
      )}
      <Field label={node.mediaId ? "Remplacer l'image" : 'Ajouter une image'}>
        <FileButton accept="image/*" label="📁 Choisir une image…" onDone={(id) => set({ mediaId: id })} />
      </Field>
      <Field label="Texte alternatif (accessibilité)">
        <input className="wl-input" value={node.alt ?? ''} onChange={(e) => set({ alt: e.target.value })} />
      </Field>
      {node.mediaId && (
        <button type="button" className="wl-btn wl-btn-danger" onClick={() => set({ mediaId: null })}>
          Retirer l'image
        </button>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Vidéo                                                               */
/* ------------------------------------------------------------------ */
function VideoControl({ path }: { path: string }) {
  const { site, update } = useEdit();
  const node = (getAtPath(site, path) ?? {}) as VideoNode;
  const set = (patch: Partial<VideoNode>) => update(path, { ...node, ...patch });
  return (
    <>
      {node.mediaId && (
        <div className="wl-field">
          <video
            src={mediaUrl(node.mediaId)}
            poster={node.posterId ? mediaUrl(node.posterId) : undefined}
            controls
            preload="metadata"
            style={{ width: '100%', borderRadius: 10, background: '#000' }}
          />
        </div>
      )}
      <Field label={node.mediaId ? 'Remplacer la vidéo' : 'Ajouter une vidéo'}>
        <FileButton accept="video/*" label="🎬 Choisir une vidéo…" onDone={(id) => set({ mediaId: id })} />
      </Field>
      <Field label="Affiche (image avant lecture)">
        <div className="wl-row">
          <FileButton accept="image/*" label="🖼 Choisir une affiche…" onDone={(id) => set({ posterId: id })} />
          {node.posterId && (
            <button type="button" className="wl-btn wl-btn-danger" onClick={() => set({ posterId: null })}>
              Retirer
            </button>
          )}
        </div>
        <p className="wl-hint" style={{ marginTop: 6 }}>
          Recommandé : la vidéo ne se charge qu'au clic, l'affiche garde la page rapide.
        </p>
      </Field>
      <Field label="Légende">
        <input className="wl-input" value={node.caption ?? ''} onChange={(e) => set({ caption: e.target.value })} />
      </Field>
      {node.mediaId && (
        <button type="button" className="wl-btn wl-btn-danger" onClick={() => set({ mediaId: null })}>
          Retirer la vidéo
        </button>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */
function SectionControl({ path }: { path: string }) {
  const { site, update, arrayOp, select } = useEdit();
  const section = getAtPath(site, path) as any;
  const index = Number(path.split('.').pop());
  const count = site.page.sections.length;
  if (!section) return null;
  const st = section.style ?? {};
  const setStyle = (patch: any) => update(`${path}.style`, { ...st, ...patch });
  return (
    <>
      <p className="wl-hint" style={{ marginBottom: 14 }}>
        Type : {SECTION_LABELS[section.type as SectionType] ?? section.type}
      </p>
      <Field label="Couleur de fond">
        <ColorInput value={st.bg} onChange={(v) => setStyle({ bg: v })} />
      </Field>
      <Field label="Espacement vertical">
        <Slider value={st.paddingY ?? 96} min={24} max={180} unit=" px" onChange={(v) => setStyle({ paddingY: v })} />
      </Field>
      {['media', 'websites'].includes(section.type) && (
        <Field label="Disposition">
          <div className="wl-row">
            <button
              type="button"
              className={`wl-btn ${section.data.layout !== 'grid' ? 'wl-btn-primary' : ''}`}
              onClick={() => update(`${path}.data.layout`, 'carousel')}
            >
              ↔ Carrousel
            </button>
            <button
              type="button"
              className={`wl-btn ${section.data.layout === 'grid' ? 'wl-btn-primary' : ''}`}
              onClick={() => update(`${path}.data.layout`, 'grid')}
            >
              ▦ Grille
            </button>
          </div>
        </Field>
      )}
      {section.type === 'media' && section.data.layout === 'grid' && (
        <Field label="Colonnes (ordinateur)">
          <Slider value={section.data.columns ?? 3} min={2} max={4} onChange={(v) => update(`${path}.data.columns`, v)} />
        </Field>
      )}
      {section.type === 'booking' && <BookingExtras path={path} />}
      {section.type === 'footer' && (
        <>
          <Field label="Numéro WhatsApp (international)">
            <input
              className="wl-input"
              placeholder="+216 20 000 000"
              value={section.data.whatsapp ?? ''}
              onChange={(e) => update(`${path}.data.whatsapp`, e.target.value)}
            />
            <p className="wl-hint" style={{ marginTop: 6 }}>
              Laissez vide pour masquer le bouton WhatsApp.
            </p>
          </Field>
          <Field label="Bouton WhatsApp flottant (coin de l'écran)">
            <button
              type="button"
              className={`wl-btn ${section.data.fabEnabled === false ? 'wl-btn-danger' : 'wl-btn-primary'}`}
              onClick={() => update(`${path}.data.fabEnabled`, section.data.fabEnabled === false ? true : false)}
            >
              {section.data.fabEnabled === false ? 'Désactivé — cliquer pour activer' : 'Activé — cliquer pour désactiver'}
            </button>
          </Field>
        </>
      )}
      <Field label="Visibilité">
        <button
          type="button"
          className={`wl-btn ${st.visible === false ? 'wl-btn-danger' : ''}`}
          onClick={() => setStyle({ visible: st.visible === false ? true : false })}
        >
          {st.visible === false ? '🙈 Masquée — cliquer pour afficher' : '👁 Visible — cliquer pour masquer'}
        </button>
      </Field>
      <Field label="Position">
        <div className="wl-row">
          <button type="button" className="wl-btn" disabled={index === 0} onClick={() => { arrayOp('page.sections', 'move', index, -1); select({ kind: 'section', path: `page.sections.${index - 1}` }); }}>
            ↑ Monter
          </button>
          <button type="button" className="wl-btn" disabled={index === count - 1} onClick={() => { arrayOp('page.sections', 'move', index, +1); select({ kind: 'section', path: `page.sections.${index + 1}` }); }}>
            ↓ Descendre
          </button>
        </div>
      </Field>
      <Field label="Danger">
        <button
          type="button"
          className="wl-btn wl-btn-danger"
          onClick={() => {
            if (window.confirm('Supprimer définitivement cette section ?')) {
              select(null);
              arrayOp('page.sections', 'remove', index);
            }
          }}
        >
          🗑 Supprimer la section
        </button>
      </Field>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Thème global                                                        */
/* ------------------------------------------------------------------ */
const COLOR_LABELS: Record<keyof Theme['colors'], string> = {
  background: 'Fond de page',
  surface: 'Fond des cartes / sections alternées',
  primary: 'Couleur principale (marque)',
  accent: "Couleur d'accent",
  highlight: 'Surbrillance (mots clés)',
  text: 'Texte',
  muted: 'Texte secondaire',
  star: 'Étoiles / notes',
};

function ThemeControl() {
  const { site, update } = useEdit();
  const t = site.theme;
  return (
    <>
      <Field label="Nom du site (onglet du navigateur)">
        <input className="wl-input" value={t.brand.siteTitle} onChange={(e) => update('theme.brand.siteTitle', e.target.value)} />
      </Field>
      <Field label="Description (référencement)">
        <textarea className="wl-textarea" rows={2} value={t.brand.description} onChange={(e) => update('theme.brand.description', e.target.value)} />
      </Field>
      <Field label="Police des titres">
        <FontSelect value={t.fonts.heading} allowInherit={false} onChange={(v) => v && !['heading', 'body'].includes(v) && update('theme.fonts.heading', v)} />
      </Field>
      <Field label="Police du texte">
        <FontSelect value={t.fonts.body} allowInherit={false} onChange={(v) => v && !['heading', 'body'].includes(v) && update('theme.fonts.body', v)} />
      </Field>
      <Field label="Arrondi des angles">
        <Slider value={t.radius} min={0} max={36} unit=" px" onChange={(v) => update('theme.radius', v)} />
      </Field>
      {(Object.keys(COLOR_LABELS) as Array<keyof Theme['colors']>).map((k) => (
        <Field key={k} label={COLOR_LABELS[k]}>
          <div className="wl-row">
            <input type="color" value={t.colors[k]} onChange={(e) => update(`theme.colors.${k}`, e.target.value)} />
            <input className="wl-input" style={{ flex: 1 }} value={t.colors[k]} onChange={(e) => update(`theme.colors.${k}`, e.target.value)} />
          </div>
        </Field>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Éléments de listes                                                  */
/* ------------------------------------------------------------------ */
function ServiceControl({ path }: { path: string }) {
  const { site, update } = useEdit();
  const item = getAtPath(site, path) as any;
  if (!item) return null;
  return (
    <>
      <Field label="Icône">
        <div className="wl-row" style={{ marginBottom: 8 }}>
          {SERVICE_ICON_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              className={`wl-btn ${item.icon === k ? 'wl-btn-primary' : ''}`}
              style={{ padding: 8, lineHeight: 0 }}
              title={serviceIconLabel(k)}
              onClick={() => update(`${path}.icon`, k)}
            >
              <ServiceIcon name={k} size={20} />
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`wl-btn ${!item.icon ? 'wl-btn-primary' : ''}`}
          onClick={() => update(`${path}.icon`, undefined)}
        >
          Utiliser un émoji à la place
        </button>
      </Field>
      {!item.icon && (
        <Field label="Émoji">
          <input className="wl-input" value={item.emoji ?? ''} onChange={(e) => update(`${path}.emoji`, e.target.value)} />
        </Field>
      )}
      <Field label="Fond de la carte">
        <ColorInput value={item.bg} onChange={(v) => update(`${path}.bg`, v)} />
        <p className="wl-hint" style={{ marginTop: 6 }}>
          Astuce : un dégradé CSS fonctionne aussi, ex. linear-gradient(160deg, #551ab2, #7b5ab2)
        </p>
      </Field>
      <p className="wl-hint">Cliquez directement sur le titre ou la description de la carte pour modifier les textes.</p>
    </>
  );
}

function WebsiteControl({ path }: { path: string }) {
  const { site, update } = useEdit();
  const item = getAtPath(site, path) as any;
  if (!item) return null;
  return (
    <>
      <Field label="Adresse du site (lien du bouton)">
        <input className="wl-input" value={item.url ?? ''} onChange={(e) => update(`${path}.url`, e.target.value)} />
      </Field>
      <Field label={item.shot?.mediaId ? 'Remplacer la capture' : 'Ajouter une capture'}>
        <FileButton accept="image/*" label="📱 Capture du site…" onDone={(id) => update(`${path}.shot`, { ...item.shot, mediaId: id })} />
      </Field>
      {item.shot?.mediaId && (
        <button type="button" className="wl-btn wl-btn-danger" onClick={() => update(`${path}.shot`, { ...item.shot, mediaId: null })}>
          Retirer la capture
        </button>
      )}
      <p className="wl-hint" style={{ marginTop: 12 }}>Cliquez sur le nom du site dans la page pour le modifier.</p>
    </>
  );
}

function TestimonialControl({ path }: { path: string }) {
  const { site, update } = useEdit();
  const item = getAtPath(site, path) as any;
  if (!item) return null;
  return (
    <>
      <p className="wl-hint" style={{ marginBottom: 12 }}>
        Deux formats : citation stylisée (par défaut) ou capture d'écran d'un vrai commentaire.
      </p>
      <Field label={item.image?.mediaId ? "Remplacer la capture d'avis" : "Utiliser une capture d'écran"}>
        <FileButton accept="image/*" label="🖼 Capture d'avis…" onDone={(id) => update(`${path}.image`, { ...item.image, mediaId: id })} />
      </Field>
      {item.image?.mediaId && (
        <button type="button" className="wl-btn wl-btn-danger" onClick={() => update(`${path}.image`, { ...item.image, mediaId: null })}>
          Revenir à la citation texte
        </button>
      )}
      {!item.image?.mediaId && <p className="wl-hint">Cliquez sur la citation ou l'auteur dans la carte pour modifier les textes.</p>}
    </>
  );
}

function SocialControl({ path }: { path: string }) {
  const { site, update } = useEdit();
  const item = getAtPath(site, path) as any;
  if (!item) return null;
  return (
    <>
      <Field label="Réseau">
        <select className="wl-select" value={item.kind} onChange={(e) => update(`${path}.kind`, e.target.value)}>
          {SOCIAL_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Lien">
        <input className="wl-input" value={item.url ?? ''} onChange={(e) => update(`${path}.url`, e.target.value)} />
      </Field>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Bouton d'appel à l'action (héro)                                    */
/* ------------------------------------------------------------------ */
function CtaControl({ path }: { path: string }) {
  const { site, update } = useEdit();
  const item = getAtPath(site, path) as any;
  if (!item) return null;
  return (
    <>
      <Field label="Lien du bouton">
        <input
          className="wl-input"
          placeholder="https://… ou #sec-services"
          value={item.url ?? ''}
          onChange={(e) => update(`${path}.url`, e.target.value)}
        />
        <p className="wl-hint" style={{ marginTop: 6 }}>
          Un lien commençant par # fait défiler vers une section de la page.
        </p>
      </Field>
      <Field label="Visibilité">
        <button
          type="button"
          className={`wl-btn ${item.enabled === false ? 'wl-btn-danger' : 'wl-btn-primary'}`}
          onClick={() => update(`${path}.enabled`, item.enabled === false ? true : false)}
        >
          {item.enabled === false ? 'Masqué — cliquer pour afficher' : 'Visible — cliquer pour masquer'}
        </button>
      </Field>
      <p className="wl-hint">Cliquez sur le texte du bouton dans la page pour le modifier.</p>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Lien du pied de page                                                */
/* ------------------------------------------------------------------ */
function LinkControl({ path }: { path: string }) {
  const { site, update } = useEdit();
  const item = getAtPath(site, path) as any;
  if (!item) return null;
  return (
    <>
      <Field label="Libellé">
        <input className="wl-input" value={item.label ?? ''} onChange={(e) => update(`${path}.label`, e.target.value)} />
      </Field>
      <Field label="Cible">
        <SectionTargetPicker value={item.href ?? ''} onChange={(v) => update(`${path}.href`, v)} />
      </Field>
    </>
  );
}

/** Sélecteur de cible : ancre de section ou lien libre. */
function SectionTargetPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { site } = useEdit();
  return (
    <>
      <select
        className="wl-select"
        style={{ marginBottom: 8 }}
        value={site.page.sections.some((s) => `#sec-${s.id}` === value) ? value : ''}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      >
        <option value="">— choisir une section —</option>
        {site.page.sections.map((s) => (
          <option key={s.id} value={`#sec-${s.id}`}>
            {SECTION_LABELS[s.type as SectionType] ?? s.type} ({s.data?.title?.text?.slice(0, 24) || s.id})
          </option>
        ))}
      </select>
      <input
        className="wl-input"
        placeholder="#sec-… ou https://…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Réservations : boîte de réception                                   */
/* ------------------------------------------------------------------ */
type Reservation = {
  id: number;
  name: string;
  email: string;
  phone: string;
  service: string | null;
  date: string;
  slot: string;
  message: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
};

const STATUS_FR: Record<Reservation['status'], { label: string; color: string }> = {
  pending: { label: 'En attente', color: '#ffb300' },
  confirmed: { label: 'Confirmée', color: '#35d07f' },
  cancelled: { label: 'Annulée', color: '#8a8a97' },
};

function ReservationsControl() {
  const { select, site } = useEdit();
  const [list, setList] = useState<Reservation[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState<number | null>(null);

  const load = () =>
    fetch('/api/reservations')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setList(d.reservations);
        setState('ready');
      })
      .catch(() => setState('error'));
  useEffect(() => {
    void load();
  }, []);

  const setStatus = async (id: number, status: Reservation['status']) => {
    setBusy(id);
    await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setBusy(null);
    void load();
  };

  const frDay = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  const brand = site.page.nav?.brand ?? site.theme.brand.siteTitle;

  if (state === 'loading') return <p className="wl-hint">Chargement…</p>;
  if (state === 'error') return <p className="wl-hint">Impossible de charger les réservations.</p>;
  return (
    <>
      <div className="wl-row" style={{ marginBottom: 14, justifyContent: 'space-between' }}>
        <span className="wl-hint">{list.length} réservation(s)</span>
        <button type="button" className="wl-btn" onClick={() => select({ kind: 'mailSettings', path: '' })}>
          ✉️ Réglages e-mail
        </button>
      </div>
      {!list.length && <p className="wl-hint">Aucune réservation pour le moment.</p>}
      {list.map((r) => {
        const wa = r.phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
        const confirmMsg = `Bonjour ${r.name}, votre réservation « ${r.service ?? ''} » du ${frDay(r.date)} à ${r.slot} est confirmée ✅ — ${brand}`;
        return (
          <div
            key={r.id}
            style={{ border: '1px solid #2c2c36', borderRadius: 12, padding: 12, marginBottom: 10 }}
          >
            <div className="wl-row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <strong style={{ fontSize: 14 }}>{r.name}</strong>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: STATUS_FR[r.status].color,
                  border: `1px solid ${STATUS_FR[r.status].color}44`,
                  borderRadius: 999,
                  padding: '3px 10px',
                }}
              >
                {STATUS_FR[r.status].label}
              </span>
            </div>
            <div className="wl-hint" style={{ marginBottom: 4 }}>
              📅 {frDay(r.date)} à {r.slot}
              {r.service ? ` — ${r.service}` : ''}
            </div>
            <div className="wl-hint" style={{ marginBottom: 8 }}>
              {r.email} · {r.phone}
            </div>
            {r.message && (
              <div className="wl-hint" style={{ marginBottom: 8, fontStyle: 'italic' }}>
                « {r.message} »
              </div>
            )}
            <div className="wl-row">
              {r.status !== 'confirmed' && (
                <button type="button" className="wl-btn wl-btn-primary" disabled={busy === r.id} onClick={() => setStatus(r.id, 'confirmed')}>
                  ✓ Confirmer
                </button>
              )}
              {r.status !== 'cancelled' && (
                <button type="button" className="wl-btn wl-btn-danger" disabled={busy === r.id} onClick={() => setStatus(r.id, 'cancelled')}>
                  ✕ Annuler
                </button>
              )}
              {wa && (
                <a
                  className="wl-btn"
                  style={{ textDecoration: 'none', background: '#144f2c', borderColor: '#1fb355' }}
                  href={`https://wa.me/${wa}?text=${encodeURIComponent(confirmMsg)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              )}
              <a className="wl-btn" style={{ textDecoration: 'none' }} href={`mailto:${r.email}`}>
                ✉️
              </a>
            </div>
          </div>
        );
      })}
      <p className="wl-hint" style={{ marginTop: 10 }}>
        « Confirmer » envoie automatiquement l'e-mail de confirmation au client. Le bouton WhatsApp
        ouvre une conversation avec un message pré-rempli.
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Réglages e-mail (SMTP + file d'attente)                             */
/* ------------------------------------------------------------------ */
function MailSettingsControl() {
  const [cfg, setCfg] = useState<Record<string, unknown> | null>(null);
  const [stats, setStats] = useState<{ queued: number; sent: number; failed: number; lastErrors: Array<{ to_email: string; error: string }> } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/mail-settings')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setCfg(d.config ?? {});
        setStats(d.stats);
      })
      .catch(() => setNote('Impossible de charger la configuration.'));
  }, []);

  if (!cfg) return <p className="wl-hint">{note ?? 'Chargement…'}</p>;
  const set = (k: string, v: unknown) => setCfg({ ...cfg, [k]: v });
  const field = (k: string, label: string, placeholder = '', type = 'text') => (
    <Field label={label}>
      <input
        className="wl-input"
        type={type}
        placeholder={placeholder}
        value={String(cfg[k] ?? '')}
        onChange={(e) => set(k, e.target.value)}
      />
    </Field>
  );

  const save = async () => {
    setBusy(true);
    setNote(null);
    const res = await fetch('/api/mail-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setStats(d.stats);
      setNote(
        d.flush && d.flush.sent > 0
          ? `Enregistré — ${d.flush.sent} e-mail(s) en attente envoyé(s) ✓`
          : 'Configuration enregistrée ✓',
      );
    } else setNote(d.error ?? 'Erreur lors de l’enregistrement');
    setBusy(false);
  };

  const test = async () => {
    setBusy(true);
    setNote(null);
    const res = await fetch('/api/mail-settings/test', { method: 'POST' });
    const d = await res.json().catch(() => ({}));
    setNote(res.ok ? 'E-mail de test envoyé ✓ — vérifiez votre boîte.' : (d.error ?? 'Échec du test'));
    setBusy(false);
  };

  return (
    <>
      {stats && (
        <p className="wl-hint" style={{ marginBottom: 14 }}>
          File d'attente : <strong>{stats.queued}</strong> en attente · {stats.sent} envoyé(s) ·{' '}
          {stats.failed} en erreur
        </p>
      )}
      {field('host', 'Serveur SMTP', 'smtp.gmail.com')}
      <div className="wl-row" style={{ marginBottom: 16 }}>
        <div style={{ width: 110 }}>
          <span className="wl-label">Port</span>
          <input className="wl-input" value={String(cfg.port ?? 465)} onChange={(e) => set('port', Number(e.target.value) || 465)} />
        </div>
        <button type="button" className={`wl-btn ${cfg.secure !== false ? 'wl-btn-primary' : ''}`} style={{ marginTop: 18 }} onClick={() => set('secure', cfg.secure === false)}>
          {cfg.secure !== false ? 'SSL activé' : 'SSL désactivé'}
        </button>
      </div>
      {field('user', 'Utilisateur', 'vous@gmail.com')}
      {field('pass', 'Mot de passe / clé API', 'mot de passe d’application', 'password')}
      {field('from', 'Expéditeur (From)', 'Ahmed Ameri <vous@gmail.com>')}
      {field('adminEmail', 'E-mail admin (notifications)', 'vous@gmail.com')}
      <div className="wl-row" style={{ marginBottom: 14 }}>
        <button type="button" className="wl-btn wl-btn-primary" disabled={busy} onClick={save}>
          {busy ? '…' : 'Enregistrer'}
        </button>
        <button type="button" className="wl-btn" disabled={busy} onClick={test}>
          Envoyer un e-mail de test
        </button>
      </div>
      {note && <p className="wl-hint" style={{ color: note.includes('✓') ? '#35d07f' : '#ffb300' }}>{note}</p>}
      {stats?.lastErrors?.length ? (
        <div style={{ marginTop: 10 }}>
          <span className="wl-label">Dernières erreurs</span>
          {stats.lastErrors.map((e, i) => (
            <p key={i} className="wl-hint" style={{ color: '#ff8585' }}>
              {e.to_email} — {e.error}
            </p>
          ))}
        </div>
      ) : null}
      <div style={{ marginTop: 16, borderTop: '1px solid #2c2c36', paddingTop: 12 }}>
        <p className="wl-hint">
          <strong>Gmail</strong> : smtp.gmail.com, port 465, SSL — créez un « mot de passe
          d'application » (compte Google → Sécurité → validation en 2 étapes).
          <br />
          <strong>Resend</strong> : smtp.resend.com, port 465, utilisateur « resend », mot de passe =
          clé API.
        </p>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Réglages de la section réservation                                  */
/* ------------------------------------------------------------------ */
const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function BookingExtras({ path }: { path: string }) {
  const { site, update, arrayOp } = useEdit();
  const data = getAtPath(site, `${path}.data`) as any;
  if (!data) return null;
  const schedule: Array<{ on: boolean; start: string; end: string }> = data.schedule ?? [];
  const services: string[] = data.services ?? [];
  return (
    <>
      <Field label="Services proposés">
        {services.map((s, j) => (
          <div key={j} className="wl-row" style={{ marginBottom: 6 }}>
            <input className="wl-input" style={{ flex: 1 }} value={s} onChange={(e) => update(`${path}.data.services.${j}`, e.target.value)} />
            <button type="button" className="wl-btn wl-btn-danger" onClick={() => arrayOp(`${path}.data.services`, 'remove', j)}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="wl-btn" onClick={() => arrayOp(`${path}.data.services`, 'insert', services.length, 'Nouveau service')}>
          ＋ Ajouter un service
        </button>
      </Field>
      <Field label="Durée d'un créneau (minutes — libre)">
        <div className="wl-row" style={{ marginBottom: 8 }}>
          {[15, 30, 45, 60, 90, 120].map((m) => (
            <button
              key={m}
              type="button"
              className={`wl-btn ${(data.slotMinutes ?? 60) === m ? 'wl-btn-primary' : ''}`}
              onClick={() => update(`${path}.data.slotMinutes`, m)}
            >
              {m >= 60 ? `${m / 60} h${m % 60 ? (m % 60) : ''}` : `${m} min`}
            </button>
          ))}
        </div>
        <input
          className="wl-input"
          type="number"
          min={5}
          max={480}
          step={5}
          value={data.slotMinutes ?? 60}
          onChange={(e) => {
            const v = Math.min(480, Math.max(5, Number(e.target.value) || 60));
            update(`${path}.data.slotMinutes`, v);
          }}
        />
      </Field>
      <Field label={`Réservation possible jusqu'à ${data.daysAhead ?? 30} jours à l'avance`}>
        <Slider value={data.daysAhead ?? 30} min={7} max={90} onChange={(v) => update(`${path}.data.daysAhead`, v)} />
      </Field>
      <Field label={`Préavis minimum : ${data.minNoticeHours ?? 12} h`}>
        <Slider value={data.minNoticeHours ?? 12} min={0} max={72} onChange={(v) => update(`${path}.data.minNoticeHours`, v)} />
      </Field>
      <Field label="Horaires hebdomadaires">
        {[1, 2, 3, 4, 5, 6, 0].map((day) => {
          const d = schedule[day] ?? { on: false, start: '09:00', end: '18:00' };
          return (
            <div key={day} className="wl-row" style={{ marginBottom: 6 }}>
              <button
                type="button"
                className={`wl-btn ${d.on ? 'wl-btn-primary' : ''}`}
                style={{ width: 92, fontSize: 12 }}
                onClick={() => update(`${path}.data.schedule.${day}`, { ...d, on: !d.on })}
              >
                {DAY_NAMES[day].slice(0, 3)} {d.on ? '✓' : '—'}
              </button>
              <input type="time" className="wl-input" style={{ width: 96 }} value={d.start} disabled={!d.on} onChange={(e) => update(`${path}.data.schedule.${day}`, { ...d, start: e.target.value })} />
              <span className="wl-hint">→</span>
              <input type="time" className="wl-input" style={{ width: 96 }} value={d.end} disabled={!d.on} onChange={(e) => update(`${path}.data.schedule.${day}`, { ...d, end: e.target.value })} />
            </div>
          );
        })}
      </Field>
      <DateOverridesEditor path={path} />
      <p className="wl-hint" style={{ marginBottom: 14 }}>
        Pensez à « Enregistrer » : les créneaux proposés aux visiteurs suivent ces réglages.
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Exceptions par date : fermé / horaires / créneaux à la carte        */
/* ------------------------------------------------------------------ */
function DateOverridesEditor({ path }: { path: string }) {
  const { site, update, arrayOp } = useEdit();
  const [newDate, setNewDate] = useState('');
  const data = getAtPath(site, `${path}.data`) as any;
  const overrides: Array<{ date: string; mode: 'closed' | 'custom'; start?: string; end?: string; slots?: string[] }> =
    data?.overrides ?? [];
  const step = Math.max(5, data?.slotMinutes ?? 60);

  const generate = (start: string, end: string): string[] => {
    const toMin = (s: string) => {
      const [h, m] = s.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const out: string[] = [];
    for (let m = toMin(start); m + step <= toMin(end); m += step) {
      out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    }
    return out;
  };

  const frDay = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const today = new Date().toISOString().slice(0, 10);
  const sorted = overrides.map((o, k) => ({ o, k })).sort((a, b) => a.o.date.localeCompare(b.o.date));

  return (
    <Field label="Dates spécifiques (exceptions)">
      <p className="wl-hint" style={{ marginBottom: 8 }}>
        Fermez un jour, changez ses horaires ou choisissez les créneaux un par un — prioritaire sur
        le planning hebdomadaire.
      </p>
      <div className="wl-row" style={{ marginBottom: 10 }}>
        <input type="date" className="wl-input" style={{ flex: 1 }} value={newDate} min={today} onChange={(e) => setNewDate(e.target.value)} />
        <button
          type="button"
          className="wl-btn wl-btn-primary"
          disabled={!newDate || overrides.some((o) => o.date === newDate)}
          onClick={() => {
            arrayOp(`${path}.data.overrides`, 'insert', overrides.length, {
              date: newDate,
              mode: 'custom',
              start: '09:00',
              end: '18:00',
            });
            setNewDate('');
          }}
        >
          ＋ Ajouter
        </button>
      </div>
      {sorted.map(({ o, k }) => {
        const base = `${path}.data.overrides.${k}`;
        const candidates =
          o.mode === 'custom'
            ? [...new Set([...generate(o.start ?? '09:00', o.end ?? '18:00'), ...(o.slots ?? [])])].sort()
            : [];
        const active = (slot: string) => (o.slots?.length ? o.slots.includes(slot) : true);
        const past = o.date < today;
        return (
          <div key={o.date} style={{ border: '1px solid #2c2c36', borderRadius: 12, padding: 10, marginBottom: 10, opacity: past ? 0.55 : 1 }}>
            <div className="wl-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>
                {frDay(o.date)}
                {past ? ' (passée)' : ''}
              </strong>
              <button type="button" className="wl-btn wl-btn-danger" onClick={() => arrayOp(`${path}.data.overrides`, 'remove', k)}>
                ✕
              </button>
            </div>
            <div className="wl-row" style={{ marginBottom: 8 }}>
              <button
                type="button"
                className={`wl-btn ${o.mode === 'closed' ? 'wl-btn-danger' : ''}`}
                onClick={() => update(base, { ...o, mode: 'closed' })}
              >
                🚫 Fermé
              </button>
              <button
                type="button"
                className={`wl-btn ${o.mode === 'custom' ? 'wl-btn-primary' : ''}`}
                onClick={() => update(base, { date: o.date, mode: 'custom', start: o.start ?? '09:00', end: o.end ?? '18:00' })}
              >
                🕐 Créneaux personnalisés
              </button>
            </div>
            {o.mode === 'custom' && (
              <>
                <div className="wl-row" style={{ marginBottom: 8 }}>
                  <input
                    type="time"
                    className="wl-input"
                    style={{ width: 96 }}
                    value={o.start ?? '09:00'}
                    onChange={(e) => update(base, { ...o, start: e.target.value, slots: undefined })}
                  />
                  <span className="wl-hint">→</span>
                  <input
                    type="time"
                    className="wl-input"
                    style={{ width: 96 }}
                    value={o.end ?? '18:00'}
                    onChange={(e) => update(base, { ...o, end: e.target.value, slots: undefined })}
                  />
                </div>
                <div className="wl-row">
                  {candidates.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className="wl-btn"
                      style={{
                        padding: '5px 10px',
                        fontSize: 12,
                        background: active(slot) ? 'var(--c-primary, #551ab2)' : '#17171d',
                        opacity: active(slot) ? 1 : 0.5,
                        textDecoration: active(slot) ? 'none' : 'line-through',
                      }}
                      title={active(slot) ? 'Cliquer pour retirer ce créneau' : 'Cliquer pour proposer ce créneau'}
                      onClick={() => {
                        const current = o.slots?.length ? o.slots : candidates;
                        const next = active(slot) ? current.filter((s) => s !== slot) : [...current, slot].sort();
                        update(base, { ...o, slots: next });
                      }}
                    >
                      {slot}
                    </button>
                  ))}
                  {!candidates.length && <span className="wl-hint">Aucun créneau dans cette plage.</span>}
                </div>
              </>
            )}
          </div>
        );
      })}
    </Field>
  );
}

/* ------------------------------------------------------------------ */
/* Barre de navigation                                                 */
/* ------------------------------------------------------------------ */
function NavControl() {
  const { site, update, arrayOp } = useEdit();
  const nav = site.page.nav;
  if (!nav) return <p className="wl-hint">Aucune barre de navigation configurée.</p>;
  return (
    <>
      <Field label="Affichage">
        <button
          type="button"
          className={`wl-btn ${nav.enabled === false ? 'wl-btn-danger' : 'wl-btn-primary'}`}
          onClick={() => update('page.nav.enabled', nav.enabled === false)}
        >
          {nav.enabled === false ? 'Masquée — cliquer pour afficher' : 'Visible — cliquer pour masquer'}
        </button>
      </Field>
      <Field label="Nom de la marque">
        <input className="wl-input" value={nav.brand} onChange={(e) => update('page.nav.brand', e.target.value)} />
      </Field>
      <Field label="Logo">
        <div className="wl-row">
          <FileButton accept="image/*" label="🖼 Logo…" onDone={(id) => update('page.nav.logoMediaId', id)} />
          {nav.logoMediaId && (
            <button type="button" className="wl-btn wl-btn-danger" onClick={() => update('page.nav.logoMediaId', null)}>
              Retirer
            </button>
          )}
        </div>
      </Field>
      <Field label="Liens du menu">
        {nav.links.map((l, j) => (
          <div key={j} style={{ border: '1px solid #2c2c36', borderRadius: 10, padding: 10, marginBottom: 10 }}>
            <input
              className="wl-input"
              style={{ marginBottom: 8 }}
              value={l.label}
              placeholder="Libellé"
              onChange={(e) => update(`page.nav.links.${j}.label`, e.target.value)}
            />
            <SectionTargetPicker value={l.href} onChange={(v) => update(`page.nav.links.${j}.href`, v)} />
            <div className="wl-row" style={{ marginTop: 8 }}>
              <button type="button" className="wl-btn" disabled={j === 0} onClick={() => arrayOp('page.nav.links', 'move', j, -1)}>
                ↑
              </button>
              <button
                type="button"
                className="wl-btn"
                disabled={j === nav.links.length - 1}
                onClick={() => arrayOp('page.nav.links', 'move', j, +1)}
              >
                ↓
              </button>
              <button type="button" className="wl-btn wl-btn-danger" onClick={() => arrayOp('page.nav.links', 'remove', j)}>
                ✕ Retirer
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="wl-btn"
          onClick={() => arrayOp('page.nav.links', 'insert', nav.links.length, { label: 'Nouveau lien', href: '#top' })}
        >
          ＋ Ajouter un lien
        </button>
      </Field>
      <Field label="Bouton d'action (droite)">
        <input
          className="wl-input"
          style={{ marginBottom: 8 }}
          value={nav.cta?.label ?? ''}
          placeholder="Libellé du bouton"
          onChange={(e) => update('page.nav.cta.label', e.target.value)}
        />
        <input
          className="wl-input"
          style={{ marginBottom: 8 }}
          value={nav.cta?.url ?? ''}
          placeholder="Lien (https://… ou #sec-…)"
          onChange={(e) => update('page.nav.cta.url', e.target.value)}
        />
        <button
          type="button"
          className={`wl-btn ${nav.cta?.enabled === false ? 'wl-btn-danger' : 'wl-btn-primary'}`}
          onClick={() => update('page.nav.cta.enabled', nav.cta?.enabled === false)}
        >
          {nav.cta?.enabled === false ? 'Bouton masqué' : 'Bouton visible'}
        </button>
      </Field>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Ajouter une section                                                 */
/* ------------------------------------------------------------------ */
// une seule instance autorisée : ces sections partagent un état global
const UNIQUE_SECTIONS: SectionType[] = ['booking'];

function AddSectionControl() {
  const { site, arrayOp, select } = useEdit();
  const sections = site.page.sections;
  return (
    <>
      <p className="wl-hint" style={{ marginBottom: 14 }}>
        La nouvelle section est insérée avant le pied de page. Vous pourrez la déplacer ensuite.
      </p>
      {(Object.keys(SECTION_LABELS) as SectionType[]).map((type) => {
        const existingIdx = sections.findIndex((s) => s.type === type);
        const locked = UNIQUE_SECTIONS.includes(type) && existingIdx !== -1;
        return (
          <button
            key={type}
            type="button"
            className="wl-btn"
            style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 8, opacity: locked ? 0.6 : 1 }}
            title={locked ? 'Déjà présente — un site n’a qu’un seul agenda de réservation' : undefined}
            onClick={() => {
              if (locked) {
                // ouvre directement les réglages de la section existante
                select({ kind: 'section', path: `page.sections.${existingIdx}` });
                return;
              }
              const last = sections[sections.length - 1];
              const at = last?.type === 'footer' ? sections.length - 1 : sections.length;
              arrayOp('page.sections', 'insert', at, newSection(type));
              select({ kind: 'section', path: `page.sections.${at}` });
            }}
          >
            {locked ? `⚙ ${SECTION_LABELS[type]} — déjà présente, ouvrir ses réglages` : `＋ ${SECTION_LABELS[type]}`}
          </button>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Historique                                                          */
/* ------------------------------------------------------------------ */
function HistoryControl() {
  const { replaceSite } = useEdit();
  const [list, setList] = useState<Array<{ id: number; saved_at: string }>>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    fetch('/api/revisions')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setList(d.revisions);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, []);
  if (state === 'loading') return <p className="wl-hint">Chargement…</p>;
  if (state === 'error') return <p className="wl-hint">Impossible de charger l'historique.</p>;
  if (!list.length) return <p className="wl-hint">Aucune version enregistrée pour le moment.</p>;
  return (
    <>
      <p className="wl-hint" style={{ marginBottom: 12 }}>
        Chaque « Enregistrer » crée une version. Restaurer remplace la page actuelle (et l'enregistre).
      </p>
      {list.map((r) => (
        <div key={r.id} className="wl-row" style={{ marginBottom: 8, justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13 }}>
            #{r.id} — {new Date(r.saved_at).toLocaleString('fr-FR')}
          </span>
          <button
            type="button"
            className="wl-btn"
            onClick={async () => {
              const res = await fetch('/api/revisions/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: r.id }),
              });
              if (res.ok) replaceSite(await res.json());
            }}
          >
            Restaurer
          </button>
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Panneau latéral                                                     */
/* ------------------------------------------------------------------ */
const TITLES: Record<string, string> = {
  text: '✏️ Texte',
  image: '🖼 Image',
  video: '🎬 Vidéo',
  section: '⚙ Section',
  theme: '🎨 Thème du site',
  nav: '🧭 Barre de navigation',
  'item-service': '🧩 Carte service',
  'item-website': '🌐 Site réalisé',
  'item-testimonial': '⭐ Avis client',
  'item-social': '🔗 Réseau social',
  'item-cta': '🔘 Bouton d’action',
  'item-link': '🔗 Lien',
  reservations: '📅 Réservations',
  mailSettings: '✉️ Réglages e-mail',
  addSection: '➕ Ajouter une section',
  history: '🕘 Historique des versions',
};

// panneaux accessibles hors mode édition (consultation admin)
const ADMIN_PANELS = ['reservations', 'mailSettings'];

export default function SidePanel() {
  const { editMode, selected, select, site } = useEdit();
  if (!selected) return null;
  if (!editMode && !ADMIN_PANELS.includes(selected.kind)) return null;
  // L'élément peut avoir disparu (annulation, suppression…)
  if (selected.path && getAtPath(site, selected.path) === undefined) {
    return null;
  }
  const body = (() => {
    switch (selected.kind) {
      case 'text':
        return <TextControl path={selected.path} />;
      case 'image':
        return <ImageControl path={selected.path} />;
      case 'video':
        return <VideoControl path={selected.path} />;
      case 'section':
        return <SectionControl path={selected.path} />;
      case 'theme':
        return <ThemeControl />;
      case 'item-service':
        return <ServiceControl path={selected.path} />;
      case 'item-website':
        return <WebsiteControl path={selected.path} />;
      case 'item-testimonial':
        return <TestimonialControl path={selected.path} />;
      case 'item-social':
        return <SocialControl path={selected.path} />;
      case 'item-cta':
        return <CtaControl path={selected.path} />;
      case 'item-link':
        return <LinkControl path={selected.path} />;
      case 'nav':
        return <NavControl />;
      case 'reservations':
        return <ReservationsControl />;
      case 'mailSettings':
        return <MailSettingsControl />;
      case 'addSection':
        return <AddSectionControl />;
      case 'history':
        return <HistoryControl />;
      default:
        return null;
    }
  })();
  return (
    <aside className="wl-panel" onClick={(e) => e.stopPropagation()}>
      <div className="wl-panel-head">
        <h3>{TITLES[selected.kind] ?? 'Édition'}</h3>
        <button type="button" className="wl-btn" onClick={() => select(null)} title="Fermer (Échap)">
          ✕
        </button>
      </div>
      {body}
    </aside>
  );
}
