'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import type {
  ClientsData,
  CtaNode,
  FooterData,
  HeroData,
  MediaData,
  Section,
  SectionType,
  ServicesData,
  SiteFooterData,
  StatsData,
  TestimonialsData,
  TextNode,
  WebsitesData,
} from '@/lib/types';
import {
  newClientItem,
  newProofItem,
  newServiceItem,
  newSocialItem,
  newStatItem,
  newTestimonialItem,
  newVideoItem,
  newWebsiteItem,
} from '@/lib/templates';
import { useEdit } from './EditContext';
import { AddTile, E, Img, ItemShell, T, Vid } from './atoms';
import { SocialIcon } from './icons';
import { hasServiceIcon, ServiceIcon } from './service-icons';
import Carousel, { AutoMarquee } from './Carousel';
import { CountUp, Reveal } from './fx';
import BookingForm from './BookingForm';

type SP = { sec: Section; i: number };

/* ------------------------------------------------------------------ */
/* En-tête de section standardisé : surtitre, titre, sous-titre        */
/* ------------------------------------------------------------------ */
function SectionHeader({
  p,
  eyebrow,
  title,
  subtitle,
  center = false,
}: {
  p: string;
  eyebrow?: TextNode;
  title?: TextNode;
  subtitle?: TextNode;
  center?: boolean;
}) {
  const { editMode } = useEdit();
  return (
    <Reveal>
      <div className={`mb-10 md:mb-14 ${center ? 'flex flex-col items-center text-center' : ''}`}>
        {(eyebrow?.text || editMode) && eyebrow !== undefined && (
          <T
            path={`${p}.eyebrow`}
            node={eyebrow}
            base={{ font: 'body', size: 13, color: 'var(--c-highlight)', transform: 'uppercase', ls: 3, weight: 700 }}
            className={`wl-eyebrow mb-4 ${center ? 'justify-center' : ''}`}
          />
        )}
        {title && (
          <T
            path={`${p}.title`}
            node={title}
            base={{ font: 'heading', size: 44, transform: 'uppercase', lh: 1.1, align: center ? 'center' : 'left' }}
          />
        )}
        {subtitle && (subtitle.text || editMode) && (
          <T
            path={`${p}.subtitle`}
            node={subtitle}
            base={{ font: 'body', size: 16, color: 'var(--c-muted)', lh: 1.65, align: center ? 'center' : 'left' }}
            className={`mt-4 max-w-2xl ${center ? 'mx-auto' : ''}`}
          />
        )}
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Boutons d'appel à l'action éditables                                */
/* ------------------------------------------------------------------ */
function CtaButton({ path, node, ghost = false }: { path: string; node?: CtaNode; ghost?: boolean }) {
  const { editMode } = useEdit();
  if (!node || (node.enabled === false && !editMode)) return null;
  return (
    <E path={path} kind="item-cta" as="span" className="inline-flex">
      <a
        href={node.url || '#'}
        onClick={(e) => editMode && e.preventDefault()}
        className={ghost ? 'wl-btn-ghost' : 'wl-btn-cta'}
        style={node.enabled === false ? { opacity: 0.4 } : undefined}
      >
        <T path={`${path}.label`} node={node.label} base={{ font: 'body', size: 14, weight: 600 }} as="span" />
        {!ghost && <span aria-hidden>→</span>}
      </a>
    </E>
  );
}

/* ------------------------------------------------------------------ */
/* Héro                                                                */
/* ------------------------------------------------------------------ */
function Hero({ sec, i }: SP) {
  const d = sec.data as HeroData;
  const p = `page.sections.${i}.data`;
  const { editMode } = useEdit();
  const badges = d.badges ?? [];
  return (
    <>
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="wl-hero-glow -top-40 -left-40" />
        <div className="relative grid items-center gap-12 lg:grid-cols-12">
          {/* Colonne texte */}
          <div className="flex flex-col items-start gap-5 lg:col-span-7">
            <T
              path={`${p}.handle`}
              node={d.handle}
              base={{ font: 'body', size: 13, color: 'var(--c-muted)', weight: 600, ls: 1 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2"
              as="div"
            >
            </T>
            <div>
              <T
                path={`${p}.titleTop`}
                node={d.titleTop}
                base={{ font: 'heading', size: 58, transform: 'uppercase', lh: 1.03 }}
              />
              <T
                path={`${p}.name`}
                node={d.name}
                base={{ font: 'heading', size: 64, transform: 'uppercase', lh: 1.03, color: 'var(--c-highlight)' }}
              />
            </div>
            <T
              path={`${p}.subtitle`}
              node={d.subtitle}
              base={{ font: 'body', size: 17, color: 'var(--c-muted)', lh: 1.7 }}
              className="max-w-lg"
            />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <CtaButton path={`${p}.ctaPrimary`} node={d.ctaPrimary} />
              <CtaButton path={`${p}.ctaSecondary`} node={d.ctaSecondary} ghost />
            </div>
            <div className="mt-4 flex items-center gap-3 text-sm" style={{ color: 'var(--c-muted)' }}>
              <span className="wl-pulse" />
              <T
                path={`${p}.logoTagline`}
                node={d.logoTagline}
                base={{ font: 'body', size: 12, color: 'var(--c-muted)', transform: 'uppercase', ls: 3 }}
                as="span"
              />
            </div>
          </div>
          {/* Colonne visuelle */}
          <div className="relative mx-auto w-full max-w-sm lg:col-span-5">
            <div
              className="absolute -inset-3 opacity-60"
              style={{
                background: 'linear-gradient(160deg, var(--c-primary), transparent 60%)',
                borderRadius: 'calc(var(--radius) + 14px)',
                filter: 'blur(2px)',
              }}
            />
            <div
              className="relative aspect-[4/5] overflow-hidden border border-white/10"
              style={{ borderRadius: 'calc(var(--radius) + 8px)' }}
            >
              <Img path={`${p}.photo`} node={d.photo} className="absolute inset-0" placeholderLabel="Photo" />
            </div>
            {(badges[0] || editMode) && badges[0] && (
              <div className="wl-hero-chip -left-6 top-8 hidden sm:block">
                <T
                  path={`${p}.badges.0.value`}
                  node={badges[0].value}
                  base={{ font: 'heading', size: 22, color: 'var(--c-highlight)' }}
                />
                <T
                  path={`${p}.badges.0.label`}
                  node={badges[0].label}
                  base={{ font: 'body', size: 11, color: 'var(--c-muted)' }}
                />
              </div>
            )}
            {(badges[1] || editMode) && badges[1] && (
              <div className="wl-hero-chip -right-4 bottom-10 hidden sm:block">
                <T
                  path={`${p}.badges.1.value`}
                  node={badges[1].value}
                  base={{ font: 'heading', size: 22, color: 'var(--c-highlight)' }}
                />
                <T
                  path={`${p}.badges.1.label`}
                  node={badges[1].label}
                  base={{ font: 'body', size: 11, color: 'var(--c-muted)' }}
                />
              </div>
            )}
            {/* logo en médaillon */}
            {(d.logo?.mediaId || editMode) && (
              <div
                className="absolute -bottom-5 left-1/2 h-14 w-14 -translate-x-1/2 overflow-hidden rounded-2xl border border-white/15 shadow-xl"
                style={{ background: 'var(--c-surface)' }}
              >
                <Img path={`${p}.logo`} node={d.logo} className="absolute inset-0" placeholderLabel="Logo" />
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Bandeau défilant */}
      {(d.marqueeText?.text || editMode) && d.marqueeText && (
        <div className="wl-marquee mt-16 md:mt-20">
          <div className="wl-marquee-inner">
            {[0, 1].map((k) => (
              <T
                key={k}
                path={`${p}.marqueeText`}
                node={d.marqueeText}
                base={{ font: 'heading', size: 15, color: 'var(--c-muted)', transform: 'uppercase', ls: 4 }}
                as="span"
                className="px-6"
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */
function Services({ sec, i }: SP) {
  const d = sec.data as ServicesData & { eyebrow?: TextNode };
  const p = `page.sections.${i}.data`;
  const { arrayOp } = useEdit();
  return (
    <div className="mx-auto max-w-6xl px-6">
      <SectionHeader p={p} eyebrow={d.eyebrow} title={d.title} subtitle={d.subtitle} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {d.items.map((it, j) => (
          <Reveal key={j} delay={j * 70}>
            <ItemShell
              parent={`${p}.items`}
              index={j}
              count={d.items.length}
              path={`${p}.items.${j}`}
              kind="item-service"
              className="h-full"
            >
              {(it as any).image?.mediaId ? (
                <div
                  className="wl-card relative h-full overflow-hidden"
                  style={{ aspectRatio: '1 / 1', borderRadius: 'var(--radius)' }}
                >
                  <Img
                    path={`${p}.items.${j}.image`}
                    node={(it as any).image}
                    className="absolute inset-0"
                    placeholderLabel="Image"
                  />
                </div>
              ) : (
                <div
                  className="wl-card flex h-full flex-col gap-3 p-6"
                  style={{
                    background: it.bg || 'linear-gradient(165deg, var(--c-primary), color-mix(in srgb, var(--c-primary) 45%, #000))',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/10"
                    style={{ fontSize: 24, color: '#fff' }}
                  >
                    {hasServiceIcon((it as any).icon) ? <ServiceIcon name={(it as any).icon} /> : it.emoji}
                  </div>
                  <T
                    path={`${p}.items.${j}.title`}
                    node={it.title}
                    base={{ font: 'heading', size: 21, transform: 'uppercase', lh: 1.18 }}
                    className="mt-1"
                  />
                  <T
                    path={`${p}.items.${j}.desc`}
                    node={it.desc}
                    base={{ font: 'body', size: 14, color: 'rgba(255,255,255,.82)', lh: 1.65 }}
                  />
                </div>
              )}
            </ItemShell>
          </Reveal>
        ))}
        <AddTile
          label="Service"
          className="min-h-44"
          onClick={() => arrayOp(`${p}.items`, 'insert', d.items.length, newServiceItem())}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Grille / carrousel de vidéos                                        */
/* ------------------------------------------------------------------ */
function MediaGrid({ sec, i }: SP) {
  const d = sec.data as MediaData & { eyebrow?: TextNode; layout?: string };
  const p = `page.sections.${i}.data`;
  const { editMode, arrayOp } = useEdit();
  const items = d.items
    .map((it, j) => ({ it, j }))
    .filter(({ it }) => editMode || it.mediaId);
  const tiles = items.map(({ it, j }) => (
    <ItemShell key={j} parent={`${p}.items`} index={j} count={d.items.length} path={`${p}.items.${j}`}>
      <Vid path={`${p}.items.${j}`} node={it} />
    </ItemShell>
  ));
  const addTile = (
    <AddTile
      key="add"
      label="Vidéo"
      className="aspect-[9/16] w-full"
      onClick={() => arrayOp(`${p}.items`, 'insert', d.items.length, newVideoItem())}
    />
  );
  return (
    <div className="mx-auto max-w-6xl px-6">
      <SectionHeader p={p} eyebrow={d.eyebrow} title={d.title} subtitle={d.subtitle} />
      {d.layout === 'grid' ? (
        <div className="wl-grid" style={{ ['--cols' as any]: d.columns || 3 }}>
          {tiles}
          {addTile}
        </div>
      ) : (
        <Reveal>
          <Carousel itemWidth="clamp(210px, 58vw, 260px)" ariaLabel="Vidéos">
            {editMode ? [...tiles, addTile] : tiles}
          </Carousel>
        </Reveal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sites web réalisés                                                  */
/* ------------------------------------------------------------------ */
function Websites({ sec, i }: SP) {
  const d = sec.data as WebsitesData & { eyebrow?: TextNode; layout?: string };
  const p = `page.sections.${i}.data`;
  const { editMode, arrayOp } = useEdit();
  const cards = d.items.map((it, j) => (
    <ItemShell
      key={j}
      parent={`${p}.items`}
      index={j}
      count={d.items.length}
      path={`${p}.items.${j}`}
      kind="item-website"
      className="flex h-full flex-col items-center gap-4"
    >
      <div
        className="wl-card relative w-full overflow-hidden"
        style={{ aspectRatio: '9/17', borderRadius: '140px 140px 24px 24px' }}
      >
        <Img path={`${p}.items.${j}.shot`} node={it.shot} className="absolute inset-0" placeholderLabel="Capture" />
      </div>
      <T path={`${p}.items.${j}.name`} node={it.name} base={{ font: 'body', size: 15, weight: 700, align: 'center' }} />
      <a
        href={it.url}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => editMode && e.preventDefault()}
        className="wl-btn-cta"
        style={{ padding: '9px 20px', fontSize: 13 }}
      >
        <T path={`${p}.buttonText`} node={d.buttonText} base={{ font: 'body', size: 13, weight: 700 }} as="span" />
      </a>
    </ItemShell>
  ));
  const addTile = (
    <AddTile
      key="add"
      label="Site web"
      className="min-h-72 w-full"
      onClick={() => arrayOp(`${p}.items`, 'insert', d.items.length, newWebsiteItem())}
    />
  );
  return (
    <div className="mx-auto max-w-6xl px-6">
      <SectionHeader p={p} eyebrow={d.eyebrow} title={d.title} subtitle={(d as any).subtitle} />
      {d.layout === 'grid' ? (
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {cards}
          {addTile}
        </div>
      ) : (
        <Reveal>
          <Carousel itemWidth="clamp(210px, 60vw, 250px)" ariaLabel="Sites réalisés">
            {editMode ? [...cards, addTile] : cards}
          </Carousel>
        </Reveal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Clients (logos en niveaux de gris → couleur au survol)              */
/* ------------------------------------------------------------------ */
function Clients({ sec, i }: SP) {
  const d = sec.data as ClientsData & { eyebrow?: TextNode };
  const p = `page.sections.${i}.data`;
  const { editMode, arrayOp } = useEdit();
  const items = d.items ?? [];
  const tile = (it: ClientsData['items'][number], j: number) => (
    <ItemShell
      key={j}
      parent={`${p}.items`}
      index={j}
      count={items.length}
      path={`${p}.items.${j}`}
      kind="item-client"
      className="flex flex-col items-center gap-3"
    >
      <a
        href={editMode ? undefined : it.url || undefined}
        target="_blank"
        rel="noreferrer"
        className="wl-logo-link w-full"
        onClick={(e) => editMode && e.preventDefault()}
      >
        <div className="wl-logo-tile">
          <Img path={`${p}.items.${j}.logo`} node={it.logo} className="absolute inset-0" placeholderLabel="Logo" />
        </div>
      </a>
      {(it.name?.text || editMode) && (
        <T
          path={`${p}.items.${j}.name`}
          node={it.name}
          base={{ font: 'body', size: 13, weight: 600, color: 'var(--c-muted)', align: 'center' }}
        />
      )}
    </ItemShell>
  );
  const tiles = items.map(tile);
  const addTile = (
    <AddTile
      key="add"
      label="Client"
      className="aspect-square w-full"
      onClick={() => arrayOp(`${p}.items`, 'insert', items.length, newClientItem())}
    />
  );
  return (
    <div className="mx-auto max-w-6xl px-6">
      <SectionHeader p={p} eyebrow={d.eyebrow} title={d.title} subtitle={(d as any).subtitle} center />
      {editMode ? (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {tiles}
          {addTile}
        </div>
      ) : (
        <Reveal>
          <AutoMarquee itemWidth="clamp(128px, 34vw, 168px)" duration={Math.max(22, items.length * 6)}>
            {tiles}
          </AutoMarquee>
        </Reveal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Statistiques / résultats                                            */
/* ------------------------------------------------------------------ */
function Stats({ sec, i }: SP) {
  const d = sec.data as StatsData & { eyebrow?: TextNode };
  const p = `page.sections.${i}.data`;
  const { editMode, arrayOp } = useEdit();
  const proof = d.proof ?? [];
  const showProof = editMode || proof.some((x) => x?.mediaId);
  const proofCards = proof
    .map((it, j) => ({ it, j }))
    .filter(({ it }) => editMode || it?.mediaId)
    .map(({ it, j }) => (
      <ItemShell key={j} parent={`${p}.proof`} index={j} count={proof.length} path={`${p}.proof.${j}`}>
        <div className="wl-card relative aspect-[3/2] overflow-hidden" style={{ borderRadius: 'var(--radius)' }}>
          <Img path={`${p}.proof.${j}`} node={it} className="absolute inset-0" placeholderLabel="Capture de résultats" />
        </div>
      </ItemShell>
    ));
  return (
    <div className="mx-auto max-w-6xl px-6">
      <SectionHeader p={p} eyebrow={d.eyebrow} title={d.title} subtitle={d.subtitle} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {d.items.map((it, j) => (
          <Reveal key={j} delay={j * 80}>
            <ItemShell parent={`${p}.items`} index={j} count={d.items.length} path={`${p}.items.${j}`} className="h-full">
              <div
                className="wl-card flex h-full flex-col items-start gap-2 p-6"
                style={{
                  background: 'color-mix(in srgb, var(--c-surface) 88%, var(--c-primary))',
                  borderRadius: 'var(--radius)',
                }}
              >
                <E path={`${p}.items.${j}.value`} kind="text" as="div">
                  <CountUp
                    text={it.value?.text ?? ''}
                    className="wl-grad-text"
                    style={{
                      fontFamily: 'var(--f-heading)',
                      fontSize: 'clamp(26px, 3.4vw, 42px)',
                      lineHeight: 1.1,
                      letterSpacing: 0.5,
                    }}
                  />
                </E>
                <T
                  path={`${p}.items.${j}.label`}
                  node={it.label}
                  base={{ font: 'body', size: 13, color: 'var(--c-muted)', lh: 1.5 }}
                />
              </div>
            </ItemShell>
          </Reveal>
        ))}
        <AddTile label="Statistique" onClick={() => arrayOp(`${p}.items`, 'insert', d.items.length, newStatItem())} />
      </div>
      {showProof && (
        <div className="mt-14">
          <T
            path={`${p}.proofTitle`}
            node={d.proofTitle}
            base={{ font: 'body', size: 13, color: 'var(--c-muted)', align: 'center', transform: 'uppercase', ls: 3 }}
            className="mb-8"
          />
          <Reveal>
            {editMode ? (
              <Carousel itemWidth="clamp(260px, 74vw, 420px)" ariaLabel="Captures de résultats">
                {[
                  ...proofCards,
                  <AddTile
                    key="add"
                    label="Capture"
                    className="aspect-[3/2] w-full"
                    onClick={() => arrayOp(`${p}.proof`, 'insert', proof.length, newProofItem())}
                  />,
                ]}
              </Carousel>
            ) : (
              <AutoMarquee itemWidth="clamp(290px, 82vw, 440px)" duration={38} reverse>
                {proofCards}
              </AutoMarquee>
            )}
          </Reveal>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Avis clients                                                        */
/* ------------------------------------------------------------------ */
function initials(name?: string): string {
  const words = (name ?? '').replace(/[^\p{L}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  return (
    words
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '★'
  );
}

function Testimonials({ sec, i }: SP) {
  const d = sec.data as TestimonialsData & { eyebrow?: TextNode; subtitle?: TextNode };
  const p = `page.sections.${i}.data`;
  const { editMode, arrayOp } = useEdit();
  const card = (it: (typeof d.items)[number], j: number) => (
    <ItemShell
      key={j}
      parent={`${p}.items`}
      index={j}
      count={d.items.length}
      path={`${p}.items.${j}`}
      kind="item-testimonial"
      className="h-full"
    >
      <div
        className="wl-card flex h-full flex-col gap-3 p-5"
        style={{ background: '#ffffff', color: '#191919', borderRadius: 'var(--radius)' }}
      >
        {it.image?.mediaId ? (
          <Img path={`${p}.items.${j}.image`} node={it.image} natural />
        ) : (
          <>
            <div style={{ color: 'var(--c-star)', fontSize: 15, letterSpacing: 3 }}>★★★★★</div>
            <T
              path={`${p}.items.${j}.quote`}
              node={it.quote}
              base={{ font: 'body', size: 15, color: '#232327', lh: 1.65 }}
            />
            <div className="mt-auto flex items-center gap-3 border-t pt-4" style={{ borderColor: '#ececf1' }}>
              <div
                className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, var(--c-primary), var(--c-accent))' }}
                aria-hidden
              >
                {initials(it.author?.text)}
              </div>
              <T
                path={`${p}.items.${j}.author`}
                node={it.author}
                base={{ font: 'body', size: 13, color: '#55555f', weight: 600, lh: 1.4 }}
              />
            </div>
          </>
        )}
      </div>
    </ItemShell>
  );
  const cards = d.items.map(card);
  const row1 = d.items.filter((_, j) => j % 2 === 0).map((it) => card(it, d.items.indexOf(it)));
  const row2 = d.items.filter((_, j) => j % 2 === 1).map((it) => card(it, d.items.indexOf(it)));
  return (
    <div className="mx-auto max-w-6xl px-6">
      <SectionHeader p={p} eyebrow={d.eyebrow} title={d.title} subtitle={d.subtitle} center />
      {editMode ? (
        <Carousel itemWidth="clamp(270px, 76vw, 340px)" ariaLabel="Avis clients">
          {[
            ...cards,
            <AddTile
              key="add"
              label="Avis"
              className="min-h-44 w-full"
              onClick={() => arrayOp(`${p}.items`, 'insert', d.items.length, newTestimonialItem())}
            />,
          ]}
        </Carousel>
      ) : d.items.length >= 4 ? (
        <Reveal>
          <div className="space-y-2">
            <AutoMarquee itemWidth="clamp(280px, 80vw, 380px)">{row1}</AutoMarquee>
            <AutoMarquee itemWidth="clamp(280px, 80vw, 380px)" reverse>
              {row2}
            </AutoMarquee>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <AutoMarquee itemWidth="clamp(280px, 80vw, 380px)">{cards}</AutoMarquee>
        </Reveal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Réservation                                                         */
/* ------------------------------------------------------------------ */
function Booking({ sec, i }: SP) {
  const d = sec.data as { eyebrow?: TextNode; title?: TextNode; subtitle?: TextNode };
  const p = `page.sections.${i}.data`;
  return (
    <div className="mx-auto max-w-3xl px-6">
      <SectionHeader p={p} eyebrow={d.eyebrow} title={d.title} subtitle={d.subtitle} center />
      <Reveal>
        <BookingForm sec={sec} i={i} />
      </Reveal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bande d'appel à l'action (contact)                                  */
/* ------------------------------------------------------------------ */
function FooterCta({ sec, i }: SP) {
  const d = sec.data as FooterData;
  const p = `page.sections.${i}.data`;
  const { editMode } = useEdit();
  const wa = (d.whatsapp || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-6 text-center">
      <Reveal>
        <T
          path={`${p}.title`}
          node={d.title}
          base={{ font: 'heading', size: 50, transform: 'uppercase', lh: 1.08, align: 'center' }}
        />
      </Reveal>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {(wa || editMode) && (
          <a
            href={wa ? `https://wa.me/${wa}` : undefined}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => editMode && e.preventDefault()}
            className="inline-flex items-center gap-3 px-7 py-3.5 font-semibold"
            style={{ background: '#1fb355', color: '#fff', borderRadius: 999, fontSize: 15 }}
          >
            <SocialIcon kind="whatsapp" size={20} />
            <T path={`${p}.whatsappLabel`} node={d.whatsappLabel} base={{ font: 'body', size: 15, weight: 700 }} as="span" />
          </a>
        )}
      </div>
      <div className="mt-2 grid w-full gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/15 bg-white/5 px-6 py-5">
          <T
            path={`${p}.emailLabel`}
            node={d.emailLabel}
            base={{ font: 'body', size: 11, color: 'rgba(255,255,255,.72)', transform: 'uppercase', ls: 2, align: 'center' }}
            className="mb-2"
          />
          <T path={`${p}.email`} node={d.email} base={{ font: 'heading', size: 21, align: 'center' }} />
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/5 px-6 py-5">
          <T
            path={`${p}.phoneLabel`}
            node={d.phoneLabel}
            base={{ font: 'body', size: 11, color: 'rgba(255,255,255,.72)', transform: 'uppercase', ls: 2, align: 'center' }}
            className="mb-2"
          />
          <T path={`${p}.phone`} node={d.phone} base={{ font: 'heading', size: 21, align: 'center' }} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pied de page                                                        */
/* ------------------------------------------------------------------ */
function SiteFooter({ sec, i }: SP) {
  const d = sec.data as SiteFooterData;
  const p = `page.sections.${i}.data`;
  const { editMode, arrayOp } = useEdit();
  return (
    <div className="mx-auto max-w-6xl px-6">
      <div className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <T path={`${p}.brand`} node={d.brand} base={{ font: 'heading', size: 22, transform: 'uppercase', ls: 1.5 }} />
          <T
            path={`${p}.about`}
            node={d.about}
            base={{ font: 'body', size: 14, color: 'var(--c-muted)', lh: 1.7 }}
            className="mt-4 max-w-sm"
          />
          <div className="wl-row mt-6">
            {d.socials?.map((s, j) => (
              <ItemShell
                key={j}
                parent={`${p}.socials`}
                index={j}
                count={d.socials.length}
                path={`${p}.socials.${j}`}
                kind="item-social"
              >
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => editMode && e.preventDefault()}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors hover:bg-white/15"
                  style={{ color: '#fff' }}
                  aria-label={s.kind}
                >
                  <SocialIcon kind={s.kind} size={16} />
                </a>
              </ItemShell>
            ))}
            <AddTile
              label=""
              className="!min-h-0 h-10 w-10 !rounded-full !p-0"
              onClick={() => arrayOp(`${p}.socials`, 'insert', d.socials?.length ?? 0, newSocialItem())}
            />
          </div>
        </div>
        <div className="md:col-span-3">
          <T
            path={`${p}.linksTitle`}
            node={d.linksTitle}
            base={{ font: 'body', size: 12, color: 'var(--c-muted)', transform: 'uppercase', ls: 2, weight: 700 }}
            className="mb-4"
          />
          <div className="flex flex-col gap-2.5">
            {d.links?.map((l, j) => (
              <ItemShell
                key={j}
                parent={`${p}.links`}
                index={j}
                count={d.links.length}
                path={`${p}.links.${j}`}
                kind="item-link"
              >
                <a
                  href={l.href}
                  onClick={(e) => editMode && e.preventDefault()}
                  className="text-sm transition-colors hover:text-white"
                  style={{ color: 'var(--c-muted)' }}
                >
                  {l.label}
                </a>
              </ItemShell>
            ))}
            <AddTile
              label="Lien"
              className="!min-h-0 !p-2 text-xs"
              onClick={() =>
                arrayOp(`${p}.links`, 'insert', d.links?.length ?? 0, { label: 'Nouveau lien', href: '#top' })
              }
            />
          </div>
        </div>
        <div className="md:col-span-4">
          <T
            path={`${p}.contactTitle`}
            node={d.contactTitle}
            base={{ font: 'body', size: 12, color: 'var(--c-muted)', transform: 'uppercase', ls: 2, weight: 700 }}
            className="mb-4"
          />
          <T path={`${p}.email`} node={d.email} base={{ font: 'body', size: 15, lh: 1.9 }} />
          <T path={`${p}.phone`} node={d.phone} base={{ font: 'body', size: 15, lh: 1.9 }} />
        </div>
      </div>
      <div
        className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t pt-6"
        style={{ borderColor: 'rgba(255,255,255,.08)' }}
      >
        <T path={`${p}.legal`} node={d.legal} base={{ font: 'body', size: 12, color: 'rgba(255,255,255,.4)' }} />
        <a href="/admin" className="text-xs" style={{ color: 'rgba(255,255,255,.35)' }}>
          Administration
        </a>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const RENDERERS: Record<SectionType, React.ComponentType<SP>> = {
  hero: Hero,
  services: Services,
  media: MediaGrid,
  websites: Websites,
  clients: Clients,
  stats: Stats,
  testimonials: Testimonials,
  booking: Booking,
  footer: FooterCta,
  sitefooter: SiteFooter,
};

export function SectionBody({ sec, i }: SP) {
  const C = RENDERERS[sec.type];
  return C ? <C sec={sec} i={i} /> : null;
}

export function SectionFrame({ sec, i, children }: SP & { children: React.ReactNode }) {
  const { editMode, select, selected } = useEdit();
  const style = sec.style || {};
  const visible = style.visible !== false;
  if (!visible && !editMode) return null;
  const py = style.paddingY ?? 96;
  return (
    <section
      id={`sec-${sec.id}`}
      className={`wl-section relative ${!visible ? 'wl-off' : ''}`}
      style={{ background: style.bg || 'var(--c-bg)', paddingTop: py, paddingBottom: py }}
    >
      {editMode && (
        <button
          type="button"
          className={`wl-section-chip wl-btn ${selected?.path === `page.sections.${i}` ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            select({ kind: 'section', path: `page.sections.${i}` });
          }}
        >
          ⚙ Section
        </button>
      )}
      {!visible && editMode && <div className="wl-off-badge">Section masquée</div>}
      {children}
    </section>
  );
}
