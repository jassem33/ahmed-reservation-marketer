import { pool } from '@/lib/db';

type Health = {
  at?: string;
  diskPct?: number;
  freeGb?: number;
  backupAgeH?: number;
  backupSize?: string;
  problems?: string[];
};

/** Bandeau d'alerte serveur affiché sur toutes les pages d'administration.
 *
 *  La surveillance tourne sur l'hôte (deploy/health-check.sh, cron horaire) et
 *  écrit son diagnostic dans `settings` sous la clé « health ». Aucun SMTP
 *  n'étant configuré, c'est ici — et non par e-mail — que les problèmes
 *  deviennent visibles : le 2026-08-20 le disque s'est rempli sans que rien ne
 *  le signale, et le site est resté hors ligne plusieurs heures.
 */
export default async function HealthBanner() {
  let h: Health = {};
  let stale = true;
  try {
    // La fraîcheur est calculée par Postgres : pas d'horloge lue pendant le
    // rendu (règle react-hooks/purity), et `updated_at` est la référence.
    const { rows } = await pool.query(
      `SELECT value, updated_at < now() - interval '6 hours' AS stale
         FROM settings WHERE key = 'health'`,
    );
    if (rows[0]) {
      h = (rows[0].value as Health) ?? {};
      stale = rows[0].stale;
    }
  } catch {
    return null; // la base est le vrai problème à ce stade : on n'ajoute pas de bruit
  }

  const problems = [...(h.problems ?? [])];

  // Surveillance muette = surveillance morte : on le signale aussi.
  if (stale) {
    problems.push(
      h.at
        ? `La surveillance du serveur ne s'est pas exécutée depuis le ${new Date(h.at).toLocaleString('fr-FR')}.`
        : "La surveillance du serveur n'a jamais tourné.",
    );
  }

  if (problems.length === 0) return null;

  return (
    <div
      role="alert"
      style={{
        margin: '0 0 18px',
        padding: '14px 16px',
        borderRadius: 12,
        border: '1px solid rgba(255,120,120,.35)',
        background: 'rgba(255,80,80,.10)',
      }}
    >
      <strong style={{ display: 'block', marginBottom: 6, color: '#ff9a9a' }}>
        ⚠️ Alerte serveur
      </strong>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.65 }}>
        {problems.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
      {typeof h.diskPct === 'number' && (
        <p className="wl-hint" style={{ marginTop: 8 }}>
          Disque : {h.diskPct} % utilisé ({h.freeGb} Go libres)
          {typeof h.backupAgeH === 'number'
            ? ` · dernière sauvegarde il y a ${h.backupAgeH} h${h.backupSize ? ` (${h.backupSize})` : ''}`
            : ''}
        </p>
      )}
    </div>
  );
}
