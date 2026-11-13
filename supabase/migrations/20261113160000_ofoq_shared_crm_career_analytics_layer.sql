-- OFOQ shared CRM, career, usage analytics and revenue ledger.
create table public.ofoq_crm_contacts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 full_name text not null check(char_length(btrim(full_name)) between 1 and 160),
 email text check(email is null or char_length(email)<=254), phone text check(phone is null or char_length(phone)<=40),
 company text check(company is null or char_length(company)<=160),
 status text not null default 'lead' check(status in ('lead','qualified','customer','inactive')),
 source text check(source is null or char_length(source)<=80), notes text not null default '' check(char_length(notes)<=4000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id)
);
create index ofoq_crm_contacts_owner_updated_idx on public.ofoq_crm_contacts(user_id,updated_at desc);
alter table public.ofoq_crm_contacts enable row level security;
create policy "CRM contacts owner select" on public.ofoq_crm_contacts for select to authenticated using((select auth.uid())=user_id);
create policy "CRM contacts owner insert" on public.ofoq_crm_contacts for insert to authenticated with check((select auth.uid())=user_id);
create policy "CRM contacts owner update" on public.ofoq_crm_contacts for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "CRM contacts owner delete" on public.ofoq_crm_contacts for delete to authenticated using((select auth.uid())=user_id);
grant select,insert,update,delete on public.ofoq_crm_contacts to authenticated;
create table public.ofoq_crm_activities (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 contact_id uuid, activity_type text not null check(activity_type in ('note','call','email','meeting','quote','order','follow_up')),
 subject text not null check(char_length(btrim(subject)) between 1 and 180), details text not null default '' check(char_length(details)<=4000),
 occurred_at timestamptz not null default now(), created_at timestamptz not null default now(),
 foreign key(user_id,contact_id) references public.ofoq_crm_contacts(user_id,id) on delete cascade
);
create index ofoq_crm_activities_owner_time_idx on public.ofoq_crm_activities(user_id,occurred_at desc);
alter table public.ofoq_crm_activities enable row level security;
create policy "CRM activities owner select" on public.ofoq_crm_activities for select to authenticated using((select auth.uid())=user_id);
create policy "CRM activities owner insert" on public.ofoq_crm_activities for insert to authenticated with check((select auth.uid())=user_id);
create policy "CRM activities owner update" on public.ofoq_crm_activities for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "CRM activities owner delete" on public.ofoq_crm_activities for delete to authenticated using((select auth.uid())=user_id);
grant select,insert,update,delete on public.ofoq_crm_activities to authenticated;
create table public.ofoq_career_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade, headline text not null default '' check(char_length(headline)<=180),
 bio text not null default '' check(char_length(bio)<=3000), skills text[] not null default '{}',
 portfolio_url text check(portfolio_url is null or char_length(portfolio_url)<=500),
 availability text not null default 'open' check(availability in ('open','busy','unavailable')), updated_at timestamptz not null default now()
);
alter table public.ofoq_career_profiles enable row level security;
create policy "Career profile owner select" on public.ofoq_career_profiles for select to authenticated using((select auth.uid())=user_id);
create policy "Career profile owner insert" on public.ofoq_career_profiles for insert to authenticated with check((select auth.uid())=user_id);
create policy "Career profile owner update" on public.ofoq_career_profiles for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
grant select,insert,update on public.ofoq_career_profiles to authenticated;
create table public.ofoq_career_applications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 organization text not null check(char_length(btrim(organization)) between 1 and 180),
 role_title text not null check(char_length(btrim(role_title)) between 1 and 180), job_url text check(job_url is null or char_length(job_url)<=1000),
 status text not null default 'saved' check(status in ('saved','applied','interview','offer','rejected','withdrawn')),
 notes text not null default '' check(char_length(notes)<=4000), applied_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index ofoq_career_applications_owner_updated_idx on public.ofoq_career_applications(user_id,updated_at desc);
alter table public.ofoq_career_applications enable row level security;
create policy "Career applications owner select" on public.ofoq_career_applications for select to authenticated using((select auth.uid())=user_id);
create policy "Career applications owner insert" on public.ofoq_career_applications for insert to authenticated with check((select auth.uid())=user_id);
create policy "Career applications owner update" on public.ofoq_career_applications for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "Career applications owner delete" on public.ofoq_career_applications for delete to authenticated using((select auth.uid())=user_id);
grant select,insert,update,delete on public.ofoq_career_applications to authenticated;
create table public.ofoq_usage_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 event_name text not null check(event_name in ('section_open','tool_run','lead_created','order_created','career_application_created')),
 section_id text not null check(section_id ~ '^[a-z0-9_-]{1,80}$'), session_id uuid not null, created_at timestamptz not null default now()
);
create index ofoq_usage_events_owner_time_idx on public.ofoq_usage_events(user_id,created_at desc);
create index ofoq_usage_events_section_time_idx on public.ofoq_usage_events(section_id,created_at desc);
alter table public.ofoq_usage_events enable row level security;
create policy "Usage events owner read" on public.ofoq_usage_events for select to authenticated using((select auth.uid())=user_id);
create policy "Usage events owner insert" on public.ofoq_usage_events for insert to authenticated with check((select auth.uid())=user_id);
grant select,insert on public.ofoq_usage_events to authenticated;
create table public.ofoq_revenue_events (
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
 provider text not null check(provider in ('stripe','manual','other')), provider_event_id text not null unique,
 event_type text not null check(event_type in ('payment_succeeded','refund_succeeded','subscription_started','subscription_renewed','subscription_canceled')),
 amount_minor bigint not null check(amount_minor>=0), currency text not null check(currency ~ '^[A-Z]{3}$'),
 occurred_at timestamptz not null, created_at timestamptz not null default now()
);
create index ofoq_revenue_events_time_idx on public.ofoq_revenue_events(occurred_at desc);
alter table public.ofoq_revenue_events enable row level security;
revoke all on public.ofoq_revenue_events from anon,authenticated;
grant select,insert on public.ofoq_revenue_events to service_role;
