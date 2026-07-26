'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Section, TextNode } from '@/lib/types';
import { useEdit } from './EditContext';
import { T } from './atoms';
import { SocialIcon } from './icons';

type Status = 'idle' | 'sending' | 'done' | 'error';

export default function BookingForm({ sec, i }: { sec: Section; i: number }) {
  const { editMode } = useEdit();
  const p = `page.sections.${i}.data`;
  const d = sec.data as {
    services?: string[];
    submitLabel?: TextNode;
    successTitle?: TextNode;
    successText?: TextNode;
    whatsappBtnLabel?: TextNode;
    daysAhead?: number;
    minNoticeHours?: number;
  };
  const services = d.services ?? [];

  const [service, setService] = useState(services[0] ?? '');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slot, setSlot] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [waUrl, setWaUrl] = useState<string | null>(null);

  const { minDate, maxDate } = useMemo(() => {
    const min = new Date();
    min.setHours(min.getHours() + (d.minNoticeHours ?? 12));
    const max = new Date();
    max.setDate(max.getDate() + (d.daysAhead ?? 30));
    const iso = (x: Date) => x.toISOString().slice(0, 10);
    return { minDate: iso(min), maxDate: iso(max) };
  }, [d.minNoticeHours, d.daysAhead]);

  const loadSlots = useCallback(async (day: string) => {
    setSlots(null);
    setSlot('');
    if (!day) return;
    try {
      const res = await fetch(`/api/reservations/slots?date=${day}`);
      const data = await res.json();
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch {
      setSlots([]);
    }
  }, []);

  useEffect(() => {
    if (date) void loadSlots(date);
  }, [date, loadSlots]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editMode || status === 'sending') return;
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, date, slot, name, email, phone, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Une erreur est survenue');
      setWaUrl(data.whatsapp ?? null);
      setStatus('done');
      // redirige automatiquement vers WhatsApp avec le récapitulatif pré-rempli
      if (data.whatsapp) window.location.href = data.whatsapp;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setStatus('error');
      if (date) void loadSlots(date);
    }
  };

  const label = (text: string) => (
    <span
      className="mb-2 block text-[11px] font-bold uppercase"
      style={{ color: 'var(--c-muted)', letterSpacing: 2 }}
    >
      {text}
    </span>
  );
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,.05)',
    border: '1px solid rgba(255,255,255,.14)',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 15,
    color: 'var(--c-text)',
    outline: 'none',
    colorScheme: 'dark',
  };

  const success = (
    <div
      className="flex flex-col items-center gap-4 p-8 text-center sm:p-10"
      style={{ background: 'var(--c-surface)', borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,.09)' }}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
        style={{ background: 'color-mix(in srgb, #1fb355 22%, transparent)', color: '#35d07f' }}
      >
        ✓
      </div>
      <T
        path={`${p}.successTitle`}
        node={d.successTitle}
        base={{ font: 'heading', size: 28, transform: 'uppercase', align: 'center' }}
      />
      <T
        path={`${p}.successText`}
        node={d.successText}
        base={{ font: 'body', size: 15, color: 'var(--c-muted)', lh: 1.7, align: 'center' }}
        className="max-w-md"
      />
      {(waUrl || editMode) && (
        <a
          href={waUrl ?? '#'}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => editMode && e.preventDefault()}
          className="inline-flex items-center gap-3 px-7 py-3.5 font-semibold"
          style={{ background: '#1fb355', color: '#fff', borderRadius: 999, fontSize: 15 }}
        >
          <SocialIcon kind="whatsapp" size={20} />
          <T
            path={`${p}.whatsappBtnLabel`}
            node={d.whatsappBtnLabel}
            base={{ font: 'body', size: 15, weight: 700 }}
            as="span"
          />
        </a>
      )}
    </div>
  );

  if (status === 'done' && !editMode) return success;

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={submit}
        className="grid gap-5 p-6 sm:p-8"
        style={{
          background: 'var(--c-surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid rgba(255,255,255,.09)',
        }}
      >
        {/* pot de miel anti-robots */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ display: 'none' }} readOnly />
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            {label('Service')}
            <select style={inputStyle} value={service} disabled={editMode} onChange={(e) => setService(e.target.value)}>
              {services.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            {label('Date')}
            <input
              type="date"
              style={inputStyle}
              min={minDate}
              max={maxDate}
              value={date}
              disabled={editMode}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>
        {date && (
          <div>
            {label('Heure')}
            {slots === null ? (
              <p className="text-sm" style={{ color: 'var(--c-muted)' }}>
                Chargement des créneaux…
              </p>
            ) : slots.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--c-muted)' }}>
                Aucun créneau disponible ce jour — essayez une autre date.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={editMode}
                    onClick={() => setSlot(s)}
                    className="px-4 py-2 text-sm font-semibold transition-transform hover:scale-105"
                    style={{
                      borderRadius: 999,
                      border: '1px solid',
                      borderColor: slot === s ? 'transparent' : 'rgba(255,255,255,.16)',
                      background: slot === s ? 'var(--c-primary)' : 'rgba(255,255,255,.04)',
                      color: '#fff',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            {label('Nom complet')}
            <input style={inputStyle} value={name} disabled={editMode} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder="Votre nom" />
          </div>
          <div>
            {label('E-mail (facultatif)')}
            <input type="email" style={inputStyle} value={email} disabled={editMode} onChange={(e) => setEmail(e.target.value)} placeholder="vous@email.com" />
          </div>
          <div>
            {label('WhatsApp')}
            <input type="tel" style={inputStyle} value={phone} disabled={editMode} onChange={(e) => setPhone(e.target.value)} required placeholder="+216 …" />
          </div>
        </div>
        <div>
          {label('Message (facultatif)')}
          <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={message} disabled={editMode} onChange={(e) => setMessage(e.target.value)} placeholder="Précisez votre besoin…" />
        </div>
        {error && (
          <p className="text-sm" style={{ color: '#ff8585' }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          className="wl-btn-cta justify-center"
          disabled={editMode || status === 'sending' || !date || !slot}
          style={{ opacity: editMode || !date || !slot ? 0.55 : 1, border: 'none', cursor: 'pointer' }}
        >
          <SocialIcon kind="whatsapp" size={19} />
          <T path={`${p}.submitLabel`} node={d.submitLabel} base={{ font: 'body', size: 15, weight: 700 }} as="span" />
          {status === 'sending' ? <span aria-hidden>…</span> : null}
        </button>
      </form>
      {editMode && (
        <div>
          <p className="wl-hint mb-3" style={{ textAlign: 'center' }}>
            Aperçu du message de confirmation (visible après réservation) :
          </p>
          {success}
        </div>
      )}
    </div>
  );
}
