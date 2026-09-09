create table if not exists public.tickets (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 price numeric(12,2) not null default 0 check(price>=0),
 total_quantity integer not null default 0 check(total_quantity>=0),
 image_url text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.tickets enable row level security;
create policy "ticket_read" on public.tickets for select to anon,authenticated using(true);
create policy "ticket_insert" on public.tickets for insert to anon,authenticated with check(true);
create policy "ticket_update" on public.tickets for update to anon,authenticated using(true) with check(total_quantity>=0);
create policy "ticket_delete" on public.tickets for delete to anon,authenticated using(true);
alter table public.tickets replica identity full;
do $$ begin alter publication supabase_realtime add table public.tickets; exception when duplicate_object then null; end $$;
