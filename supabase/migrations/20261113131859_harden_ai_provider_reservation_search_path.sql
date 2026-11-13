-- Harden the SECURITY DEFINER quota helper against search_path object shadowing.
ALTER FUNCTION public.reserve_ai_provider_request(text, integer) SET search_path = '';
