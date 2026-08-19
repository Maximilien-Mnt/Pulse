-- ─── delete_my_account RPC (hard delete) ─────────────────────────────────────
-- Password-gated HARD delete of the caller's account.
--
-- Replaces the previous soft-delete (UPDATE profiles SET deleted_at) which
-- left the row in auth.users, so the account still appeared in Supabase Auth
-- and could be logged into again.
--
-- Deleting from auth.users cascades (ON DELETE CASCADE) to public.profiles
-- and all related user data (posts, follows, memberships, conversations,
-- notifications, etc.), permanently removing the account.
--
-- This satisfies the Privacy Policy (section 7): "Lorsque vous supprimez
-- votre compte, vos données personnelles sont supprimées ou anonymisées dans
-- un délai de 30 jours" — deletion is immediate.
--
-- Runs as SECURITY DEFINER so RLS does not apply. The password is verified
-- against auth.users.encrypted_password using pgcrypto's crypt(). Wrong
-- password raises a friendly error.
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

  -- Hard delete: removes the auth user and cascades to all user data.
  delete from auth.users
  where id = v_uid;
end;
$$;

 revoke all on function public.delete_my_account(text) from public;
 revoke execute on function public.delete_my_account(text) from anon;
 grant execute on function public.delete_my_account(text) to authenticated;