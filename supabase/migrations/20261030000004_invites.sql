-- Invitation issue/preview and employee approval.

create function public.create_invitation(p_org uuid, p_email text, p_role app_role)
returns text language plpgsql security definer set search_path = public as $$
declare v_token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if not (has_role('client_admin', p_org) or has_role('portal_admin')) then raise exception 'not permitted'; end if;
  if p_role not in ('client_member', 'client_admin') then raise exception 'only client roles can be invited'; end if;
  if not exists (select 1 from organizations where id = p_org and kind = 'client') then raise exception 'invitations are for client organisations'; end if;
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email'; end if;
  insert into invitations (org_id, email, role, token_hash, expires_at, invited_by)
  values (p_org, lower(p_email), p_role, encode(extensions.digest(v_token, 'sha256'), 'hex'), now() + interval '7 days', auth.uid());
  perform audit('invite', 'invitation', lower(p_email), p_org, jsonb_build_object('role', p_role));
  return v_token;
end $$;

-- Safe preview for the invite landing page: org name, role, masked email, status.
create function public.invitation_preview(p_token text)
returns table (org_name text, role app_role, email_hint text, status text)
language sql stable security definer set search_path = public as $$
  select o.name, i.role,
    left(i.email, 2) || '•••@' || split_part(i.email, '@', 2),
    case when i.revoked_at is not null then 'revoked'
         when i.accepted_at is not null then 'already used'
         when i.expires_at < now() then 'expired'
         else 'valid' end
  from invitations i join organizations o on o.id = i.org_id
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

create function public.approve_employee(p_membership uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m memberships;
begin
  if not has_role('portal_admin') then raise exception 'portal admin required'; end if;
  select * into m from memberships where id = p_membership;
  if m.id is null or m.status <> 'pending' then raise exception 'not pending'; end if;
  if not exists (select 1 from profiles where id = m.user_id and email like '%@azentio.com') then raise exception 'not a verified azentio identity'; end if;
  update memberships set status = 'active' where id = p_membership;
  insert into role_grants (membership_id, role, granted_by) values (p_membership, 'employee', auth.uid()) on conflict do nothing;
end $$;

-- Lets client admins see member emails/names of their own org (profiles RLS already allows it).
revoke execute on function public.create_invitation(uuid, text, app_role) from anon;
revoke execute on function public.approve_employee(uuid) from anon;
