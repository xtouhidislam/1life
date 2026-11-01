"""Build a display-only translation sidecar without modifying installed personal records."""
import hashlib, json, pathlib, re, unicodedata

root = pathlib.Path('data/online-knowledge')
cache = root / 'source-cache'
read = lambda path: json.loads(path.read_text(encoding='utf-8'))
rows = read(root / 'collection-180.json')
hadiths = {str(row['hadithnumber']): row for row in read(cache / 'bukhari-bangla.json')['hadiths']}
quran = {f"{sura['id']}:{verse['id']}": verse for sura in read(cache / 'quran-json-bangla.json') for verse in sura['verses']}
drafts = read(root / 'dua-bangla-drafts.json')

def normalize(text):
    text = unicodedata.normalize('NFKD', text).replace('\u0671', '\u0627').replace('\u0626', '\u064a').replace('\u0624', '\u0648')
    return ''.join(char for char in text if '\u0621' <= char <= '\u064a')

segments = {}
for path in sorted(cache.glob('dua-bangla-chapter-*.json')):
    for dua in read(path)['data']:
        for segment in dua['segments']:
            if segment.get('translations') and segment.get('arabic'):
                segments[normalize(segment['arabic'])] = {**segment, 'id': dua['dua_global_id']}

result = []
for item in rows:
    entry = {key: item[key] for key in ['kind', 'reference', 'original_text']}
    entry['draft'] = False
    if item['kind'] == 'hadith':
        number = str(item['provenance']['dataset_hadithnumber'])
        source = hadiths[number]
        entry.update(text=source['text'], credit='Bengali edition ben-bukhari, fawazahmed0/hadith-api (translator not identified by dataset)', source_url=f'https://raw.githubusercontent.com/fawazahmed0/hadith-api/df57907be35291c91ad6a6691180e22ca9920784/editions/ben-bukhari/{number}.json', license='Unlicense', source_id=number)
    elif item['kind'] == 'ayah':
        reference = item['reference'].split(' ')[1]
        entry.update(text=quran[reference]['translation'], credit='Muhiuddin Khan; quran-json 3.1.2, sourced from Tanzil.net', source_url='https://github.com/risan/quran-json/tree/v3.1.2', license='CC BY-SA 4.0', source_id=reference)
    else:
        segment = segments.get(normalize(item['original_text']))
        if segment:
            entry.update(text=segment['translations'], credit='Bengali Hisnul Muslim edition, ThelightHub/dua-api (translator not identified by API)', source_url=f"https://dua-api.hisnul.workers.dev/api/duas/{segment['id']}", license='MIT (provider README)', source_id=str(segment['id']))
        else:
            entry.update(text=drafts[str(item['day'])], credit='AI-assisted Bangla draft translated from the displayed Arabic; independent review pending', source_url=item['source_url'], license='Original draft for 1Life', source_id=str(item['day']), draft=True)
    assert re.search('[\u0980-\u09ff]', entry['text']), (item['kind'], item['day'])
    assert entry['text'].strip() and '\ufffd' not in entry['text']
    result.append(entry)

assert len(result) == 540
for kind in ['hadith', 'ayah', 'dua']:
    assert sum(row['kind'] == kind for row in result) == 180
output = json.dumps(result, ensure_ascii=False, separators=(',', ':'))
(root / 'bangla-180.json').write_text(output, encoding='utf-8')
manifest = {'checked_on': '2026-11-01', 'entries': len(result), 'source_backed': sum(not row['draft'] for row in result), 'draft_duas': sum(row['draft'] for row in result), 'sha256': hashlib.sha256(output.encode()).hexdigest(), 'sources': []}
for path in [cache / 'bukhari-bangla.json', cache / 'quran-json-bangla.json', *sorted(cache.glob('dua-bangla-chapter-*.json'))]:
    manifest['sources'].append({'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
(root / 'bangla-manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(f"Built {len(result)} Bangla translations: {manifest['source_backed']} sourced, {manifest['draft_duas']} labeled drafts.")
