import{mkdirSync,readFileSync,writeFileSync}from'node:fs';
import{createHash}from'node:crypto';
import assert from'node:assert/strict';

const dir='data/online-knowledge';mkdirSync(dir,{recursive:true});mkdirSync(`${dir}/licenses`,{recursive:true});
mkdirSync(`${dir}/source-cache`,{recursive:true});
const hash=text=>createHash('sha256').update(text).digest('hex');
const sources=[];
async function retrieve(key,url,json=true){
 const response=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw new Error(`${key}: HTTP ${response.status}`);
 const text=await response.text();writeFileSync(`${dir}/${key.startsWith('licenses/')?key:`source-cache/${key}`}.${json?'json':'txt'}`,text);
 sources.push({key,url,sha256:hash(text),bytes:Buffer.byteLength(text)});return json?JSON.parse(text):text;
}
const revision=async(repo,branch)=>(await(await fetch(`https://api.github.com/repos/${repo}/commits/${branch}`)).json()).sha;
const hadithRevision=await revision('fawazahmed0/hadith-api','1'),duaRevision=await revision('asellam/HisnElMuslim','main');
assert.match(hadithRevision,/^[a-f0-9]{40}$/);assert.match(duaRevision,/^[a-f0-9]{40}$/);
const hadithUrl=`https://raw.githubusercontent.com/fawazahmed0/hadith-api/${hadithRevision}/editions/ara-bukhari.json`;
const duaUrl=`https://raw.githubusercontent.com/asellam/HisnElMuslim/${duaRevision}/hisn.json`;
const[arabic,quranEnglish,hadiths,hisn]=await Promise.all([
 retrieve('quran-uthmani','https://api.alquran.cloud/v1/quran/quran-uthmani'),
 retrieve('quran-pickthall','https://api.alquran.cloud/v1/quran/en.pickthall'),
 retrieve('bukhari-arabic',hadithUrl),retrieve('hisn-arabic',duaUrl),
]);
assert.equal(arabic.code,200);assert.equal(quranEnglish.code,200);
await Promise.all([
 retrieve('licenses/hadith-unlicense',`https://raw.githubusercontent.com/fawazahmed0/hadith-api/${hadithRevision}/LICENSE`,false),
 retrieve('licenses/hisn-mit',`https://raw.githubusercontent.com/asellam/HisnElMuslim/${duaRevision}/LICENSE.md`,false),
 retrieve('licenses/tanzil-text-license','https://tanzil.net/docs/text_license',false),
 retrieve('licenses/quran-cloud-terms','https://alquran.cloud/terms-and-conditions',false),
]);
const normalize=text=>text.normalize('NFC').replace(/[\u064b-\u065f\u0670\u0640\s\p{P}]/gu,'');
const tanzilNotice=readFileSync(`${dir}/licenses/tanzil-text-license.txt`,'utf8').match(/<pre[^>]*>([\s\S]*?)<\/pre>/i)[1].replace(/<[^>]+>/g,'').trim();
writeFileSync(`${dir}/licenses/TANZIL-NOTICE.txt`,tanzilNotice+'\n');
const rows=[];
// Keep complete verses: Al-Fatihah, then short-surah sequences from the end.
const surahs=[1,...Array.from({length:37},(_,i)=>114-i)];
const verses=surahs.flatMap(number=>{
 const ar=arabic.data.surahs.find(s=>s.number===number),en=quranEnglish.data.surahs.find(s=>s.number===number);
 return ar.ayahs.map(verse=>{const translated=en.ayahs.find(a=>a.numberInSurah===verse.numberInSurah);assert.equal(translated.number,verse.number);return{ar,verse,translated};});
}).slice(0,180);
assert.equal(verses.length,180);
verses.forEach(({ar,verse,translated},index)=>rows.push({
 day:index+1,kind:'ayah',title:`Day ${String(index+1).padStart(3,'0')} · ${ar.englishName} ${verse.numberInSurah}`,
 original_text:verse.text,translation:translated.text,reference:`Quran ${ar.number}:${verse.numberInSurah}`,
 source_url:`https://api.alquran.cloud/v1/ayah/${ar.number}:${verse.numberInSurah}/editions/quran-uthmani,en.pickthall`,
 translator:'Marmaduke Pickthall, The Meaning of the Glorious Koran (1930), via Al Quran Cloud en.pickthall',grade:'',
 provenance:{provider:'Al Quran Cloud; Arabic Uthmani edition / Tanzil Project (https://tanzil.net)',arabic_edition:'quran-uthmani',translation_edition:'en.pickthall',global_ayah:verse.number,license_notice:tanzilNotice},
}));
// Rotate among source chapters so manners, belief, knowledge and remembrance
// all appear. Preserve each full Arabic narration, including its chain.
const sections=[2,3,78,80,81,97,1],queues=sections.map(section=>hadiths.hadiths.filter(h=>h.reference.book===section&&Number.isInteger(h.arabicnumber)&&h.text.length>=60&&h.text.length<=700).sort((a,b)=>a.hadithnumber-b.hadithnumber));
const chosen=[],seenHadith=new Set();
for(let round=0;chosen.length<180;round++){
 let available=false;
 for(const queue of queues){const h=queue[round];if(!h)continue;available=true;const key=normalize(h.text);if(seenHadith.has(key))continue;seenHadith.add(key);chosen.push(h);if(chosen.length===180)break;}
 if(!available)throw new Error('Not enough unique eligible hadiths');
}
chosen.forEach((h,index)=>rows.push({
 day:index+1,kind:'hadith',title:`Day ${String(index+1).padStart(3,'0')} · Bukhari ${h.arabicnumber} · ${hadiths.metadata.sections[h.reference.book]}`,
 original_text:h.text,translation:'',reference:`Sahih al-Bukhari ${h.arabicnumber}; book ${h.reference.book}, hadith ${h.reference.hadith}`,
 source_url:`https://raw.githubusercontent.com/fawazahmed0/hadith-api/${hadithRevision}/editions/ara-bukhari/${h.hadithnumber}.json`,translator:'',grade:'',
 provenance:{provider:'fawazahmed0/hadith-api, Arabic Sahih al-Bukhari; classical Arabic text',revision:hadithRevision,dataset_hadithnumber:h.hadithnumber,arabicnumber:h.arabicnumber,canonical_url:`https://sunnah.com/bukhari:${h.arabicnumber}`},
}));
const chapters=Object.entries(hisn).map(([title,value],chapter)=>({title,chapter:chapter+1,entries:value.Adhkar}));
const duas=[],seenDua=new Set();
for(let round=0;duas.length<180;round++){
 let available=false;
 for(const chapter of chapters){const d=chapter.entries[round];if(!d)continue;available=true;if(!d.Text||!d.Reference?.trim()||d.Text.length<10||d.Text.length>12000||d.Reference.length>400)continue;
  const key=normalize(d.Text);if(seenDua.has(key))continue;seenDua.add(key);duas.push({chapter,d,entry:round+1});if(duas.length===180)break;
 }
 if(!available)throw new Error('Not enough distinct sourced duas/adhkar');
}
duas.forEach(({chapter,d,entry},index)=>rows.push({
 day:index+1,kind:'dua',title:`Day ${String(index+1).padStart(3,'0')} · ${chapter.title}`,
 original_text:d.Text,translation:'',reference:`Hisn al-Muslim, chapter ${chapter.chapter}, entry ${entry}: ${d.Reference}`,
 source_url:`https://github.com/asellam/HisnElMuslim/blob/${duaRevision}/hisn.json`,translator:'',grade:'',
 provenance:{provider:'Hisn al-Muslim Arabic transcription by Abdellah SELLAM (asellam/HisnElMuslim)',revision:duaRevision,chapter:chapter.chapter,chapter_title:chapter.title,entry,source_reference:d.Reference,repetition_count:d.Count},
}));
rows.sort((a,b)=>a.day-b.day||a.kind.localeCompare(b.kind));
for(const kind of['hadith','ayah','dua']){
 const selected=rows.filter(row=>row.kind===kind);assert.equal(selected.length,180);assert.equal(new Set(selected.map(row=>row.reference.toLowerCase().trim())).size,180);
  if(kind!=='ayah')assert.equal(new Set(selected.map(row=>normalize(row.original_text))).size,180);
}
for(const row of rows){assert.ok(row.title.length<=200);assert.ok(row.reference.length<=500);assert.ok(row.original_text.length<=12000);assert.ok(row.source_url.startsWith('https://'));}
writeFileSync(`${dir}/collection-180.json`,JSON.stringify(rows,null,2));
for(const kind of['hadith','ayah','dua'])writeFileSync(`${dir}/${kind}-180-import.json`,JSON.stringify(rows.filter(row=>row.kind===kind),null,2));
const manifest={package:'online-180-v1',days:180,items:540,counts:{hadith:180,ayah:180,dua:180},sources,collection_sha256:hash(JSON.stringify(rows)),notes:[
 'Arabic originals are preserved exactly from the referenced datasets; normalization is used only for duplicate detection.',
 'Quran verses use Al-Fatihah followed by short-surah sequences. The final sequence may end partway through a surah.',
 'Hadith selection is a source-preserving thematic sampling of shorter complete Bukhari narrations, not a scholarly importance ranking.',
 'Dua includes supplications and adhkar from Hisn al-Muslim, with source references and repetition counts preserved in provenance.',
 'No generated translations or inferred authenticity grades. Hadith and Dua translations are intentionally blank; Quran English is Pickthall (1930).',
]};
writeFileSync(`${dir}/manifest.json`,JSON.stringify(manifest,null,2));
console.log('Built 540 source-referenced entries: 180 Hadiths, 180 Ayahs, 180 Duas/adhkar.');
