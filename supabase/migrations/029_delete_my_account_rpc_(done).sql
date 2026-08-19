-- ─── delete_my_account RPC ───────────────────────────────────────────────────
-- Password-gated soft-delete of the caller's profile.
--
-- Runs as SECURITY DEFINER so RLS does not apply (the client-side
-- `UPDATE profiles SET deleted_at` was failing with
-- "new row violates row-level security policy" because the re-auth
-- session churn left the request without a valid access token).
--
-- The password is verified against auth.users.encrypted_password using
-- pgcrypto's crypt(). Wrong password raises a friendly error.
create or replace function public.delete_my_account(p_password text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_encrypted text;
begin
  if v_uid is null then
    raise exception 'Non authentifié';
  end if;

  select encrypted_password into v_encrypted
  from auth.users
  where id = v_uid;

  if v_encrypted is null or v_encrypted = '' then
    raise exception 'Mot de passe incorrect';
  end if;

  if extensions.crypt(p_password, v_encrypted) <> v_encrypted then
    raise exception 'Mot de passe incorrect';
  end if;

  update public.profiles
  set deleted_at = now()
  where id = v_uid;
end;
$$;

 revoke all on function public.delete_my_account(text) from public;
 revoke execute on function public.delete_my_account(text) from anon;
 grant execute on function public.delete_my_account(text) to authenticated;
