import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'node:fs';
import { open, unlink } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pool } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { mediaPath } from '@/lib/media';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHUNK = 8 * 1024 * 1024; // 8 Mo max par réponse partielle

const baseHeaders = (mime: string) => ({
  'Content-Type': mime,
  'Accept-Ranges': 'bytes',
  'Cache-Control': 'public, max-age=31536000, immutable',
});

/** Lit une tranche du fichier sur disque. */
async function diskChunk(id: string, start: number, len: number): Promise<Uint8Array<ArrayBuffer>> {
  const fh = await open(mediaPath(id), 'r');
  try {
    const buf = new Uint8Array(new ArrayBuffer(len));
    const { bytesRead } = await fh.read(buf, 0, len, start);
    // `slice` recopie : évité dans le cas courant où la lecture est complète.
    return bytesRead === len ? buf : buf.slice(0, bytesRead);
  } finally {
    await fh.close();
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return new NextResponse('Introuvable', { status: 404 });

  // `onDisk` : les médias migrés hors de la base ont `data` à NULL.
  const meta = await pool.query(
    'SELECT mime, size_bytes::bigint AS size, data IS NULL AS on_disk FROM media WHERE id = $1',
    [id],
  );
  if (!meta.rows[0]) return new NextResponse('Introuvable', { status: 404 });
  const mime: string = meta.rows[0].mime;
  const size = Number(meta.rows[0].size);
  const onDisk: boolean = meta.rows[0].on_disk;

  const range = req.headers.get('range');
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m || (m[1] === '' && m[2] === '')) {
      return new NextResponse('Range invalide', {
        status: 416,
        headers: { 'Content-Range': `bytes */${size}` },
      });
    }
    let start: number;
    let end: number;
    if (m[1] === '') {
      // suffixe : les N derniers octets
      start = Math.max(0, size - parseInt(m[2], 10));
      end = size - 1;
    } else {
      start = parseInt(m[1], 10);
      end = m[2] ? parseInt(m[2], 10) : size - 1;
    }
    end = Math.min(end, size - 1, start + CHUNK - 1);
    if (start >= size || start > end) {
      return new NextResponse('Range non satisfaisable', {
        status: 416,
        headers: { 'Content-Range': `bytes */${size}` },
      });
    }
    const len = end - start + 1;
    let chunk: Uint8Array<ArrayBuffer>;
    if (onDisk) {
      try {
        chunk = await diskChunk(id, start, len);
      } catch {
        return new NextResponse('Introuvable', { status: 404 });
      }
    } else {
      const { rows } = await pool.query(
        'SELECT substring(data FROM $2 FOR $3) AS chunk FROM media WHERE id = $1',
        [id, start + 1, len],
      );
      chunk = new Uint8Array(rows[0].chunk);
    }
    return new NextResponse(chunk, {
      status: 206,
      headers: {
        ...baseHeaders(mime),
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': String(len),
      },
    });
  }

  if (onDisk) {
    // Diffusé en flux : une vidéo de 300 Mo ne passe jamais entièrement en mémoire.
    try {
      const stream = Readable.toWeb(
        createReadStream(mediaPath(id)),
      ) as unknown as ReadableStream<Uint8Array>;
      return new NextResponse(stream, {
        status: 200,
        headers: { ...baseHeaders(mime), 'Content-Length': String(size) },
      });
    } catch {
      return new NextResponse('Introuvable', { status: 404 });
    }
  }

  const { rows } = await pool.query('SELECT data FROM media WHERE id = $1', [id]);
  return new NextResponse(new Uint8Array(rows[0].data), {
    status: 200,
    headers: { ...baseHeaders(mime), 'Content-Length': String(size) },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  await pool.query('DELETE FROM media WHERE id = $1', [id]);
  // Le fichier peut ne pas exister (média resté en base) : on ignore l'erreur.
  await unlink(mediaPath(id)).catch(() => {});
  return NextResponse.json({ ok: true });
}
