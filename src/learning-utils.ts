import { shiftDate } from './task-utils';

export type LearningWeek={number:number;month:number;title:string;milestone:boolean;prerequisite:string;unlocked:boolean;total:number;done:number};
export type LearningCriterion={id:string;week_number:number;kind:'topic'|'practice'|'acceptance';position:number;label:string;completed_at:string|null};
export type LearningEvidence={week_number:number;notes:string;url:string};
export type LearningProject={id:string;title:string;description:string;start_week:number;end_week:number;unlocked:boolean;total:number;done:number;notes:string;url:string};
export type LearningState={start_date:string;weeks:LearningWeek[];criteria:LearningCriterion[];evidence:LearningEvidence[];projects:LearningProject[]};
export const learningMonths=['Python & APIs','Backend & LLMs','RAG & quality','Automation & agents','Production engineering','Capstone & career'];
export function weekRange(start:string,week:number){return {start:shiftDate(start,(week-1)*7),end:shiftDate(start,week*7-1)};}
export function weekStatus(week:Pick<LearningWeek,'unlocked'|'done'|'total'>):'locked'|'complete'|'active' {return !week.unlocked?'locked':week.done===week.total?'complete':'active';}
export function safeEvidenceUrl(raw:string):string {
  const value=raw.trim();if(!value)return '';
  if(value.length>2000||/\s/.test(value))throw new Error('Enter a valid link without spaces.');
  try{const parsed=new URL(value);if(!['http:','https:'].includes(parsed.protocol)||!parsed.hostname)throw new Error();}
  catch{throw new Error('Use a full http:// or https:// link.');}
  return value;
}
