-- Trigger-only maintenance function is not a client-facing RPC.
REVOKE EXECUTE ON FUNCTION public.trim_user_workspace_backup_history() FROM PUBLIC, anon, authenticated;
