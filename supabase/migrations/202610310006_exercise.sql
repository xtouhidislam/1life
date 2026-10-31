begin;
create table public.exercise_movements(
 id text primary key,pattern text not null check(pattern in('push','pull','legs','core')),level integer not null check(level between 1 and 6),
 title text not null,graduate text not null,minimum integer not null,unit text not null check(unit in('reps','seconds')),sets integer not null,
 visual text not null,bar boolean not null default false,unique(pattern,level)
);
-- BEGIN GENERATED EXERCISE
insert into public.exercise_movements(id,pattern,level,title,graduate,minimum,unit,sets,visual,bar)
select id,pattern,level,title,graduate,minimum,unit,sets,visual,bar from jsonb_to_recordset($moves$[{"id":"push-1","pattern":"push","level":1,"title":"Wall Push-up","graduate":"3×15 feels easy","minimum":15,"unit":"reps","sets":3,"visual":"wall","bar":false},{"id":"push-2","pattern":"push","level":2,"title":"Incline Push-up","graduate":"3×12 clean reps","minimum":12,"unit":"reps","sets":3,"visual":"incline","bar":false},{"id":"push-3","pattern":"push","level":3,"title":"Knee Push-up","graduate":"3×12 clean reps","minimum":12,"unit":"reps","sets":3,"visual":"push","bar":false},{"id":"push-4","pattern":"push","level":4,"title":"Full Push-up","graduate":"3×10 clean reps","minimum":10,"unit":"reps","sets":3,"visual":"push","bar":false},{"id":"push-5","pattern":"push","level":5,"title":"Diamond Push-up + Pike Push-up","graduate":"3×8–10 each","minimum":8,"unit":"reps","sets":3,"visual":"push","bar":false},{"id":"push-6","pattern":"push","level":6,"title":"Decline Push-up","graduate":"Stretch goal for Month 5–6","minimum":0,"unit":"reps","sets":3,"visual":"incline","bar":false},{"id":"pull-1","pattern":"pull","level":1,"title":"Table/Doorframe Rows · steep angle","graduate":"3×12 clean reps","minimum":12,"unit":"reps","sets":3,"visual":"row","bar":false},{"id":"pull-2","pattern":"pull","level":2,"title":"Table/Doorframe Rows · flatter angle","graduate":"3×12 clean reps","minimum":12,"unit":"reps","sets":3,"visual":"row","bar":false},{"id":"pull-3","pattern":"pull","level":3,"title":"Superman Holds + Reverse Snow Angels","graduate":"3×15 snow angels; holds 20–30 sec","minimum":15,"unit":"reps","sets":3,"visual":"back","bar":false},{"id":"pull-4","pattern":"pull","level":4,"title":"Dead Hang → Negative Pull-ups","graduate":"3×5 clean negatives; slow 5-sec lowering","minimum":5,"unit":"reps","sets":3,"visual":"hang","bar":true},{"id":"pull-5","pattern":"pull","level":5,"title":"Assisted/Jumping Pull-ups → Full Pull-up","graduate":"1 full clean rep","minimum":1,"unit":"reps","sets":1,"visual":"hang","bar":true},{"id":"legs-1","pattern":"legs","level":1,"title":"Bodyweight Squat","graduate":"3×20 clean reps","minimum":20,"unit":"reps","sets":3,"visual":"squat","bar":false},{"id":"legs-2","pattern":"legs","level":2,"title":"Split Squat","graduate":"3×12 per leg","minimum":12,"unit":"reps","sets":3,"visual":"lunge","bar":false},{"id":"legs-3","pattern":"legs","level":3,"title":"Bulgarian Split Squat","graduate":"3×10 per leg","minimum":10,"unit":"reps","sets":3,"visual":"lunge","bar":false},{"id":"legs-4","pattern":"legs","level":4,"title":"Assisted Pistol Squat","graduate":"3×8 per leg","minimum":8,"unit":"reps","sets":3,"visual":"pistol","bar":false},{"id":"legs-5","pattern":"legs","level":5,"title":"Full Pistol Squat","graduate":"Stretch goal for Month 5–6","minimum":0,"unit":"reps","sets":3,"visual":"pistol","bar":false},{"id":"core-1","pattern":"core","level":1,"title":"Knee Plank","graduate":"3×30 sec","minimum":30,"unit":"seconds","sets":3,"visual":"plank","bar":false},{"id":"core-2","pattern":"core","level":2,"title":"Full Plank + Side Plank","graduate":"3×45 sec each","minimum":45,"unit":"seconds","sets":3,"visual":"plank","bar":false},{"id":"core-3","pattern":"core","level":3,"title":"Hollow Body Hold","graduate":"3×30 sec","minimum":30,"unit":"seconds","sets":3,"visual":"hollow","bar":false},{"id":"core-4","pattern":"core","level":4,"title":"Leg Raises","graduate":"3×15 clean reps","minimum":15,"unit":"reps","sets":3,"visual":"raise","bar":false},{"id":"core-5","pattern":"core","level":5,"title":"L-sit progression","graduate":"Stretch goal for Month 5–6","minimum":0,"unit":"seconds","sets":3,"visual":"sit","bar":false}]$moves$::jsonb)as m(id text,pattern text,level integer,title text,graduate text,minimum integer,unit text,sets integer,visual text,bar boolean);
-- END GENERATED EXERCISE
create table public.exercise_settings(
 user_id uuid primary key references auth.users(id)on delete cascade,
 start_date date not null default '2026-11-01',bar_available boolean not null default false
);
create table public.workout_sessions(
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid()references auth.users(id)on delete cascade,
 session_date date not null check(session_date<=(now()at time zone 'Asia/Dhaka')::date),
 status text not null check(status in('completed','rest')),minutes integer not null check(minutes between 0 and 1440),
 notes text not null default '' check(length(notes)<=2000),created_at timestamptz not null default now(),
 unique(user_id,session_date),unique(id,user_id),check((status='rest'and minutes=0)or(status='completed'and minutes>0)),
 check(status='rest'or extract(dow from session_date)<>0)
);
create table public.workout_sets(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id)on delete cascade,
 session_id uuid not null,movement_id text not null references public.exercise_movements(id),
 set_number integer not null check(set_number between 1 and 100),quantity integer not null check(quantity between 1 and 3600),
 unit text not null check(unit in('reps','seconds')),
 foreign key(session_id,user_id)references public.workout_sessions(id,user_id)on delete cascade,
 unique(session_id,movement_id,set_number)
);
create table public.exercise_progress(
 user_id uuid not null references auth.users(id)on delete cascade,pattern text not null,level integer not null,
 primary key(user_id,pattern),foreign key(pattern,level)references public.exercise_movements(pattern,level)
);
create table public.exercise_level_history(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id)on delete cascade,
 pattern text not null,from_level integer not null,to_level integer not null,
 notes text not null check(length(trim(notes))between 1 and 2000),created_at timestamptz not null default now(),
 foreign key(pattern,to_level)references public.exercise_movements(pattern,level)
);
create index workout_owner_date on public.workout_sessions(user_id,session_date);
create index workout_sets_owner_session on public.workout_sets(user_id,session_id);

do $$declare table_name text;begin
 alter table public.exercise_movements enable row level security;
 revoke all on public.exercise_movements from public,anon,authenticated;
 grant select on public.exercise_movements to authenticated;
 create policy "Read movements"on public.exercise_movements for select to authenticated using(true);
 foreach table_name in array array['exercise_settings','workout_sessions','workout_sets','exercise_progress','exercise_level_history']loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('revoke all on public.%I from public,anon,authenticated',table_name);
  execute format('grant select on public.%I to authenticated',table_name);
  execute format('create policy "Read own exercise records"on public.%I for select to authenticated using((select auth.uid())=user_id)',table_name);
 end loop;
end$$;

create function public.save_exercise_settings(p_start date,p_bar boolean)returns void
language plpgsql security definer set search_path=''as $$
declare owner_id uuid:=auth.uid();begin
 if owner_id is null then raise exception 'Sign in first';end if;
 if p_start is null or p_start<'2000-01-01'or p_start>'2100-01-01'or p_bar is null then raise exception 'Choose valid plan settings';end if;
 insert into public.exercise_settings(user_id)values(owner_id)on conflict do nothing;
 perform 1 from public.exercise_settings where user_id=owner_id for update;
 if not p_bar and exists(select 1 from public.exercise_progress where user_id=owner_id and pattern='pull'and level>=4)then
  raise exception 'Move your pull level below 4 before disabling the optional bar';end if;
 insert into public.exercise_settings(user_id,start_date,bar_available)values(owner_id,p_start,p_bar)
 on conflict(user_id)do update set start_date=excluded.start_date,bar_available=excluded.bar_available;
end$$;

create function public.save_workout(p_date date,p_status text,p_minutes integer,p_notes text,p_sets jsonb)returns uuid
language plpgsql security definer set search_path=''as $$
declare owner_id uuid:=auth.uid();session_key uuid;begin
 if owner_id is null then raise exception 'Sign in first';end if;
 insert into public.exercise_settings(user_id)values(owner_id)on conflict do nothing;
 perform 1 from public.exercise_settings where user_id=owner_id for update;
 if p_sets is null or jsonb_typeof(p_sets)<>'array' or jsonb_array_length(p_sets)>100 then raise exception 'Provide an array of at most 100 sets';end if;
 if p_status='rest'and jsonb_array_length(p_sets)>0 then raise exception 'Rest days cannot contain exercise sets';end if;
 if p_status='completed'and extract(dow from p_date)<>3 and jsonb_array_length(p_sets)=0 then raise exception 'Log at least one set for a training session';end if;
 if exists(select 1 from jsonb_array_elements(p_sets)s where jsonb_typeof(s)<>'object'
  or not(s?'movement_id'and s?'set_number'and s?'quantity'and s?'unit'))then raise exception 'Each set needs a movement, set number, quantity, and unit';end if;
 insert into public.workout_sessions(user_id,session_date,status,minutes,notes)values(owner_id,p_date,p_status,p_minutes,trim(p_notes))
 on conflict(user_id,session_date)do update set status=excluded.status,minutes=excluded.minutes,notes=excluded.notes
 returning id into session_key;
 delete from public.workout_sets where user_id=owner_id and session_id=session_key;
 insert into public.workout_sets(user_id,session_id,movement_id,set_number,quantity,unit)
 select owner_id,session_key,s.movement_id,s.set_number,s.quantity,s.unit
 from jsonb_to_recordset(p_sets)as s(movement_id text,set_number integer,quantity integer,unit text);
 return session_key;
end$$;

create function public.delete_workout(p_id uuid)returns void language plpgsql security definer set search_path=''as $$
begin
 if auth.uid()is null then raise exception 'Sign in first';end if;
 delete from public.workout_sessions where id=p_id and user_id=auth.uid();
 if not found then raise exception 'Workout not found';end if;
end$$;

create function public.set_exercise_level(p_pattern text,p_level integer,p_notes text,p_confirm boolean)returns void
language plpgsql security definer set search_path=''as $$
declare owner_id uuid:=auth.uid();current_level integer;current_move public.exercise_movements%rowtype;
 target_move public.exercise_movements%rowtype;qualifying integer;begin
 if owner_id is null then raise exception 'Sign in first';end if;
 insert into public.exercise_settings(user_id)values(owner_id)on conflict do nothing;
 perform 1 from public.exercise_settings where user_id=owner_id for update;
 select coalesce((select level from public.exercise_progress where user_id=owner_id and pattern=p_pattern),1)into current_level;
 select * into target_move from public.exercise_movements where pattern=p_pattern and level=p_level;
 if not found then raise exception 'Unknown movement level';end if;
 if p_level=current_level then raise exception 'This is already your current level';end if;
 if p_notes is null or length(trim(p_notes))=0 then raise exception 'Add a note documenting this level change';end if;
 if target_move.bar and not(select bar_available from public.exercise_settings where user_id=owner_id)then raise exception 'This pull level requires the optional bar setting';end if;
 if p_level>current_level then
  if p_level<>current_level+1 then raise exception 'Advance one level at a time';end if;
  if p_confirm is distinct from true then raise exception 'Confirm the source graduation criteria were met with clean form in both sessions';end if;
  select * into current_move from public.exercise_movements where pattern=p_pattern and level=current_level;
  select count(*)filter(where s.qualifies)into qualifying from(
   select count(*)filter(where ws.quantity>=current_move.minimum and ws.unit=current_move.unit)>=current_move.sets as qualifies
   from public.workout_sets ws join public.workout_sessions session on session.id=ws.session_id
   where ws.user_id=owner_id and ws.movement_id=current_move.id and session.status='completed'
   group by session.session_date order by session.session_date desc limit 2
  )s;
  if qualifying<2 then raise exception 'Log two latest sessions at this level meeting the recorded set and quantity threshold before advancing';end if;
 end if;
 insert into public.exercise_progress(user_id,pattern,level)values(owner_id,p_pattern,p_level)
 on conflict(user_id,pattern)do update set level=excluded.level;
 insert into public.exercise_level_history(user_id,pattern,from_level,to_level,notes)values(owner_id,p_pattern,current_level,p_level,trim(p_notes));
end$$;

create function public.exercise_state(p_date date)returns jsonb language plpgsql security invoker set search_path=''as $$
declare owner_id uuid:=auth.uid();begin
 if owner_id is null then raise exception 'Sign in first';end if;
 if p_date is null then raise exception 'Choose a date';end if;
 return jsonb_build_object(
  'start_date',coalesce((select start_date from public.exercise_settings where user_id=owner_id),'2026-11-01'::date),
  'bar_available',coalesce((select bar_available from public.exercise_settings where user_id=owner_id),false),
  'movements',(select jsonb_agg(row_to_json(m)order by m.pattern,m.level)from public.exercise_movements m),
  'levels',(select jsonb_object_agg(pattern,level)from(select distinct m.pattern,coalesce(p.level,1)as level from public.exercise_movements m left join public.exercise_progress p on p.pattern=m.pattern and p.user_id=owner_id)r),
  'session',(select row_to_json(s)from public.workout_sessions s where user_id=owner_id and session_date=p_date),
  'sets',(select coalesce(jsonb_agg(row_to_json(ws)order by ws.movement_id,ws.set_number),'[]'::jsonb)from public.workout_sets ws join public.workout_sessions s on s.id=ws.session_id where ws.user_id=owner_id and s.session_date=p_date),
  'history',(select coalesce(jsonb_agg(row_to_json(r)order by r.session_date desc),'[]'::jsonb)from(select s.*, (select count(*)from public.workout_sets ws where ws.session_id=s.id and ws.user_id=owner_id)as set_count from public.workout_sessions s where user_id=owner_id and session_date between p_date-29 and p_date order by session_date desc)r),
  'level_history',(select coalesce(jsonb_agg(row_to_json(r)order by r.created_at desc),'[]'::jsonb)from(select * from public.exercise_level_history where user_id=owner_id order by created_at desc limit 30)r)
 );
end$$;

revoke all on function public.save_exercise_settings(date,boolean),public.save_workout(date,text,integer,text,jsonb),public.delete_workout(uuid),public.set_exercise_level(text,integer,text,boolean),public.exercise_state(date)from public,anon;
grant execute on function public.save_exercise_settings(date,boolean),public.save_workout(date,text,integer,text,jsonb),public.delete_workout(uuid),public.set_exercise_level(text,integer,text,boolean),public.exercise_state(date)to authenticated;
commit;
