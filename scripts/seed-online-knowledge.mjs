import{readFileSync,writeFileSync}from'node:fs';
const rows=JSON.parse(readFileSync('data/online-knowledge/collection-180.json','utf8'));
if(rows.length!==540)throw new Error('Expected 540 online entries');
const path='supabase/migrations/202610310008_online_knowledge.sql';
const seed=`-- BEGIN GENERATED ONLINE COLLECTION\n-- Source attribution and license notices: docs/ONLINE_KNOWLEDGE_SOURCES.md and data/online-knowledge/licenses/.\n-- Quran Arabic preserved verbatim. Tanzil Project, https://tanzil.net, CC BY 3.0.\ninsert into public.knowledge_online_catalog(kind,day,item)\nselect item->>'kind',(item->>'day')::integer,item from jsonb_array_elements($online$${JSON.stringify(rows)}$online$::jsonb)item;\n-- END GENERATED ONLINE COLLECTION`;
writeFileSync(path,readFileSync(path,'utf8').replace(/-- BEGIN GENERATED ONLINE COLLECTION[\s\S]*?-- END GENERATED ONLINE COLLECTION/,()=>seed));
console.log(`Embedded ${rows.length} sourced items in migration 008.`);
