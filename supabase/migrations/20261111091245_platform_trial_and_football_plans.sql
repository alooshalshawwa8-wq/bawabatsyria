-- Trial launch controls, football subscription feature matrix, and API budget policy.
-- All paid tiers remain non-chargeable and unenforced during the trial.

create table if not exists public.platform_launch_config (
  singleton boolean primary key default true check (singleton),
  launch_mode text not null default 'trial' check (launch_mode in ('trial','paid')),
  billing_enabled boolean not null default false,
  paid_features_enforced boolean not null default false,
  trial_free_all_features boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint paid_mode_requires_billing check (launch_mode <> 'paid' or billing_enabled)
);
insert into public.platform_launch_config(singleton,launch_mode,billing_enabled,paid_features_enforced,trial_free_all_features)
values (true,'trial',false,false,true)
on conflict (singleton) do update set launch_mode='trial',billing_enabled=false,paid_features_enforced=false,trial_free_all_features=true,updated_at=now();

create table if not exists public.platform_plan_catalog (
  plan_code text primary key,
  name_ar text not null,
  description_ar text not null default '',
  display_order integer not null default 0,
  billing_interval text not null default 'monthly' check (billing_interval in ('none','monthly','yearly')),
  price_minor bigint,
  currency text,
  visible boolean not null default true,
  future_only boolean not null default false,
  created_at timestamptz not null default now(),
  check ((price_minor is null and currency is null) or (price_minor >= 0 and currency is not null))
);
create table if not exists public.platform_feature_catalog (
  feature_code text primary key,
  name_ar text not null,
  description_ar text not null default '',
  category text not null default 'football',
  availability text not null default 'live' check (availability in ('live','planned')),
  created_at timestamptz not null default now()
);
create table if not exists public.platform_plan_features (
  plan_code text not null references public.platform_plan_catalog(plan_code) on delete cascade,
  feature_code text not null references public.platform_feature_catalog(feature_code) on delete cascade,
  access_level text not null check (access_level in ('included','limited','locked')),
  usage_limit integer,
  primary key (plan_code,feature_code),
  check (usage_limit is null or usage_limit >= 0)
);
create table if not exists public.football_api_budget_policy (
  singleton boolean primary key default true check (singleton),
  daily_limit_override integer,
  reserve_percent numeric(5,2) not null default 15 check (reserve_percent between 0 and 50),
  core_budget_percent numeric(5,2) not null default 60 check (core_budget_percent between 0 and 100),
  live_budget_percent numeric(5,2) not null default 25 check (live_budget_percent between 0 and 100),
  emergency_budget_percent numeric(5,2) not null default 15 check (emergency_budget_percent between 0 and 100),
  warning_percent numeric(5,2) not null default 75 check (warning_percent between 0 and 100),
  critical_percent numeric(5,2) not null default 90 check (critical_percent between 0 and 100),
  live_cache_seconds integer not null default 30 check (live_cache_seconds >= 5),
  non_live_refresh_minutes integer not null default 10 check (non_live_refresh_minutes >= 1),
  finished_match_cache_hours integer not null default 24 check (finished_match_cache_hours >= 1),
  updated_at timestamptz not null default now(),
  check (core_budget_percent + live_budget_percent + emergency_budget_percent = 100)
);
insert into public.football_api_budget_policy(singleton) values (true) on conflict (singleton) do nothing;

insert into public.platform_plan_catalog(plan_code,name_ar,description_ar,display_order,billing_interval,visible,future_only)
values
 ('free','أُفُق المجانية','الأساسيات لمتابعة كرة القدم والبطولات.',1,'none',true,false),
 ('pro_monthly','أُفُق برو','إحصاءات موسعة وملفات اللاعبين واستوديو تحليل المباريات.',2,'monthly',true,false),
 ('vip_monthly','أُفُق VIP','تجربة النخبة مع التحليلات والمواجهات التاريخية والبيانات المتقدمة.',3,'monthly',true,false),
 ('business_monthly','أُفُق أعمال','باقة المؤسسات والفرق والاحتياجات المتقدمة عند إطلاق خدمات الأعمال.',4,'monthly',true,true)
on conflict (plan_code) do update set name_ar=excluded.name_ar,description_ar=excluded.description_ar,display_order=excluded.display_order,billing_interval=excluded.billing_interval,visible=excluded.visible,future_only=excluded.future_only;

insert into public.platform_feature_catalog(feature_code,name_ar,description_ar,category,availability)
values
 ('fixtures_scores','مواعيد المباريات والنتائج','جداول المباريات والنتائج وحالات اللقاءات.','متابعة المباريات','live'),
 ('league_tables','ترتيب الدوريات والبطولات','جداول الترتيب والنقاط وفوارق الأهداف.','البطولات','live'),
 ('basic_team_pages','صفحات الأندية والملاعب','معلومات الأندية وملاعبها وسعة المدرجات.','الأندية','live'),
 ('scorers_assists_cards','الهدافون وصناعة الأهداف والبطاقات','جداول الهدافين والتمريرات الحاسمة والبطاقات.','الإحصاءات','live'),
 ('player_profiles_ratings','ملفات اللاعبين والتقييمات','إحصاءات اللاعبين وتقييماتهم عند توفر التغطية.','اللاعبون','live'),
 ('match_lineups_events','التشكيلات والخطط والأحداث','التشكيلات والتبديلات والأهداف والإنذارات.','المباريات','live'),
 ('advanced_match_stats','إحصاءات وتحليل المباراة','مقارنات وإحصاءات تفصيلية للمباراة.','التحليل','live'),
 ('match_studio','استوديو تحليل المباراة','تقرير موحد للمباراة ومكوناته المتقدمة.','التحليل','live'),
 ('head_to_head_history','المواجهات والتاريخ الموسع','المواجهات المباشرة وسجل الأداء السابق.','التحليل','live'),
 ('injuries_predictions','الإصابات والتوقعات','الإصابات والتوقعات المتاحة من المزود.','التحليل','live'),
 ('advanced_alerts_watchlists','تنبيهات وقوائم متابعة ذكية','تنبيهات مخصصة وقوائم متابعة متقدمة.','VIP','planned'),
 ('deep_analytics_exports','تحليلات موسعة وتقارير قابلة للتصدير','مقارنات تاريخية وتقارير موسعة قابلة للتصدير.','VIP','planned')
on conflict (feature_code) do update set name_ar=excluded.name_ar,description_ar=excluded.description_ar,category=excluded.category,availability=excluded.availability;

insert into public.platform_plan_features(plan_code,feature_code,access_level)
select p.plan_code,f.feature_code,
 case
  when f.availability='planned' then 'locked'
  when p.plan_code='free' and f.feature_code in ('fixtures_scores','league_tables','basic_team_pages') then 'included'
  when p.plan_code='free' then 'locked'
  when p.plan_code='pro_monthly' and f.feature_code in ('fixtures_scores','league_tables','basic_team_pages','scorers_assists_cards','player_profiles_ratings','match_lineups_events','advanced_match_stats','match_studio') then 'included'
  when p.plan_code='pro_monthly' then 'locked'
  when p.plan_code in ('vip_monthly','business_monthly') then 'included'
  else 'locked'
 end
from public.platform_plan_catalog p cross join public.platform_feature_catalog f
on conflict (plan_code,feature_code) do update set access_level=excluded.access_level;
alter table public.platform_launch_config enable row level security;
alter table public.platform_plan_catalog enable row level security;
alter table public.platform_feature_catalog enable row level security;
alter table public.platform_plan_features enable row level security;
alter table public.football_api_budget_policy enable row level security;
revoke all on public.platform_launch_config,public.platform_plan_catalog,public.platform_feature_catalog,public.platform_plan_features,public.football_api_budget_policy from anon,authenticated;
grant all on public.platform_launch_config,public.platform_plan_catalog,public.platform_feature_catalog,public.platform_plan_features,public.football_api_budget_policy to service_role;

insert into public.membership_plans(id,name_ar,description_ar,billing_interval,active,display_order,stripe_price_id,price_minor,currency)
values
 ('free','أُفُق المجانية','المتابعة الأساسية للمباريات والنتائج والدوريات وصفحات الأندية.','none',true,1,null,null,null),
 ('pro_monthly','أُفُق برو','إحصاءات موسعة وملفات اللاعبين واستوديو تحليل المباريات.','month',true,2,null,null,null),
 ('vip_monthly','أُفُق VIP','تجربة النخبة مع التحليلات والمواجهات التاريخية والبيانات المتقدمة.','month',true,3,null,null,null),
 ('business_monthly','أُفُق أعمال','باقة المؤسسات والفرق والاحتياجات المتقدمة عند إطلاق خدمات الأعمال.','month',true,4,null,null,null)
on conflict (id) do update set
 name_ar=excluded.name_ar,description_ar=excluded.description_ar,billing_interval=excluded.billing_interval,
 active=excluded.active,display_order=excluded.display_order;
