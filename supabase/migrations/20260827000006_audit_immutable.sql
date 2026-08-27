-- M10 — audit trail immutability, GRANT-level (second line of defence).
--
-- 20260826000012_rls_policies.sql already gives audit_logs and
-- einvoice_submission_events INSERT + SELECT policies only (no UPDATE/DELETE
-- policy, so RLS blocks mutation). 20260826000014_grants.sql, however, still
-- hands every table — these two included — full UPDATE/DELETE to `authenticated`
-- and `service_role`, and its `alter default privileges` line does the same for
-- any future table. M0 §15/§811 requires "fără GRANT de UPDATE/DELETE pe
-- audit_logs/einvoice_submission_events" — enforcement dublu (RLS + GRANT).
--
-- Revoking the privilege means an attempt to alter history fails at the
-- permission layer even if an RLS policy is ever added by mistake.

revoke update, delete on audit_logs                 from authenticated, service_role;
revoke update, delete on einvoice_submission_events from authenticated, service_role;
