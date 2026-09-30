-- Run against the configured database. All test changes are rolled back.
begin;
set local role service_role;
do $$
declare
  test_password text := encode(extensions.gen_random_bytes(24), 'hex');
  result jsonb;
  issued_token text;
begin
  update samascan_auth.admins set password_hash=extensions.crypt(test_password,extensions.gen_salt('bf',12)) where username='admin';
  update samascan_auth.attempts set hits=0, started_at=now() where bucket='admin';
  result:=public.samascan_admin_auth('login','admin',test_password);
  if result->>'ok' <> 'true' then raise exception 'valid login failed'; end if;
  issued_token:=result->>'token';
  result:=public.samascan_admin_auth('verify',null,null,issued_token);
  if result->>'ok' <> 'true' or result->>'username' <> 'admin' then raise exception 'session identity failed'; end if;
  update samascan_auth.sessions set expires_at=now()-interval '1 second' where token_hash=extensions.digest(issued_token,'sha256');
  result:=public.samascan_admin_auth('verify',null,null,issued_token);
  if result->>'ok' <> 'false' then raise exception 'expired session accepted'; end if;
  result:=public.samascan_admin_auth('login','admin',test_password);
  issued_token:=result->>'token';
  perform public.samascan_admin_auth('logout',null,null,issued_token);
  result:=public.samascan_admin_auth('verify',null,null,issued_token);
  if result->>'ok' <> 'false' then raise exception 'revoked session accepted'; end if;
  result:=public.samascan_admin_auth('login','admin','incorrect');
  if result->>'code' <> 'credentials' then raise exception 'wrong password accepted'; end if;
  update samascan_auth.attempts set hits=20, started_at=now() where bucket='admin';
  result:=public.samascan_admin_auth('login','admin',test_password);
  if result->>'code' <> 'rate_limit' then raise exception 'distributed limit failed'; end if;
  update samascan_auth.attempts set started_at=now()-interval '16 minutes' where bucket='admin';
  result:=public.samascan_admin_auth('login','admin',test_password);
  if result->>'ok' <> 'true' then raise exception 'limit window reset failed'; end if;
end;
$$;
rollback;
