export type KnowledgeKind='hadith'|'ayah'|'dua';
export type KnowledgeItem={id:string;kind:KnowledgeKind;title:string;original_text:string;translation:string;reference:string;source_url:string;translator:string;grade:string;reviewed_at:string|null;archived:boolean;status:'new'|'learning'|'memorized';source_method?:'user'|'online-source';source_metadata?:{provider?:string;repetition_count?:number;license_notice?:string};plan_day?:number|null};
export type KnowledgeBook={id:string;title:string;author:string;total_pages:number;pages_read:number;notes:string;source_url:string;archived:boolean};
export const knowledgeTargets={hadith:180,ayah:180,dua:180,books:6};
export const knowledgeLabels={hadith:'Hadiths',ayah:'Ayahs',dua:'Duas',books:'Books'};
export function sourceUrl(raw:string,optional=false):string{
 const value=raw.trim();if(!value&&optional)return'';
 try{const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||!url.hostname||/\s/.test(value)||value.length>2000)throw new Error();}
 catch{throw new Error('Use a full http:// or https:// source link.');}return value;
}
export function knowledgeValues(form:FormData,kind:KnowledgeKind){
 const text=(name:string)=>String(form.get(name)??'').trim();
 const title=text('title'),original_text=text('original_text'),reference=text('reference');
 if(!title||!original_text||!reference)throw new Error('Add a title, original text, and source reference.');
 if(text('translation')&&!text('translator'))throw new Error('Add the translator or translation source when including a translation.');
 return{kind,title,original_text,reference,translation:text('translation'),source_url:sourceUrl(text('source_url')),translator:text('translator'),grade:text('grade')};
}
export function parseKnowledgeImport(raw:string){
 const data=JSON.parse(raw);if(!Array.isArray(data)||data.length<1||data.length>500)throw new Error('Import a JSON array with 1–500 items.');
 return data.map((item,index)=>{
  if(!item||typeof item!=='object'||!['hadith','ayah','dua'].includes(item.kind))throw new Error(`Item ${index+1}: choose kind hadith, ayah, or dua.`);
  const form=new FormData();for(const field of['title','original_text','reference','translation','source_url','translator','grade']){
   if(item[field]!==undefined&&typeof item[field]!=='string')throw new Error(`Item ${index+1}: ${field} must be text.`);form.set(field,item[field]??'');
  }return knowledgeValues(form,item.kind);
 });
}
export const knowledgeTemplate=[{kind:'hadith',title:'',original_text:'',translation:'',reference:'',source_url:'',translator:'',grade:''}];
