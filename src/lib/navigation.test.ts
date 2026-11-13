import { describe, expect, it } from 'vitest';
import { parseRoute, resolveEntryUrl } from './navigation';

describe('atlas routes', () => {
  it('recognizes the overview, chapters, sites and sample', () => {
    expect(parseRoute('#/')).toEqual({ kind: 'overview' });
    expect(parseRoute('#/chapter/north')).toEqual({ kind: 'chapter', region: 'north' });
    expect(parseRoute('#/site/zhengyangmen')).toEqual({ kind: 'site', id: 'zhengyangmen' });
    expect(parseRoute('#/sample')).toEqual({ kind: 'sample' });
  });
  it('returns to the overview for malformed or unknown routes', () => {
    expect(parseRoute('#/chapter/other')).toEqual({ kind: 'overview' });
    expect(parseRoute('#/other')).toEqual({ kind: 'overview' });
    expect(parseRoute('#/site/%E0%A4%A')).toEqual({ kind: 'overview' });
  });
  it('resolves local entries under the deployment base and permits https only externally', () => {
    expect(resolveEntryUrl('chapters/north.html', '/atlas/')).toBe('/atlas/chapters/north.html');
    expect(resolveEntryUrl('/chapters/north.html', '/atlas/')).toBe('/atlas/chapters/north.html');
    expect(resolveEntryUrl('https://example.com/scene', '/atlas/')).toBe('https://example.com/scene');
    expect(resolveEntryUrl('javascript:alert(1)', '/atlas/')).toBeNull();
    expect(resolveEntryUrl('//example.com/scene', '/atlas/')).toBeNull();
    expect(resolveEntryUrl('../outside.html', '/atlas/')).toBeNull();
  });
});
