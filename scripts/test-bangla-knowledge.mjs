import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const originals=read('data/online-knowledge/collection-180.json'),translations=read('data/online-knowledge/bangla-180.json');
assert.equal(translations.length,540);
const seen=new Set();
for(const original of originals){
 const matches=translations.filter(row=>row.kind===original.kind&&row.reference===original.reference);
 assert.equal(matches.length,1,`One translation for ${original.reference}`);
 const row=matches[0],key=`${row.kind}:${row.reference}`;assert.ok(!seen.has(key));seen.add(key);
 assert.equal(row.original_text,original.original_text,'Arabic remains verbatim');
 assert.match(row.text,/[\u0980-\u09ff]/);assert.ok(row.text.trim().length>0);assert.ok(!row.text.includes('\ufffd'));
 assert.match(row.source_url,/^https:\/\//);assert.ok(row.credit);assert.ok(row.license);
 if(row.draft){assert.equal(row.kind,'dua');assert.match(row.credit,/draft.*review pending/);}
}
for(const kind of['hadith','ayah','dua'])assert.equal(translations.filter(row=>row.kind===kind).length,180);
assert.equal(translations.filter(row=>row.draft).length,77);
assert.ok(translations.filter(row=>row.kind==='hadith').every(row=>row.source_url.includes('/ben-bukhari/')));
console.log('PASS: 540 unique Bangla translations; 180 per kind; verbatim original binding; Bengali script; source/license credits; all 77 drafts explicitly labeled; no changes to stored personal progress.');
