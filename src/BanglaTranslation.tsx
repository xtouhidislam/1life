import{useEffect,useState}from'react';
import type{KnowledgeItem}from'./knowledge-utils';
import './bangla-translation.css';

type Entry={kind:string;reference:string;original_text:string;text:string;credit:string;source_url:string;license:string;draft:boolean};
let catalog:Promise<Map<string,Entry>>|undefined;
const key=(kind:string,reference:string)=>`${kind}:${reference.trim().toLowerCase()}`;
export const hasBanglaTranslation=(item:KnowledgeItem)=>/[\u0980-\u09ff]/.test(item.translation);
function loadCatalog(){
 if(!catalog)catalog=fetch(new URL('../data/online-knowledge/bangla-180.json',import.meta.url).href)
  .then(async response=>{if(!response.ok)throw new Error('Translation download failed');const rows=await response.json()as Entry[];if(!Array.isArray(rows)||rows.length!==540)throw new Error('Incomplete translation collection');return new Map(rows.map(row=>[key(row.kind,row.reference),row]));})
  .catch(error=>{catalog=undefined;throw error;});
 return catalog;
}

export function BanglaTranslation({item}:{item:KnowledgeItem}){
 const[entry,setEntry]=useState<Entry|null>(null),[state,setState]=useState<'loading'|'ready'|'error'>('loading'),[retry,setRetry]=useState(0);
 const ownBangla=hasBanglaTranslation(item);
 useEffect(()=>{let active=true;setEntry(null);setState('loading');
  if(ownBangla){setState('ready');return()=>{active=false;};}
  void loadCatalog().then(rows=>{if(!active)return;const match=rows.get(key(item.kind,item.reference));setEntry(match?.original_text===item.original_text?match:null);setState('ready');}).catch(()=>{if(active)setState('error');});
  return()=>{active=false;};
 },[item.kind,item.reference,item.original_text,ownBangla,retry]);
 // Gate on exact text as well as reference, so edited Arabic never receives an unrelated translation.
 const matching=entry?.original_text===item.original_text&&key(entry.kind,entry.reference)===key(item.kind,item.reference)?entry:null;
 if(ownBangla)return <div className="bangla-translation"><span className="bangla-label" lang="bn">বাংলা অনুবাদ</span><p lang="bn" dir="ltr">{item.translation}</p><small>Translation: {item.translator}</small></div>;
 if(state==='loading')return <p className="bangla-status" role="status" lang="bn">বাংলা অনুবাদ লোড হচ্ছে…</p>;
 if(state==='error')return <div className="bangla-status"><p lang="bn">বাংলা অনুবাদ লোড করা যায়নি।</p><button className="text-link" type="button" onClick={()=>setRetry(value=>value+1)}>Retry Bangla translation</button></div>;
 if(!matching)return <p className="bangla-status" lang="bn">এই লেখাটির বাংলা অনুবাদ এখনো যুক্ত হয়নি।</p>;
 return <div className="bangla-translation"><span className="bangla-label" lang="bn">বাংলা অনুবাদ{matching.draft?' · খসড়া—পর্যালোচনা প্রয়োজন':''}</span><p lang="bn" dir="ltr">{matching.text}</p><small>{matching.credit}</small><a href={matching.source_url} target="_blank" rel="noreferrer">{matching.draft?'Arabic source':'Translation source'} · {matching.license}</a></div>;
}
