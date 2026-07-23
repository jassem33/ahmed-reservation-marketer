import { NextResponse } from 'next/server';
import { currentAdmin } from '@/lib/auth';
import { getSite } from '@/lib/site';
import { brandedEmail, flushMailQueue, getMailConfig, mailReady, queueMail } from '@/lib/mail';

export async function POST() {
  if (!(await currentAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const cfg = await getMailConfig();
  const to = cfg.adminEmail || cfg.from;
  if (!mailReady(cfg) || !to) {
    return NextResponse.json(
      { error: 'Renseignez au moins le serveur SMTP, l’expéditeur et l’e-mail admin' },
      { status: 400 },
    );
  }
  const site = await getSite();
  await queueMail(
    to,
    `E-mail de test — ${site.theme.brand.siteTitle}`,
    brandedEmail({
      siteTitle: site.theme.brand.siteTitle,
      accent: site.theme.colors.primary,
      title: 'La configuration fonctionne 🎉',
      intro: 'Cet e-mail de test confirme que votre configuration SMTP est opérationnelle.',
      rows: [
        ['Serveur', String(cfg.host)],
        ['Expéditeur', String(cfg.from)],
      ],
    }),
  );
  const flush = await flushMailQueue();
  if (flush.failed > 0) {
    return NextResponse.json({ error: 'Échec de l’envoi — vérifiez les identifiants (détail dans la file)' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, flush });
}
