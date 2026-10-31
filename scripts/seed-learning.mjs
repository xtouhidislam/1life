import {readFileSync,writeFileSync}from'node:fs';
const weeks=JSON.parse(readFileSync('data/learning-roadmap.json','utf8'));
const monthFor=n=>n<=4?1:n<=8?2:n<=12?3:n<=16?4:n<=20?5:6;
const criteria=weeks.flatMap(w=>[
 ...w.topics.map((label,i)=>({id:`w${String(w.number).padStart(2,'0')}-topic${String(i+1).padStart(2,'0')}`,week_number:w.number,kind:'topic',position:i+1,label})),
 {id:`w${String(w.number).padStart(2,'0')}-practice`,week_number:w.number,kind:'practice',position:100,label:w.practice},
 {id:`w${String(w.number).padStart(2,'0')}-acceptance`,week_number:w.number,kind:'acceptance',position:101,label:w.acceptance},
]);
const catalog=weeks.map(w=>({number:w.number,month:monthFor(w.number),title:w.title,milestone:w.milestone,prerequisite:w.prerequisite}));
const seed=`-- BEGIN GENERATED CURRICULUM\n-- Source: assets/progress_tracker.docx. Rebuild with scripts/import-learning.ps1 then scripts/seed-learning.mjs.\ninsert into public.learning_weeks(number,month,title,milestone,prerequisite)\nselect number,month,title,milestone,prerequisite from jsonb_to_recordset($weeks$${JSON.stringify(catalog)}$weeks$::jsonb) as w(number integer,month integer,title text,milestone boolean,prerequisite text);\ninsert into public.learning_criteria(id,week_number,kind,position,label)\nselect id,week_number,kind,position,label from jsonb_to_recordset($criteria$${JSON.stringify(criteria)}$criteria$::jsonb) as c(id text,week_number integer,kind text,position integer,label text);\n-- END GENERATED CURRICULUM`;
const path='supabase/migrations/202610310005_learning.sql';
const source=readFileSync(path,'utf8');
writeFileSync(path,source.replace(/-- BEGIN GENERATED CURRICULUM[\s\S]*?-- END GENERATED CURRICULUM/,()=>seed));
console.log(`Seeded ${catalog.length} weeks and ${criteria.length} required checklist items.`);
