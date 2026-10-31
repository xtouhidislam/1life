import{readFileSync,writeFileSync}from'node:fs';
const data=JSON.parse(readFileSync('data/exercise-plan.json','utf8'));
const path='supabase/migrations/202610310006_exercise.sql';
const seed=`-- BEGIN GENERATED EXERCISE\ninsert into public.exercise_movements(id,pattern,level,title,graduate,minimum,unit,sets,visual,bar)\nselect id,pattern,level,title,graduate,minimum,unit,sets,visual,bar from jsonb_to_recordset($moves$${JSON.stringify(data.movements)}$moves$::jsonb)as m(id text,pattern text,level integer,title text,graduate text,minimum integer,unit text,sets integer,visual text,bar boolean);\n-- END GENERATED EXERCISE`;
writeFileSync(path,readFileSync(path,'utf8').replace(/-- BEGIN GENERATED EXERCISE[\s\S]*?-- END GENERATED EXERCISE/,()=>seed));
console.log(`Seeded ${data.movements.length} movement levels.`);
