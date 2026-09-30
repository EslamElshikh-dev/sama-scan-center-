-- Dedicated Sama Scan authentication objects. Contains no credentials.
create schema samascan_auth;
revoke all on schema samascan_auth from public, anon, authenticated;
grant usage on schema samascan_auth to service_role;
create table samascan_auth.admins (
  username text primary key check (username = 'admin'),
  password_hash text not null,
  updated_at timestamptz not null default now()
);
create table samascan_auth.sessions (
  token_hash bytea primary key,
  username text not null references samascan_auth.admins(username) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index samascan_sessions_expiry on samascan_auth.sessions(expires_at);
create table samascan_auth.attempts (
  bucket text primary key,
  started_at timestamptz not null,
  hits integer not null check (hits >= 0)
);
alter table samascan_auth.admins enable row level security;
alter table samascan_auth.sessions enable row level security;
alter table samascan_auth.attempts enable row level security;
revoke all on all tables in schema samascan_auth from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema samascan_auth to service_role;
create function public.samascan_admin_auth(
  action text,
  candidate_username text default null,
  candidate_password text default null,
  session_token text default null
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  stored_hash text;
  attempt_count integer;
  issued_token text;
  valid_until timestamptz;
  matched_username text;
begin
  if action in ('verify', 'logout') then
    if session_token is null or session_token !~ '^[a-f0-9]{64}$' then
      return jsonb_build_object('ok', false, 'code', 'credentials');
    end if;
    if action = 'logout' then
      delete from samascan_auth.sessions where token_hash = extensions.digest(session_token, 'sha256');
      return jsonb_build_object('ok', true);
    end if;
    select username, expires_at into matched_username, valid_until
      from samascan_auth.sessions
      where token_hash = extensions.digest(session_token, 'sha256') and expires_at > now();
    if not found then return jsonb_build_object('ok', false, 'code', 'credentials'); end if;
    return jsonb_build_object('ok', true, 'username', matched_username, 'expiresAt', extract(epoch from valid_until) * 1000);
  end if;
  if action <> 'login' or action is null then return jsonb_build_object('ok', false, 'code', 'invalid_request'); end if;
  -- Serialize login attempts across all instances for this administrator.
  select password_hash into stored_hash from samascan_auth.admins where username = 'admin' for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'setup'); end if;
  insert into samascan_auth.attempts(bucket, started_at, hits) values ('admin', now(), 1)
  on conflict (bucket) do update set
    hits = case when samascan_auth.attempts.started_at < now() - interval '15 minutes' then 1 else samascan_auth.attempts.hits + 1 end,
    started_at = case when samascan_auth.attempts.started_at < now() - interval '15 minutes' then now() else samascan_auth.attempts.started_at end
  returning hits into attempt_count;
  if attempt_count > 20 then return jsonb_build_object('ok', false, 'code', 'rate_limit'); end if;
  if candidate_password is null or octet_length(candidate_password) not between 1 and 72 then return jsonb_build_object('ok', false, 'code', 'credentials'); end if;
  if extensions.crypt(candidate_password, stored_hash) <> stored_hash or candidate_username is distinct from 'admin' then return jsonb_build_object('ok', false, 'code', 'credentials'); end if;
  update samascan_auth.attempts set hits = 0 where bucket = 'admin';
  delete from samascan_auth.sessions where expires_at <= now();
  issued_token := encode(extensions.gen_random_bytes(32), 'hex');
  valid_until := now() + interval '8 hours';
  insert into samascan_auth.sessions(token_hash, username, expires_at) values (extensions.digest(issued_token, 'sha256'), 'admin', valid_until);
  return jsonb_build_object('ok', true, 'username', 'admin', 'token', issued_token, 'expiresAt', extract(epoch from valid_until) * 1000);
end;
$$;
revoke all on function public.samascan_admin_auth(text, text, text, text) from public, anon, authenticated;
grant execute on function public.samascan_admin_auth(text, text, text, text) to service_role;
-- Seed/rotate credentials through an authenticated management connection only.
