begin;
create table public.knowledge_items(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id)on delete cascade,
 kind text not null check(kind in('hadith','ayah','dua')),title text not null check(length(trim(title))between 1 and 200),
 original_text text not null check(length(trim(original_text))between 1 and 12000),translation text not null default '' check(length(translation)<=12000),
 reference text not null check(length(trim(reference))between 1 and 500),source_url text not null check(length(source_url)<=2000 and source_url~'^https?://[^[:space:]]+$'),
 translator text not null default ''check(length(translator)<=500),grade text not null default ''check(length(grade)<=500),
 reviewed_at timestamptz,archived boolean not null default false,created_at timestamptz not null default now(),unique(id,user_id),
 check(translation=''or length(trim(translator))>0)
);
create unique index knowledge_owner_reference on public.knowledge_items(user_id,kind,lower(trim(reference)));
create table public.knowledge_progress(
 user_id uuid not null references auth.users(id)on delete cascade,item_id uuid not null,
 status text not null check(status in('new','learning','memorized')),updated_at timestamptz not null default now(),primary key(user_id,item_id),
 foreign key(item_id,user_id)references public.knowledge_items(id,user_id)on delete cascade
);
create table public.knowledge_daily(
 user_id uuid not null references auth.users(id)on delete cascade,day date not null,kind text not null check(kind in('hadith','ayah')),
 item_id uuid not null,primary key(user_id,day,kind),foreign key(item_id,user_id)references public.knowledge_items(id,user_id)
);
create table public.knowledge_books(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id)on delete cascade,
 title text not null check(length(trim(title))between 1 and 200),author text not null default ''check(length(author)<=200),
 total_pages integer not null check(total_pages between 1 and 10000),notes text not null default ''check(length(notes)<=4000),
 source_url text not null default ''check(source_url=''or(length(source_url)<=2000 and source_url~'^https?://[^[:space:]]+$')),
 archived boolean not null default false,created_at timestamptz not null default now(),unique(id,user_id)
);
alter table public.reading_logs add column book_id uuid;
alter table public.reading_logs add foreign key(book_id,user_id)references public.knowledge_books(id,user_id);
create index reading_owner_book on public.reading_logs(user_id,book_id);
do $$declare table_name text;begin
 foreach table_name in array array['knowledge_items','knowledge_progress','knowledge_daily','knowledge_books']loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('revoke all on public.%I from public,anon,authenticated',table_name);
  execute format('grant select on public.%I to authenticated',table_name);
  execute format('create policy "Read own knowledge"on public.%I for select to authenticated using((select auth.uid())=user_id)',table_name);
 end loop;
end$$;

create function public.save_knowledge_item(p_item jsonb,p_id uuid default null)returns uuid
language plpgsql security definer set search_path=''as $$
declare owner_id uuid:=auth.uid();item_key uuid;begin
 if owner_id is null then raise exception 'Sign in first';end if;
 if jsonb_typeof(p_item)is distinct from 'object'then raise exception 'Provide one knowledge item';end if;
 if p_id is null then
  insert into public.knowledge_items(user_id,kind,title,original_text,translation,reference,source_url,translator,grade)
  values(owner_id,p_item->>'kind',trim(p_item->>'title'),trim(p_item->>'original_text'),coalesce(p_item->>'translation',''),trim(p_item->>'reference'),trim(p_item->>'source_url'),coalesce(p_item->>'translator',''),coalesce(p_item->>'grade',''))returning id into item_key;
 else
  if exists(select 1 from public.knowledge_items where id=p_id and user_id=owner_id and kind<>p_item->>'kind')then raise exception 'The collection type cannot be changed; add a separate item instead';end if;
  update public.knowledge_items set kind=p_item->>'kind',title=trim(p_item->>'title'),original_text=trim(p_item->>'original_text'),translation=coalesce(p_item->>'translation',''),reference=trim(p_item->>'reference'),source_url=trim(p_item->>'source_url'),translator=coalesce(p_item->>'translator',''),grade=coalesce(p_item->>'grade',''),reviewed_at=null
  where id=p_id and user_id=owner_id returning id into item_key;
  if not found then raise exception 'Knowledge item not found';end if;
 end if;
 return item_key;
end$$;

create function public.import_knowledge(p_items jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare owner_id uuid:=auth.uid();item jsonb;added integer:=0;affected integer;begin
 if owner_id is null then raise exception 'Sign in first';end if;
 if p_items is null or jsonb_typeof(p_items)<>'array'then raise exception 'Import must be a JSON array';end if;
 if jsonb_array_length(p_items)not between 1 and 500 then raise exception 'Import between 1 and 500 items at a time';end if;
 for item in select value from jsonb_array_elements(p_items)loop
  if jsonb_typeof(item)<>'object'then raise exception 'Each imported item must be an object';end if;
  insert into public.knowledge_items(user_id,kind,title,original_text,translation,reference,source_url,translator,grade)
  values(owner_id,item->>'kind',trim(item->>'title'),trim(item->>'original_text'),coalesce(item->>'translation',''),trim(item->>'reference'),trim(item->>'source_url'),coalesce(item->>'translator',''),coalesce(item->>'grade',''))
  on conflict(user_id,kind,lower(trim(reference)))do nothing;
  get diagnostics affected=row_count;added:=added+affected;
 end loop;
 return jsonb_build_object('added',added,'skipped',jsonb_array_length(p_items)-added);
end$$;

create function public.review_knowledge(p_id uuid,p_confirm boolean)returns void language plpgsql security definer set search_path=''as $$
begin
 if auth.uid()is null then raise exception 'Sign in first';end if;
 if p_confirm is null then raise exception 'Confirm the review state';end if;
 update public.knowledge_items set reviewed_at=case when p_confirm then now()else null end where id=p_id and user_id=auth.uid()and not archived;
 if not found then raise exception 'Active knowledge item not found';end if;
end$$;
create function public.set_knowledge_progress(p_id uuid,p_status text)returns void language plpgsql security definer set search_path=''as $$
begin
 if auth.uid()is null then raise exception 'Sign in first';end if;
 perform 1 from public.knowledge_items where id=p_id and user_id=auth.uid()and reviewed_at is not null and not archived for update;
 if not found then raise exception 'Review this item against its source before tracking memorization';end if;
 insert into public.knowledge_progress(user_id,item_id,status)values(auth.uid(),p_id,p_status)
 on conflict(user_id,item_id)do update set status=excluded.status,updated_at=now();
end$$;
create function public.archive_knowledge(p_id uuid,p_archived boolean,p_book boolean default false)returns void language plpgsql security definer set search_path=''as $$
begin
 if auth.uid()is null then raise exception 'Sign in first';end if;
 if p_archived is null or p_book is null then raise exception 'Choose an archive state';end if;
 if p_book then update public.knowledge_books set archived=p_archived where id=p_id and user_id=auth.uid();
 else update public.knowledge_items set archived=p_archived where id=p_id and user_id=auth.uid();end if;
 if not found then raise exception 'Record not found';end if;
end$$;

create function public.save_knowledge_book(p_book jsonb,p_id uuid default null)returns uuid language plpgsql security definer set search_path=''as $$
declare result uuid;begin
 if auth.uid()is null then raise exception 'Sign in first';end if;
 if p_id is null then
  insert into public.knowledge_books(user_id,title,author,total_pages,notes,source_url)values(auth.uid(),trim(p_book->>'title'),coalesce(p_book->>'author',''),(p_book->>'total_pages')::integer,coalesce(p_book->>'notes',''),coalesce(p_book->>'source_url',''))returning id into result;
 else
  update public.knowledge_books set title=trim(p_book->>'title'),author=coalesce(p_book->>'author',''),total_pages=(p_book->>'total_pages')::integer,notes=coalesce(p_book->>'notes',''),source_url=coalesce(p_book->>'source_url','')where id=p_id and user_id=auth.uid()returning id into result;
  if not found then raise exception 'Book not found';end if;
 end if;
 return result;
end$$;
create function public.log_book_reading(p_book uuid,p_date date,p_pages integer,p_request uuid default null)returns uuid language plpgsql security definer set search_path=''as $$
declare book_title text;result uuid;begin
 if auth.uid()is null then raise exception 'Sign in first';end if;
 select title into book_title from public.knowledge_books where id=p_book and user_id=auth.uid()and not archived;
 if not found then raise exception 'Active book not found';end if;
 insert into public.reading_logs(id,user_id,book_id,entry_date,title,pages)values(coalesce(p_request,gen_random_uuid()),auth.uid(),p_book,p_date,book_title,p_pages)
 on conflict(id)do update set entry_date=excluded.entry_date,title=excluded.title,pages=excluded.pages
 where reading_logs.user_id=auth.uid()and reading_logs.book_id=p_book returning id into result;
 if result is null then raise exception 'This reading request could not be saved';end if;
 return result;
end$$;

create function public.knowledge_daily_items()returns jsonb language plpgsql security definer set search_path=''as $$
declare owner_id uuid:=auth.uid();today date:=(now()at time zone 'Asia/Dhaka')::date;begin
 if owner_id is null then raise exception 'Sign in first';end if;
 insert into public.profiles(id)values(owner_id)on conflict do nothing;
 perform 1 from public.profiles where id=owner_id for update;
 insert into public.knowledge_daily(user_id,day,kind,item_id)
 select owner_id,today,k.kind,item.id from(values('hadith'),('ayah'))k(kind)
 cross join lateral(select id from public.knowledge_items where user_id=owner_id and kind=k.kind and reviewed_at is not null and not archived order by md5(today::text||id::text)limit 1)item
 on conflict(user_id,day,kind)do nothing;
 return(select coalesce(jsonb_object_agg(d.kind,to_jsonb(i)),'{}'::jsonb)from public.knowledge_daily d join public.knowledge_items i on i.id=d.item_id
 where d.user_id=owner_id and d.day=today and i.kind=d.kind and i.reviewed_at is not null and not i.archived);
end$$;

create function public.knowledge_state()returns jsonb language plpgsql security invoker set search_path=''as $$
begin
 if auth.uid()is null then raise exception 'Sign in first';end if;
 return jsonb_build_object(
 'counts',(select jsonb_agg(row_to_json(r))from(select k.kind,count(i.id)as total,count(i.id)filter(where i.reviewed_at is not null)as reviewed,count(i.id)filter(where i.reviewed_at is not null and p.status='memorized')as memorized
  from(values('hadith'),('ayah'),('dua'))k(kind)left join public.knowledge_items i on i.user_id=auth.uid()and i.kind=k.kind and not i.archived left join public.knowledge_progress p on p.item_id=i.id and p.user_id=auth.uid()group by k.kind)r),
 'books',(select coalesce(jsonb_agg(row_to_json(r)order by r.created_at),'[]'::jsonb)from(select b.*,coalesce((select sum(pages)from public.reading_logs where user_id=auth.uid()and book_id=b.id),0)as pages_read from public.knowledge_books b where user_id=auth.uid())r)
 );
end$$;

create function public.knowledge_list(p_kind text,p_search text default '',p_status text default 'all',p_review text default 'all',p_archived boolean default false,p_page integer default 0)returns jsonb
language plpgsql security invoker set search_path=''as $$
declare result jsonb;begin
 if auth.uid()is null then raise exception 'Sign in first';end if;
 if p_kind is null or p_kind not in('hadith','ayah','dua')or p_status is null or p_status not in('all','new','learning','memorized')or p_review is null or p_review not in('all','reviewed','pending')or p_search is null or length(p_search)>200 or p_page is null or p_page<0 or p_page>100000 or p_archived is null then raise exception 'Invalid library filter';end if;
 with filtered as materialized(
 select i.*,coalesce(p.status,'new')as status from public.knowledge_items i left join public.knowledge_progress p on p.user_id=auth.uid()and p.item_id=i.id
 where i.user_id=auth.uid()and i.kind=p_kind and i.archived=p_archived
 and(p_search=''or position(lower(p_search)in lower(i.title||' '||i.original_text||' '||i.translation||' '||i.reference))>0)
 and(p_status='all'or coalesce(p.status,'new')=p_status)
 and(p_review='all'or(p_review='reviewed'and i.reviewed_at is not null)or(p_review='pending'and i.reviewed_at is null))
 ),page as(select * from filtered order by created_at,id limit 20 offset p_page*20)
 select jsonb_build_object('total',(select count(*)from filtered),'items',(select coalesce(jsonb_agg(row_to_json(page)order by created_at,id),'[]'::jsonb)from page))into result;
 return result;
end$$;

revoke all on function public.save_knowledge_item(jsonb,uuid),public.import_knowledge(jsonb),public.review_knowledge(uuid,boolean),public.set_knowledge_progress(uuid,text),public.archive_knowledge(uuid,boolean,boolean),public.save_knowledge_book(jsonb,uuid),public.log_book_reading(uuid,date,integer,uuid),public.knowledge_daily_items(),public.knowledge_state(),public.knowledge_list(text,text,text,text,boolean,integer)from public,anon;
grant execute on function public.save_knowledge_item(jsonb,uuid),public.import_knowledge(jsonb),public.review_knowledge(uuid,boolean),public.set_knowledge_progress(uuid,text),public.archive_knowledge(uuid,boolean,boolean),public.save_knowledge_book(jsonb,uuid),public.log_book_reading(uuid,date,integer,uuid),public.knowledge_daily_items(),public.knowledge_state(),public.knowledge_list(text,text,text,text,boolean,integer)to authenticated;
commit;
