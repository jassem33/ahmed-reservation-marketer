'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import React from 'react';
import type { ImageNode, TextNode, VideoNode } from '@/lib/types';
import { fontFamily } from '@/lib/fonts';
import { useEdit } from './EditContext';

export const mediaUrl = (id: string) => `/api/media/${id}`;

/** Taille de police responsive : pleine taille sur desktop, réduite en vw sur mobile. */
export function respSize(px: number): string {
  if (px <= 20) return `${px}px`;
  const min = Math.min(px, Math.max(17, Math.round(px * 0.58)));
  return `clamp(${min}px, ${(px / 11.5).toFixed(2)}vw, ${px}px)`;
}

/** Enveloppe éditable : en mode édition, survol + clic → sélection dans le panneau. */
export function E({
  path,
  kind,
  as: Tag = 'div',
  className = '',
  style,
  children,
}: {
  path: string;
  kind: string;
  as?: any;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const { editMode, select, selected, hovered, setHovered } = useEdit();
  if (!editMode) {
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }
  const cls = [
    className,
    'wl-editable',
    hovered === path ? 'wl-hover' : '',
    selected?.path === path ? 'wl-selected' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag
      className={cls}
      style={style}
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        select({ kind, path });
      }}
      onMouseOver={(e: React.MouseEvent) => {
        e.stopPropagation();
        setHovered(path);
      }}
      onMouseOut={() => setHovered(null)}
    >
      {children}
    </Tag>
  );
}

export type TextBase = Partial<Omit<TextNode, 'text'>>;

/** Texte dynamique : le nœud stocké surcharge les valeurs de base du gabarit. */
export function T({
  path,
  node,
  base = {},
  as = 'div',
  className = '',
}: {
  path: string;
  node?: TextNode;
  base?: TextBase;
  as?: any;
  className?: string;
}) {
  const { editMode } = useEdit();
  const n = node ?? { text: '' };
  const s: TextNode = { ...base, ...Object.fromEntries(Object.entries(n).filter(([, v]) => v !== undefined)) } as TextNode;
  const style: React.CSSProperties = {
    fontFamily: fontFamily(s.font, 'body'),
    fontSize: respSize(s.size ?? 18),
    fontWeight: s.weight,
    color: s.color,
    textAlign: s.align,
    lineHeight: s.lh,
    letterSpacing: s.ls !== undefined ? `${s.ls}px` : undefined,
    textTransform: s.transform,
    whiteSpace: 'pre-line',
  };
  return (
    <E path={path} kind="text" as={as} className={className} style={style}>
      {n.text !== '' ? n.text : editMode ? <span style={{ opacity: 0.4 }}>Texte…</span> : null}
    </E>
  );
}

/** Image dynamique (remplie ou espace réservé). */
export function Img({
  path,
  node,
  className = '',
  natural = false,
  placeholderLabel = 'Image',
}: {
  path: string;
  node?: ImageNode;
  className?: string;
  natural?: boolean;
  placeholderLabel?: string;
}) {
  const { editMode } = useEdit();
  const content = node?.mediaId ? (
    <img
      src={mediaUrl(node.mediaId)}
      alt={node.alt ?? ''}
      className={natural ? 'wl-img-nat' : 'wl-img'}
      draggable={false}
    />
  ) : (
    <div className={natural ? 'wl-img-ph-nat' : 'wl-img-ph'}>
      <span>{editMode ? `＋ ${placeholderLabel}` : ''}</span>
    </div>
  );
  return (
    <E path={path} kind="image" className={className}>
      {content}
    </E>
  );
}

/** Vidéo dynamique : lecture au clic (préchargement léger), poster optionnel. */
export function Vid({ path, node, className = '' }: { path: string; node?: VideoNode; className?: string }) {
  const { editMode } = useEdit();
  if (!node?.mediaId && !editMode) return null;
  return (
    <E path={path} kind="video" className={className}>
      <div className="wl-tile">
        {node?.mediaId ? (
          <video
            src={mediaUrl(node.mediaId)}
            poster={node.posterId ? mediaUrl(node.posterId) : undefined}
            controls={!editMode}
            preload={node.posterId ? 'none' : 'metadata'}
            playsInline
            className="wl-video"
            style={editMode ? { pointerEvents: 'none' } : undefined}
          />
        ) : (
          <div className="wl-img-ph">
            <span>＋ Vidéo</span>
          </div>
        )}
      </div>
      {node?.caption ? <div className="wl-vid-caption">{node.caption}</div> : null}
    </E>
  );
}

/** Coquille d'élément de liste : réordonner / supprimer + sélection éventuelle. */
export function ItemShell({
  parent,
  index,
  count,
  path,
  kind,
  className = '',
  children,
}: {
  parent: string;
  index: number;
  count: number;
  path: string;
  kind?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { editMode, arrayOp, select, selected, hovered, setHovered } = useEdit();
  if (!editMode) return <div className={className}>{children}</div>;
  const active = selected?.path === path;
  return (
    <div
      className={[className, 'wl-item', active ? 'wl-selected' : '', hovered === path ? 'wl-hover' : '']
        .filter(Boolean)
        .join(' ')}
      onClick={(e) => {
        if (!kind) return;
        e.preventDefault();
        e.stopPropagation();
        select({ kind, path });
      }}
      onMouseOver={(e) => {
        e.stopPropagation();
        setHovered(path);
      }}
      onMouseOut={() => setHovered(null)}
    >
      <div className="wl-item-tools" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          title="Déplacer avant"
          disabled={index === 0}
          onClick={() => arrayOp(parent, 'move', index, -1)}
        >
          ‹
        </button>
        <button
          type="button"
          title="Déplacer après"
          disabled={index === count - 1}
          onClick={() => arrayOp(parent, 'move', index, +1)}
        >
          ›
        </button>
        <button
          type="button"
          title="Supprimer"
          className="wl-danger"
          onClick={() => {
            select(null);
            arrayOp(parent, 'remove', index);
          }}
        >
          ✕
        </button>
      </div>
      {children}
    </div>
  );
}

/** Tuile « + Ajouter » visible uniquement en mode édition. */
export function AddTile({
  onClick,
  label = 'Ajouter',
  className = '',
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  const { editMode } = useEdit();
  if (!editMode) return null;
  return (
    <button
      type="button"
      className={`wl-add ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      ＋ {label}
    </button>
  );
}
