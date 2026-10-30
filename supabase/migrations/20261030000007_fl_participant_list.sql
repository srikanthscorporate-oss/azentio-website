-- Employees may see which organisations are enrolled in the programme (name + status only),
-- without gaining general read access to client organisation records.
create function public.fl_participant_list()
returns table (org_name text, status text, decided_at timestamptz)
language sql stable security definer set search_path = public as $$
  select o.name, p.status, p.decided_at
  from fl_participants p join organizations o on o.id = p.org_id
  where is_employee()
  order by o.name;
$$;
