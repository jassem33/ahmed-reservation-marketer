import { mkdir } from 'node:fs/promises';

/** Répertoire de stockage des médias sur disque.
 *
 *  Historiquement les images et vidéos vivaient dans la colonne `media.data`
 *  (BYTEA). Comme chaque sauvegarde `pg_dump` embarquait alors la totalité des
 *  médias, 94 images = 1,8 Go faisaient 2 Go par dump — cinq dumps ont rempli
 *  le disque le 2026-08-20 et mis le site hors ligne.
 *
 *  Désormais le contenu est écrit dans ce répertoire (volume Docker dédié) et
 *  `media.data` reste NULL : la base ne contient plus que les métadonnées.
 *  Une ligne dont `data` n'est pas NULL est un média « historique » toujours
 *  servi depuis la base — le chemin de lecture gère les deux cas.
 *
 *  Chemin relatif en repli, et concaténation plutôt que `path.join` : les
 *  opérations de chemin dynamiques font tracer tout le projet par Next
 *  (« unexpected file in NFT list ») et gonflent la sortie standalone.
 */
export const MEDIA_DIR = process.env.MEDIA_DIR || 'media-store';

/** Chemin du fichier d'un média. L'id est un UUID validé en amont, donc sûr. */
export const mediaPath = (id: string): string => `${MEDIA_DIR}/${id}`;

export async function ensureMediaDir(): Promise<void> {
  await mkdir(MEDIA_DIR, { recursive: true });
}
