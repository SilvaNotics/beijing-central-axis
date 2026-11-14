#!/usr/bin/env python3
"""Check local documentation and archived data only; never run project tests."""
import collections
import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
errors = []


def require(condition, message):
    if not condition:
        errors.append(message)


def prose(text):
    text = re.sub(r'^```[^\n]*\n.*?^```[^\n]*$', '', text, flags=re.M | re.S)
    return re.sub(r'`[^`\n]+`', '', text)


def anchors(text):
    counts = collections.Counter()
    result = set(re.findall(r'<a\s+id=["\']([^"\']+)', text))
    for heading in re.findall(r'^#{1,6}\s+(.+?)\s*#*$', text, re.M):
        title = re.sub(r'<[^>]+>', '', heading).replace('`', '')
        slug = re.sub(r'[^\w\- ]', '', title, flags=re.UNICODE).lower().replace(' ', '-')
        duplicate = counts[slug]
        counts[slug] += 1
        result.add(slug + (f'-{duplicate}' if duplicate else ''))
    return result


def main():
    documents = sorted((ROOT / 'docs').rglob('*.md')) + [ROOT / 'README.md', ROOT / 'CHAPTER_AGENT_GUIDE.md']
    linked = 0
    for document in documents:
        for target in re.findall(r'\]\(([^\s)]+)(?:\s+"[^"]*")?\)', prose(document.read_text())):
            parsed = urlsplit(target)
            if parsed.scheme or parsed.netloc:
                continue
            path = (document.parent / unquote(parsed.path)).resolve() if parsed.path else document
            linked += 1
            require(path.exists(), f'{document.relative_to(ROOT)}: missing {target}')
            if parsed.fragment and path.suffix == '.md' and path.exists():
                require(unquote(parsed.fragment) in anchors(path.read_text()),
                        f'{document.relative_to(ROOT)}: missing anchor {target}')
    register = json.loads((ROOT / 'docs/research/source-register.json').read_text())
    sources = register['sources']
    ids = [source['id'] for source in sources]
    urls = [source['url'] for source in sources if source.get('url')]
    require(len(ids) == len(set(ids)), 'Duplicate source IDs')
    require(len(urls) == len(set(urls)), 'Duplicate nonempty source URLs')
    catalogue = (ROOT / 'docs/research/source-catalogue.md').read_text()
    catalogue_ids = re.findall(r'^## ([A-Z0-9-]+) · ', catalogue, re.M)
    require(collections.Counter(ids) == collections.Counter(catalogue_ids), 'Catalogue/source ID mismatch')
    for source in sources:
        for key in ('publisher', 'title', 'recordedOn', 'supports', 'limits', 'reviewStatus'):
            require(bool(source.get(key)), f'{source["id"]}: missing {key}')
        record = source.get('evidenceRecord', '')
        if '.md' in record and not record.startswith(('http:', 'https:')):
            candidate = record.split('#')[0]
            if re.fullmatch(r'[A-Za-z0-9_./-]+\.md', candidate):
                require((ROOT / candidate).is_file() or (ROOT / 'docs/research' / candidate).is_file(),
                        f'{source["id"]}: missing evidenceRecord {record}')
    manifest = json.loads((ROOT / 'docs/research/data-manifest.json').read_text())
    for item in manifest['files']:
        path = ROOT / item['path']
        require(path.is_file(), f'Missing snapshot {item["path"]}')
        if path.is_file():
            content = path.read_bytes()
            require(len(content) == item['bytes'], f'Snapshot size mismatch: {item["path"]}')
            require(hashlib.sha256(content).hexdigest() == item['sha256'], f'Snapshot hash mismatch: {item["path"]}')
    buildings = json.loads((ROOT / 'public/data/buildings.json').read_text())['buildings']
    features = json.loads((ROOT / 'public/data/context.geojson').read_text())['features']
    walls = json.loads((ROOT / 'src/data/palace-walls.json').read_text())
    alignment = json.loads((ROOT / 'docs/research/amap-alignment-check.json').read_text())
    actual = {
        'buildings': len(buildings),
        'buildingsWithPositiveHeight': sum(isinstance(b.get('height'), (int, float)) and b['height'] > 0 for b in buildings),
        'buildingsWithPositiveLevels': sum(isinstance(b.get('levels'), (int, float)) and b['levels'] > 0 for b in buildings),
        'buildingsWithRoofShape': sum(bool(b.get('roof')) for b in buildings),
        'contextFeatures': len(features),
        'roads': sum(f['properties']['kind'] == 'road' for f in features),
        'parks': sum(f['properties']['kind'] == 'park' for f in features),
        'waterFeatures': sum(f['properties']['kind'] == 'water' for f in features),
        'amapAlignmentPoints': len(alignment['points']),
        'palaceWallWays': len(walls['walls']),
        'palaceWallSourceSegments': sum(len(w['coordinates'])-1 for w in walls['walls']),
        'palaceWallEntranceNodes': len(walls['entrances']),
    }
    for key, value in actual.items():
        require(manifest['counts'][key] == value, f'Data count mismatch: {key}: {value}')
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        return 1
    print(json.dumps({'documents': len(documents), 'localLinks': linked, 'sourceRecords': len(ids),
                      'sourceURLs': len(urls), 'snapshotFiles': len(manifest['files']),
                      'dataCounts': actual, 'testRunnerStarted': False}, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())
