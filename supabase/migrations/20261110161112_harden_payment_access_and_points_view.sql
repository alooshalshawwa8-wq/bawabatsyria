-- Restrict payment order mutations to trusted server-side code.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.payment_orders FROM authenticated;
GRANT SELECT ON TABLE public.payment_orders TO authenticated;

-- RLS does not protect TRUNCATE or trigger/constraint privileges.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.payment_methods FROM authenticated;

-- Ensure the points summary view evaluates underlying RLS as the caller,
-- so authenticated users can only aggregate their own ledger rows.
ALTER VIEW public.points_balances SET (security_invoker = true);
