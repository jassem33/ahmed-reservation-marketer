export type TextNode = {
  text: string;
  size?: number;
  color?: string;
  font?: string; // 'heading' | 'body' | clé du registre de polices
  weight?: number;
  align?: 'left' | 'center' | 'right';
  lh?: number;
  ls?: number;
  transform?: 'none' | 'uppercase';
};

export type ImageNode = { mediaId?: string | null; alt?: string };
export type VideoNode = { mediaId?: string | null; posterId?: string | null; caption?: string };

export type SectionStyle = { bg?: string; paddingY?: number; visible?: boolean };
export type SectionType =
  | 'hero'
  | 'services'
  | 'media'
  | 'websites'
  | 'stats'
  | 'testimonials'
  | 'booking'
  | 'footer'
  | 'sitefooter';

export type CtaNode = { label: TextNode; url: string; enabled?: boolean };
export type NavLink = { label: string; href: string };
export type NavConfig = {
  enabled: boolean;
  brand: string;
  logoMediaId?: string | null;
  links: NavLink[];
  cta: { label: string; url: string; enabled: boolean };
};

// data est volontairement souple : l'éditeur manipule le document par chemins
// (ex. "page.sections.2.data.items.0.title") et chaque section type ses champs.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type Section = { id: string; type: SectionType; style: SectionStyle; data: any };

export type PageDoc = { sections: Section[]; nav?: NavConfig };

export type ThemeColors = {
  background: string;
  surface: string;
  primary: string;
  accent: string;
  highlight: string;
  text: string;
  muted: string;
  star: string;
};

export type Theme = {
  colors: ThemeColors;
  fonts: { heading: string; body: string };
  radius: number;
  brand: { siteTitle: string; description: string };
};

export type SiteDoc = { theme: Theme; page: PageDoc };

// Données typées par section (documentation du modèle)
export type HeroData = {
  handle: TextNode;
  photo: ImageNode;
  logo: ImageNode;
  logoTitle: TextNode;
  logoTagline: TextNode;
  titleTop: TextNode;
  name: TextNode;
  subtitle: TextNode;
  ctaPrimary?: CtaNode;
  ctaSecondary?: CtaNode;
  badges?: Array<{ value: TextNode; label: TextNode }>;
  marqueeText?: TextNode;
};

export type SiteFooterData = {
  brand: TextNode;
  about: TextNode;
  linksTitle: TextNode;
  links: NavLink[];
  contactTitle: TextNode;
  email: TextNode;
  phone: TextNode;
  socials: Array<{ kind: string; url: string }>;
  legal: TextNode;
};
export type ServiceItem = { emoji: string; bg?: string; title: TextNode; desc: TextNode };
export type ServicesData = { title: TextNode; subtitle: TextNode; items: ServiceItem[] };
export type MediaData = { title: TextNode; subtitle: TextNode; columns: number; items: VideoNode[] };
export type WebsiteItem = { shot: ImageNode; name: TextNode; url: string };
export type WebsitesData = { title: TextNode; buttonText: TextNode; items: WebsiteItem[] };
export type StatItem = { value: TextNode; label: TextNode };
export type StatsData = {
  title: TextNode;
  subtitle: TextNode;
  items: StatItem[];
  proofTitle: TextNode;
  proof: ImageNode[];
};
export type TestimonialItem = { image: ImageNode; quote: TextNode; author: TextNode };
export type TestimonialsData = { title: TextNode; items: TestimonialItem[] };
export type SocialItem = { kind: string; url: string };
export type FooterData = {
  title: TextNode;
  emailLabel: TextNode;
  email: TextNode;
  phoneLabel: TextNode;
  phone: TextNode;
  whatsapp: string;
  whatsappLabel: TextNode;
  socialsLabel: TextNode;
  socials: SocialItem[];
};
