begin;
update public.ai_quota_model_policies
set enabled = true, free_tier_verified = true
where provider_id = 'gemini' and model_id = 'gemini-3.5-flash-lite';

do $test$
declare
  v_ids uuid[] := array[]::uuid[];
  v_id uuid;
  v_result record;
  i integer;
begin
  for i in 1..5 loop
    v_id := gen_random_uuid();
    v_ids := array_append(v_ids, v_id);
    select * into v_result
    from public.reserve_ai_model_quota('gemini','gemini-3.5-flash-lite',v_id,'conversation');
    if not v_result.allowed or v_result.reason <> 'reserved' then
      raise exception 'expected reservation % to be allowed: %', i, row_to_json(v_result);
    end if;
  end loop;

  select * into v_result
  from public.reserve_ai_model_quota('gemini','gemini-3.5-flash-lite',gen_random_uuid(),'conversation');
  if v_result.allowed or v_result.reason <> 'minute_quota_exhausted' then
    raise exception 'expected sixth request to hit minute quota: %', row_to_json(v_result);
  end if;

  select * into v_result
  from public.reserve_ai_model_quota('gemini','gemini-3.5-flash-lite',v_ids[1],'conversation');
  if not v_result.allowed or not v_result.already_reserved then
    raise exception 'duplicate request should return the existing reservation';
  end if;

  if not public.mark_ai_model_provider_attempt(v_ids[1]) then
    raise exception 'provider attempt transition failed';
  end if;
  if public.release_ai_model_quota(v_ids[1]) then
    raise exception 'provider-attempted reservation must not be released';
  end if;
  if not public.settle_ai_model_quota(v_ids[1],'success',321,7,3,10,null,null,null,200) then
    raise exception 'settlement failed';
  end if;
  if public.settle_ai_model_quota(v_ids[1],'success',321,7,3,10,null,null,null,200) then
    raise exception 'duplicate settlement must not succeed';
  end if;
  if (select count(*) from public.ai_usage_events where request_id = v_ids[1]) <> 1 then
    raise exception 'expected exactly one durable usage event';
  end if;
  if (select total_tokens from public.ai_usage_events where request_id = v_ids[1]) <> 10 then
    raise exception 'reported token total was not persisted';
  end if;

  if not public.release_ai_model_quota(v_ids[2]) then
    raise exception 'pre-provider reservation should be releasable';
  end if;
  if public.release_ai_model_quota(v_ids[2]) then
    raise exception 'duplicate release must not succeed';
  end if;
end;
$test$;
rollback;
