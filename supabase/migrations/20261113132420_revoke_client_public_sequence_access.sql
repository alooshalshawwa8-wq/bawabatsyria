-- Client roles must not advance or inspect internal sequences directly.
REVOKE ALL ON SEQUENCE
  public.football_api_budget_reservations_id_seq,
  public.football_api_usage_id_seq,
  public.journal_entries_entry_number_seq
FROM anon, authenticated;
