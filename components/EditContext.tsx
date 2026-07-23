'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { SiteDoc } from '@/lib/types';
import { getAtPath, setAtPath } from '@/lib/path';

export type Selection = { kind: string; path: string } | null;
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type Ctx = {
  site: SiteDoc;
  isAdmin: boolean;
  editMode: boolean;
  dirty: boolean;
  saving: SaveState;
  selected: Selection;
  hovered: string | null;
  setEditMode: (v: boolean) => void;
  select: (s: Selection) => void;
  setHovered: (p: string | null) => void;
  update: (path: string, value: unknown) => void;
  arrayOp: (parent: string, op: 'insert' | 'remove' | 'move', index: number, payload?: unknown) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  save: () => Promise<void>;
  replaceSite: (doc: SiteDoc) => void;
  logout: () => Promise<void>;
};

const EditCtx = createContext<Ctx | null>(null);

export function useEdit(): Ctx {
  const ctx = useContext(EditCtx);
  if (!ctx) throw new Error('useEdit doit être utilisé sous <EditProvider>');
  return ctx;
}

export function EditProvider({
  initial,
  initialAdmin,
  children,
}: {
  initial: SiteDoc;
  initialAdmin: boolean;
  children: React.ReactNode;
}) {
  const [history, setHistory] = useState<{ stack: SiteDoc[]; idx: number }>({
    stack: [initial],
    idx: 0,
  });
  const [isAdmin] = useState(initialAdmin);
  const [editMode, setEditMode] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState<SaveState>('idle');
  const [selected, setSelected] = useState<Selection>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const lastEdit = useRef<{ key: string; t: number }>({ key: '', t: 0 });

  const site = history.stack[history.idx];
  const siteRef = useRef(site);
  useEffect(() => {
    siteRef.current = site;
  }, [site]);

  const commit = useCallback((mutate: (cur: SiteDoc) => SiteDoc, coalesceKey?: string) => {
    setDirty(true);
    setHistory((h) => {
      const cur = h.stack[h.idx];
      const next = mutate(cur);
      const now = Date.now();
      const coalesce =
        !!coalesceKey && lastEdit.current.key === coalesceKey && now - lastEdit.current.t < 800;
      lastEdit.current = { key: coalesceKey ?? '', t: now };
      let stack = h.stack.slice(0, h.idx + 1);
      if (coalesce && stack.length > 1) stack[stack.length - 1] = next;
      else stack = [...stack, next];
      if (stack.length > 100) stack = stack.slice(stack.length - 100);
      return { stack, idx: stack.length - 1 };
    });
  }, []);

  const update = useCallback(
    (path: string, value: unknown) => commit((cur) => setAtPath(cur, path, value), path),
    [commit],
  );

  const arrayOp = useCallback(
    (parent: string, op: 'insert' | 'remove' | 'move', index: number, payload?: unknown) => {
      commit((cur) => {
        const arr = (getAtPath(cur, parent) as any[]) ?? [];
        const next = arr.slice();
        if (op === 'insert') next.splice(index, 0, payload);
        if (op === 'remove') next.splice(index, 1);
        if (op === 'move') {
          const to = index + (payload as number);
          if (to < 0 || to >= next.length) return cur;
          const [it] = next.splice(index, 1);
          next.splice(to, 0, it);
        }
        return setAtPath(cur, parent, next);
      });
    },
    [commit],
  );

  const undo = useCallback(() => {
    setDirty(true);
    setHistory((h) => ({ ...h, idx: Math.max(0, h.idx - 1) }));
  }, []);
  const redo = useCallback(() => {
    setDirty(true);
    setHistory((h) => ({ ...h, idx: Math.min(h.stack.length - 1, h.idx + 1) }));
  }, []);

  const save = useCallback(async () => {
    setSaving('saving');
    try {
      const res = await fetch('/api/site', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siteRef.current),
      });
      if (!res.ok) throw new Error(String(res.status));
      setDirty(false);
      setSaving('saved');
      setTimeout(() => setSaving('idle'), 1600);
    } catch {
      setSaving('error');
      setTimeout(() => setSaving('idle'), 2600);
    }
  }, []);

  const replaceSite = useCallback((doc: SiteDoc) => {
    setHistory({ stack: [doc], idx: 0 });
    setDirty(false);
    setSelected(null);
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    location.href = '/';
  }, []);

  // Raccourcis clavier : Échap, Cmd/Ctrl+S, Cmd/Ctrl+Z / Shift+Cmd+Z
  useEffect(() => {
    if (!editMode) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;
      if (e.key === 'Escape') setSelected(null);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save();
      }
      if (!typing && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editMode, save, undo, redo]);

  // Avertir avant de quitter avec des modifications non enregistrées
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  const value: Ctx = {
    site,
    isAdmin,
    editMode,
    dirty,
    saving,
    selected,
    hovered,
    setEditMode,
    select: setSelected,
    setHovered,
    update,
    arrayOp,
    undo,
    redo,
    canUndo: history.idx > 0,
    canRedo: history.idx < history.stack.length - 1,
    save,
    replaceSite,
    logout,
  };

  return <EditCtx.Provider value={value}>{children}</EditCtx.Provider>;
}
