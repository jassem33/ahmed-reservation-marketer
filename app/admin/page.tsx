'use client';

import React, { useState } from 'react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Connexion impossible');
      }
      location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setBusy(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: 'radial-gradient(80% 80% at 50% 20%, #2b1060 0%, #0b0b0e 70%)' }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border p-8"
        style={{ background: 'rgba(16,16,20,.92)', borderColor: '#2c2c36', color: '#fff' }}
      >
        <h1 className="mb-1 text-xl font-bold">Administration</h1>
        <p className="mb-6 text-sm" style={{ color: '#8a8a97' }}>
          Connectez-vous pour modifier votre site.
        </p>
        <label className="wl-label" htmlFor="u">
          Nom d'utilisateur
        </label>
        <input
          id="u"
          className="wl-input"
          style={{ marginBottom: 14 }}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
        />
        <label className="wl-label" htmlFor="p">
          Mot de passe
        </label>
        <input
          id="p"
          type="password"
          className="wl-input"
          style={{ marginBottom: 18 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && (
          <p className="mb-4 text-sm" style={{ color: '#ff8585' }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg py-2.5 font-semibold"
          style={{ background: '#551ab2', color: '#fff', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
        <a href="/" className="mt-5 block text-center text-sm" style={{ color: '#8a8a97' }}>
          ← Retour au site
        </a>
      </form>
    </div>
  );
}
