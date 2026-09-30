// OpenAI Ads — API de conversions côté serveur (Conversions API).
// Envoie un événement « lead » à chaque réservation créée, en complément du
// pixel navigateur (components/TrackingScripts.tsx). Désactivé tant que la
// clé d'API n'est pas fournie (OPENAI_ADS_API_KEY).
import crypto from 'crypto';

const PIXEL_ID = process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID || 'VY9e5eF93NBqE48JeSTqV8';
const API_KEY = process.env.OPENAI_ADS_API_KEY;
const ENDPOINT = 'https://bzr.openai.com/v1/events';

export type LeadEvent = {
  /** Identifiant unique et stable de l'événement (déduplication côté OpenAI). */
  id: string;
  /** Page où la conversion a eu lieu. */
  sourceUrl: string;
  timestampMs?: number;
};

export function openAiAdsEnabled(): boolean {
  return !!API_KEY && !!PIXEL_ID;
}

/** Identifiant déterministe : une même réservation ne compte qu'une fois. */
export function leadEventId(reservationId: number): string {
  return crypto.createHash('sha256').update(`lead:${PIXEL_ID}:${reservationId}`).digest('hex').slice(0, 32);
}

/** Envoie l'événement « lead ». Ne lève jamais : les erreurs sont journalisées. */
export async function sendLeadEvent(ev: LeadEvent): Promise<boolean> {
  if (!openAiAdsEnabled()) return false;
  const body = {
    validate_only: false,
    events: [
      {
        id: ev.id,
        type: 'custom',
        custom_event_name: 'lead',
        timestamp_ms: ev.timestampMs ?? Date.now(),
        source_url: ev.sourceUrl,
        action_source: 'web',
        data: { type: 'custom' },
      },
    ],
  };
  try {
    const res = await fetch(`${ENDPOINT}?pid=${encodeURIComponent(PIXEL_ID)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[openai-ads] lead ${ev.id} refusé : HTTP ${res.status} ${await res.text().catch(() => '')}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[openai-ads] envoi du lead impossible :', e instanceof Error ? e.message : e);
    return false;
  }
}
