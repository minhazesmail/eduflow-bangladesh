-- Queue guardian notification events automatically.
create or replace function private.queue_attendance_notification()
returns trigger language plpgsql security definer set search_path = public
as $$
declare g record;
begin
  if new.present = false then
    for g in select gu.id, gu.full_name, gu.phone from public.guardians gu join public.student_guardians sg on sg.guardian_id=gu.id where sg.student_id=new.student_id and gu.portal_enabled=true loop
      if g.phone is not null then
        insert into public.notifications(organization_id,guardian_id,student_id,channel,type,title,body,status)
        values(new.organization_id,g.id,new.student_id,'sms','attendance_absent','Attendance alert',g.full_name || ': your student was absent on ' || new.attendance_date::text,'queued');
      end if;
    end loop;
  end if;
  return new;
end;
$$;
drop trigger if exists queue_attendance_notification on public.attendance;
create trigger queue_attendance_notification after insert or update of present on public.attendance for each row execute function private.queue_attendance_notification();
revoke all on function private.queue_attendance_notification() from public,anon,authenticated;

create or replace function private.queue_payment_notification()
returns trigger language plpgsql security definer set search_path = public
as $$
declare g record; student_name text;
begin
  select name into student_name from public.students where id=new.student_id;
  for g in select gu.id, gu.full_name, gu.phone from public.guardians gu join public.student_guardians sg on sg.guardian_id=gu.id where sg.student_id=new.student_id and gu.portal_enabled=true loop
    if g.phone is not null then
      insert into public.notifications(organization_id,guardian_id,student_id,channel,type,title,body,status)
      values(new.organization_id,g.id,new.student_id,'sms','payment_received','Payment received','Payment of ৳' || new.amount::text || ' received for ' || coalesce(student_name,'student') || '. Receipt: ' || coalesce(new.receipt_no,'-'),'queued');
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists queue_payment_notification on public.payments;
create trigger queue_payment_notification after insert on public.payments for each row execute function private.queue_payment_notification();
revoke all on function private.queue_payment_notification() from public,anon,authenticated;

create or replace function private.queue_fee_due_notifications()
returns integer language plpgsql security definer set search_path = public
as $$
declare n integer := 0; r record;
begin
  for r in select s.id student_id,s.organization_id,g.id guardian_id,g.phone,s.name,coalesce(s.monthly_fee,0) amount
    from public.students s join public.student_guardians sg on sg.student_id=s.id join public.guardians g on g.id=sg.guardian_id
    where s.status='active' and g.portal_enabled=true and g.phone is not null and s.monthly_fee>0 loop
    insert into public.notifications(organization_id,guardian_id,student_id,channel,type,title,body,status)
      values(r.organization_id,r.guardian_id,r.student_id,'sms','fee_due','Fee due reminder',r.name || ' has a monthly fee of ৳' || r.amount::text || '. Please contact the center for payment details.','queued');
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function private.queue_fee_due_notifications() from public,anon,authenticated;
