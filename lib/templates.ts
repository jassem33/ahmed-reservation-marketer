import type { Section, SectionType } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const newServiceItem = () => ({
  emoji: '✨',
  icon: 'zap',
  image: { mediaId: null, alt: '' },
  title: { text: 'Nouveau service' },
  desc: { text: 'Décrivez ce service en une ou deux phrases.' },
});

export const newClientItem = () => ({
  logo: { mediaId: null, alt: 'Logo client' },
  name: { text: 'Nouveau client' },
  url: '',
});

export const newVideoItem = () => ({ mediaId: null, posterId: null, caption: '' });

export const newWebsiteItem = () => ({
  shot: { mediaId: null, alt: 'Capture du site' },
  name: { text: 'nouveau-site.com' },
  url: 'https://example.com',
});

export const newStatItem = () => ({ value: { text: '+100%' }, label: { text: 'Nouvel indicateur' } });

export const newProofItem = () => ({ mediaId: null });

export const newTestimonialItem = () => ({
  image: { mediaId: null },
  quote: { text: 'Un avis client convaincant à personnaliser.' },
  author: { text: 'Prénom N. — activité' },
});

export const newSocialItem = () => ({ kind: 'instagram', url: 'https://instagram.com' });

const DATA_TEMPLATES: Record<SectionType, () => any> = {
  hero: () => ({
    handle: { text: '@votre_marque' },
    photo: { mediaId: null, alt: 'Portrait' },
    logo: { mediaId: null, alt: 'Logo' },
    logoTitle: { text: 'VOTRE MARQUE' },
    logoTagline: { text: 'Disponible pour vos projets' },
    titleTop: { text: 'Salut à tous,\nmon nom est' },
    name: { text: 'VOTRE NOM' },
    subtitle: { text: 'Votre phrase d’accroche ici.' },
    ctaPrimary: { label: { text: 'Contactez-nous' }, url: '#sec-footer', enabled: true },
    ctaSecondary: { label: { text: 'Voir nos réalisations' }, url: '#sec-media', enabled: true },
    badges: [
      { value: { text: '+250%' }, label: { text: 'ROAS moyen' } },
      { value: { text: '5 ans' }, label: { text: "d'expérience" } },
    ],
  }),
  services: () => ({
    eyebrow: { text: 'Ce que nous faisons' },
    title: { text: 'Nos services' },
    subtitle: { text: 'Des solutions adaptées à vos besoins' },
    items: [newServiceItem(), newServiceItem(), newServiceItem()],
  }),
  media: () => ({
    eyebrow: { text: 'Portfolio' },
    title: { text: 'Notre production créative' },
    subtitle: { text: 'Un aperçu de nos vidéos' },
    columns: 3,
    layout: 'carousel',
    items: [newVideoItem(), newVideoItem(), newVideoItem()],
  }),
  websites: () => ({
    eyebrow: { text: 'Réalisations' },
    title: { text: 'Nos sites web réalisés' },
    subtitle: { text: 'Des boutiques en ligne rapides et prêtes à convertir.' },
    buttonText: { text: 'Découvrir ↗' },
    layout: 'carousel',
    items: [newWebsiteItem(), newWebsiteItem(), newWebsiteItem()],
  }),
  clients: () => ({
    eyebrow: { text: 'Références' },
    title: { text: 'Ils nous font confiance' },
    subtitle: { text: 'Les marques que nous accompagnons au quotidien.' },
    items: [newClientItem(), newClientItem(), newClientItem(), newClientItem()],
  }),
  stats: () => ({
    eyebrow: { text: 'Résultats' },
    title: { text: 'Des résultats mesurables' },
    subtitle: { text: 'Vos indicateurs clés, mis en valeur.' },
    items: [newStatItem(), newStatItem(), newStatItem(), newStatItem()],
    proofTitle: { text: 'Captures de nos tableaux de bord' },
    proof: [newProofItem(), newProofItem()],
  }),
  testimonials: () => ({
    eyebrow: { text: 'Témoignages' },
    title: { text: 'Avis de nos clients' },
    subtitle: { text: '' },
    items: [newTestimonialItem(), newTestimonialItem(), newTestimonialItem()],
  }),
  booking: () => ({
    eyebrow: { text: 'Prendre rendez-vous' },
    title: { text: 'Réservez votre créneau' },
    subtitle: { text: 'Choisissez un service, une date et une heure — confirmation par e-mail et WhatsApp.' },
    services: ['Consultation gratuite', 'Sponsoring Meta Ads', 'Création de contenu', 'Site web'],
    slotMinutes: 60,
    daysAhead: 30,
    minNoticeHours: 12,
    overrides: [],
    schedule: [
      { on: false, start: '09:00', end: '18:00' },
      { on: true, start: '09:00', end: '18:00' },
      { on: true, start: '09:00', end: '18:00' },
      { on: true, start: '09:00', end: '18:00' },
      { on: true, start: '09:00', end: '18:00' },
      { on: true, start: '09:00', end: '18:00' },
      { on: true, start: '09:00', end: '13:00' },
    ],
    submitLabel: { text: 'Réserver ce créneau' },
    successTitle: { text: 'Demande envoyée !' },
    successText: {
      text: 'Votre demande de réservation est bien enregistrée. Vous recevrez une confirmation par e-mail très rapidement.',
    },
    whatsappBtnLabel: { text: 'Confirmer sur WhatsApp' },
    whatsapp: '',
    fabEnabled: true,
  }),
  footer: () => ({
    title: { text: 'Prêt à démarrer ?\nContactez-nous dès aujourd’hui !' },
    emailLabel: { text: 'Adresse e-mail' },
    email: { text: 'contact@votremarque.com' },
    phoneLabel: { text: 'Numéro de téléphone' },
    phone: { text: '+216 00 000 000' },
    whatsapp: '',
    whatsappLabel: { text: 'Discuter sur WhatsApp' },
    socialsLabel: { text: 'Nos réseaux' },
    socials: [newSocialItem()],
    fabEnabled: true,
  }),
  sitefooter: () => ({
    brand: { text: 'VOTRE MARQUE' },
    about: { text: 'Décrivez votre activité en une ou deux phrases.' },
    linksTitle: { text: 'Navigation' },
    links: [
      { label: 'Services', href: '#sec-services' },
      { label: 'Contact', href: '#sec-footer' },
    ],
    contactTitle: { text: 'Contact' },
    email: { text: 'contact@votremarque.com' },
    phone: { text: '+216 00 000 000' },
    socials: [newSocialItem()],
    legal: { text: '© 2026 Votre Marque — Tous droits réservés.' },
  }),
};

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: 'Héro (présentation)',
  services: 'Services',
  media: 'Vidéos (carrousel / grille)',
  websites: 'Sites web réalisés',
  clients: 'Clients (logos)',
  stats: 'Statistiques / résultats',
  testimonials: 'Avis clients',
  booking: 'Réservation (rendez-vous)',
  footer: 'Bande contact (CTA)',
  sitefooter: 'Pied de page',
};

export function newSection(type: SectionType): Section {
  return {
    id: crypto.randomUUID(),
    type,
    style: {
      bg: type === 'footer' ? 'var(--c-primary)' : type === 'sitefooter' ? '#0a0a0d' : 'var(--c-bg)',
      paddingY: type === 'sitefooter' ? 64 : 96,
      visible: true,
    },
    data: DATA_TEMPLATES[type](),
  };
}
