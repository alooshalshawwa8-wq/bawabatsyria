create index if not exists ofoq_crm_activities_owner_contact_idx on public.ofoq_crm_activities(user_id,contact_id);
create index if not exists ofoq_revenue_events_user_idx on public.ofoq_revenue_events(user_id);
