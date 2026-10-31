export type Pattern='push'|'pull'|'legs'|'core';
export type Movement={id:string;pattern:Pattern;level:number;title:string;graduate:string;minimum:number;unit:'reps'|'seconds';sets:number;visual:string;bar:boolean};
export type WorkoutSet={movement_id:string;set_number:number;quantity:number;unit:'reps'|'seconds'};
export type WorkoutSession={id:string;session_date:string;status:'completed'|'rest';minutes:number;notes:string;set_count?:number};
export type ExerciseState={start_date:string;bar_available:boolean;movements:Movement[];levels:Record<Pattern,number>;session:WorkoutSession|null;sets:WorkoutSet[];history:WorkoutSession[];level_history:{id:string;pattern:Pattern;from_level:number;to_level:number;notes:string;created_at:string}[]};
export const patterns:Pattern[]=['push','pull','legs','core'];
export function programMonth(start:string,date:string):number{
 if(date<start)return 0;
 const begin=new Date(start+'T12:00:00Z'),now=new Date(date+'T12:00:00Z');
 let months=(now.getUTCFullYear()-begin.getUTCFullYear())*12+now.getUTCMonth()-begin.getUTCMonth();
 const lastDay=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,0)).getUTCDate();
 if(now.getUTCDate()<Math.min(begin.getUTCDate(),lastDay))months--;
 return months+1;
}
