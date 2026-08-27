-- M10 — rate limiting (M0 §14/§793/§812).
--
-- The deploy target is serverless, where an in-process counter is useless (every
-- request may hit a cold instance). This is a fixed-window counter in Postgres:
-- one row per (bucket, identifier, window_start), incremented atomically. The
-- app never touches the table directly — only through check_rate_limit(), which
-- is SECURITY DEFINER, so the table needs no RLS policy and no role GRANT.

create table rate_limit_hits (
  bucket       text        not null,
  identifier   text        not null,
  window_start timestamptz not null,
  count        integer     not null default 0,
  primary key (bucket, identifier, window_start)
);

alter table rate_limit_hits enable row level security;
-- No policy on purpose: unreachable except via the SECURITY DEFINER function below.

-- Registers one hit and reports whether the caller is still under the limit for
-- the current window. `allowed` is false once `count` exceeds `p_limit`.
-- `retry_after` is seconds until the current window rolls over (0 when allowed).
create or replace function check_rate_limit(
  p_bucket text,
  p_identifier text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  -- Floor now() to the start of the current fixed window.
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into rate_limit_hits (bucket, identifier, window_start, count)
  values (p_bucket, p_identifier, v_window_start, 1)
  on conflict (bucket, identifier, window_start)
  do update set count = rate_limit_hits.count + 1
  returning count into v_count;

  -- Opportunistic cleanup so the table never grows unbounded.
  delete from rate_limit_hits
  where window_start < now() - interval '1 hour';

  return query select
    v_count <= p_limit,
    case
      when v_count <= p_limit then 0
      else greatest(
        ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - now())))::integer,
        1
      )
    end;
end;
$$;

-- `anon` is included: the proxy calls this for pre-login /auth traffic where the
-- caller has no authenticated JWT.
grant execute on function check_rate_limit(text, text, integer, integer) to anon, authenticated;
