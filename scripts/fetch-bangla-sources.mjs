import{readFileSync,writeFileSync,mkdirSync}from'node:fs';
const dir='data/online-knowledge/source-cache';mkdirSync(dir,{recursive:true});
async function get(name,url){const path=`${dir}/${name}.json`;const response=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error(`${name}: HTTP ${response.status}`);const text=await response.text();const value=JSON.parse(text);writeFileSync(path,text);return value;}
const rows=JSON.parse(readFileSync('data/online-knowledge/collection-180.json','utf8'));
const chapters=await get('dua-bangla-chapters','https://dua-api.hisnul.workers.dev/api/books/1/chapters');
const info=await get('quranenc-bangla-info','https://quranenc.com/api/v1/translations/list');
console.log('Quran editions:',JSON.stringify(info.translations?.filter(row=>row.key?.includes('bengali'))));
const jobs=chapters.data.map(chapter=>()=>get(`dua-bangla-chapter-${chapter.chap_id}`,`https://dua-api.hisnul.workers.dev/api/books/1/chapters/${chapter.chap_id}/duas`));
for(const sura of new Set(rows.filter(row=>row.kind==='ayah').map(row=>Number(row.reference.split(' ')[1].split(':')[0]))))jobs.push(()=>get(`quranenc-bangla-sura-${sura}`,`https://quranenc.com/api/v1/translation/sura/bengali_zakaria/${sura}`));
let next=0,completed=0;await Promise.all(Array.from({length:5},async()=>{while(next<jobs.length){const job=jobs[next++];await job();completed++;if(completed%25===0)console.log(`Downloaded ${completed}/${jobs.length} chapters`);}}));
console.log(`Cached ${completed} source chapters.`);
