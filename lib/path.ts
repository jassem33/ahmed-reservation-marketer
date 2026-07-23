/* eslint-disable @typescript-eslint/no-explicit-any */

export function getAtPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  return path.split('.').reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

export function setAtPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.');
  const root: any = structuredClone(obj);
  let cur: any = root;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] == null) cur[keys[i]] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
  return root;
}
