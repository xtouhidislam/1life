import { amountToMinor } from './dashboard-utils';

export const financeCategories=['Food & drink','Transport','Bills','Learning','Health','Shopping','Family','Salary','Freelance','Other'];
export type FinanceEntry={id:string;entry_date:string;title:string;kind:'expense'|'income';category:string;amount_minor:number};
export type FinanceValues=Omit<FinanceEntry,'id'>;

export function financeValues(form:FormData,today:string):FinanceValues {
  const title=String(form.get('title')??'').trim(),entry_date=String(form.get('entry_date')??'');
  const category=String(form.get('category')??'Other').trim();
  const kind=String(form.get('transaction_kind')??'expense');
  if(!title||title.length>200)throw new Error('Enter a title of up to 200 characters.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(entry_date)||entry_date>today)throw new Error('Choose today or a past date.');
  if(!category||category.length>40)throw new Error('Choose a category of up to 40 characters.');
  if(kind!=='expense'&&kind!=='income')throw new Error('Choose income or expense.');
  const amount_minor=amountToMinor(String(form.get('amount')??'').trim());
  if(amount_minor<=0)throw new Error('Enter an amount greater than zero.');
  return {title,entry_date,category,kind,amount_minor};
}

export function financeCsv(entries:FinanceEntry[],currency:string):string {
  const text=(value:string)=>`"${(/^[\s]*[=+\-@]/.test(value)||/^[\t\r\n]/.test(value)?"'":'')+value.replaceAll('"','""')}"`;
  const lines=[['Date','Type','Category','Description','Amount','Currency'].map(text).join(',')];
  for(const row of entries)lines.push([text(row.entry_date),text(row.kind),text(row.category),text(row.title),(row.amount_minor/100).toFixed(2),text(currency)].join(','));
  return '\uFEFF'+lines.join('\r\n');
}
