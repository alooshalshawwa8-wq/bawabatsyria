
drop trigger if exists inventory_movement_apply_stock on public.inventory_movements;
drop function if exists public.apply_inventory_movement_to_stock();
drop trigger if exists journal_entry_require_balance on public.journal_entries;
drop function if exists public.validate_posted_journal_entry();
