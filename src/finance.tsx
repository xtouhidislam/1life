import { financeCategories } from './finance-utils';
import type { FinanceEntry } from './finance-utils';

export function FinanceFields({entry,today,currency,defaultDate=today}:{entry?:Partial<FinanceEntry>;today:string;currency:string;defaultDate?:string}) {
  return <>
    <label>Title<input name="title" required maxLength={200} defaultValue={entry?.title} autoFocus placeholder="e.g. Groceries or salary"/></label>
    <label>Date<input aria-label="Entry date" name="entry_date" type="date" required max={today} defaultValue={entry?.entry_date??defaultDate}/></label>
    <div className="form-columns"><label>Type<select aria-label="Transaction type" name="transaction_kind" defaultValue={entry?.kind??'expense'}><option value="expense">Expense</option><option value="income">Income</option></select></label>
    <FinanceCategoryField category={entry?.category}/></div>
    <label>Amount ({currency})<input aria-label="Amount" name="amount" type="text" inputMode="decimal" required defaultValue={entry?.amount_minor?(entry.amount_minor/100).toFixed(2):''} placeholder="0.00"/></label>
  </>;
}

export function FinanceCategoryField({category='Other'}:{category?:string}) {
  const categories=financeCategories.includes(category)?financeCategories:[category,...financeCategories];
  return <label>Category<select aria-label="Category" name="category" defaultValue={category}>{categories.map(value=><option key={value} value={value}>{value}</option>)}</select></label>;
}

