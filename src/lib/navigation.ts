import type { RegionId } from '../data/types';

export type AtlasRoute = { kind: 'overview' } | { kind: 'sample' } | { kind: 'chapter'; region: RegionId } | { kind: 'site'; id: string };
export function parseRoute(hash: string): AtlasRoute {
  if (hash === '#/sample') return { kind: 'sample' };
  const chapter = /^#\/chapter\/(north|central|south)$/.exec(hash);
  if (chapter) return { kind: 'chapter', region: chapter[1] as RegionId };
  const site = /^#\/site\/([^/]+)$/.exec(hash);
  if (site) {
    try {
      const id = decodeURIComponent(site[1]);
      if (/^[a-z0-9-]+$/.test(id)) return { kind: 'site', id };
    } catch { /* Invalid encoded routes return to the atlas. */ }
  }
  return { kind: 'overview' };
}

export function resolveEntryUrl(entry: string, base: string): string | null {
  if (/^https:\/\//i.test(entry)) {
    try { return new URL(entry).href; } catch { return null; }
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(entry) || entry.startsWith('//') || entry.includes('\\')) return null;
  const segments = entry.replace(/^\/+/, '').split('/');
  if (segments.some(segment => { try { return decodeURIComponent(segment) === '..'; } catch { return true; } })) return null;
  return `${base.endsWith('/') ? base : `${base}/`}${segments.join('/')}`;
}
