import{readFileSync,writeFileSync}from'node:fs';
import assert from'node:assert/strict';
const dir='data/online-knowledge';
const rows=JSON.parse(readFileSync(`${dir}/collection-180.json`,'utf8'));
const quran=JSON.parse(readFileSync(`${dir}/source-cache/quran-uthmani.json`,'utf8'));
const english=JSON.parse(readFileSync(`${dir}/source-cache/quran-pickthall.json`,'utf8'));
const hadiths=JSON.parse(readFileSync(`${dir}/source-cache/bukhari-arabic.json`,'utf8'));
const hisn=Object.entries(JSON.parse(readFileSync(`${dir}/source-cache/hisn-arabic.json`,'utf8')));
assert.equal(rows.length,540);
for(const kind of['hadith','ayah','dua']){
 const selected=rows.filter(r=>r.kind===kind);assert.equal(selected.length,180);assert.equal(new Set(selected.map(r=>r.day)).size,180);assert.equal(new Set(selected.map(r=>r.reference)).size,180);
}
for(const row of rows){
 if(row.kind==='hadith'){
  const source=hadiths.hadiths.find(h=>h.hadithnumber===row.provenance.dataset_hadithnumber);assert.equal(row.original_text,source.text);assert.equal(row.provenance.arabicnumber,source.arabicnumber);assert.equal(row.translation,'');assert.equal(row.grade,'');
 }else if(row.kind==='ayah'){
  const a=quran.data.surahs.flatMap(s=>s.ayahs).find(a=>a.number===row.provenance.global_ayah),e=english.data.surahs.flatMap(s=>s.ayahs).find(a=>a.number===row.provenance.global_ayah);
  assert.equal(row.original_text,a.text);assert.equal(row.translation,e.text);assert.ok(row.provenance.license_notice.includes('Tanzil Project'));
 }else{
  const chapter=hisn[row.provenance.chapter-1],source=chapter[1].Adhkar[row.provenance.entry-1];assert.equal(row.original_text,source.Text);assert.equal(row.provenance.source_reference,source.Reference);assert.equal(row.translation,'');
 }
 assert.ok(row.original_text.length<=12000&&row.reference.length<=500&&row.title.length<=200);
}
if(process.argv.includes('--online')){
 let index=0,verified=0;
 const hadithRows=rows.filter(r=>r.kind==='hadith');
 await Promise.all(Array.from({length:4},async()=>{
  while(index<hadithRows.length){const row=hadithRows[index++];let failure;
   for(let attempt=0;attempt<3;attempt++){
    try{const r=await fetch(row.source_url,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);const d=await r.json();assert.ok(d.hadiths.some(h=>h.text===row.original_text));verified++;failure=null;break;}
    catch(error){failure=error;}
   }
   if(failure)throw new Error(`Source link failed for ${row.reference}: ${failure.message}`);
  }
 }));
 writeFileSync(`${dir}/verification.json`,JSON.stringify({checked_on:'2026-10-31',entries:540,verbatim_arabic_matches:540,quran_translation_matches:180,individual_hadith_links_checked:verified,method:'Exact byte/string comparison with downloaded source snapshots; each individual Hadith URL also fetched and compared. This is data provenance validation, not independent scholarly authentication.'},null,2));
 console.log(`PASS: ${verified} individual Hadith links return the exact Arabic narration.`);
}
console.log('PASS: 540 Arabic entries match their sources exactly; 180 Pickthall translations match; day/reference counts and schema lengths valid.');
