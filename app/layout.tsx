import type { Metadata } from 'next';
import './globals.css';
import '@fontsource/anton';
import '@fontsource/archivo-black';
import '@fontsource/bebas-neue';
import '@fontsource/oswald';
import '@fontsource/oswald/700.css';
import '@fontsource/montserrat';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/900.css';
import '@fontsource/poppins';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/800.css';
import '@fontsource/inter';
import '@fontsource/inter/600.css';
import '@fontsource/inter/800.css';
import '@fontsource/space-grotesk';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/playfair-display';
import '@fontsource/playfair-display/700.css';
import '@fontsource/playfair-display/900.css';
import '@fontsource/raleway';
import '@fontsource/raleway/700.css';
import '@fontsource/raleway/900.css';
import { getSite } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const site = await getSite();
    return {
      title: site.theme.brand.siteTitle,
      description: site.theme.brand.description,
    };
  } catch {
    return { title: 'Site' };
  }
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
