-- Correct the tier-to-feature mapping using the live plan identifiers.
delete from public.platform_plan_features;

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
