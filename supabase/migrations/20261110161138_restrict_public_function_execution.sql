-- Posting journal entries is an authenticated-user operation only.
REVOKE EXECUTE ON FUNCTION public.post_journal_entry(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_journal_entry(uuid) TO authenticated;

-- Trigger-only helper must not be callable as a public RPC endpoint.
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
