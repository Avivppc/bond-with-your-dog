-- profiles.dog_name / dog_breed mirror the member's active dog, so everything that already reads
-- them (community authors, members list, leaderboard, admin) shows the dog chosen in the app.

create or replace function private.profile_dog_mirror()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.active_dog_id is null then
    return new;
  end if;
  select d.name, d.breed into new.dog_name, new.dog_breed from public.dogs d where d.id = new.active_dog_id;
  return new;
end;
$$;
drop trigger if exists profile_dog_mirror on public.profiles;
create trigger profile_dog_mirror before insert or update of active_dog_id on public.profiles
  for each row execute function private.profile_dog_mirror();

-- Renaming (or removing) the active dog updates the mirror too.
create or replace function private.dog_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    update public.profiles set dog_name = null, dog_breed = null
     where id = old.owner_id and active_dog_id is null and dog_name is not null
       and not exists (select 1 from public.dogs where owner_id = old.owner_id);
    return old;
  end if;
  update public.profiles set dog_name = new.name, dog_breed = new.breed
   where id = new.owner_id and active_dog_id = new.id;
  return new;
end;
$$;
drop trigger if exists dog_changed on public.dogs;
create trigger dog_changed after update of name, breed or delete on public.dogs
  for each row execute function private.dog_changed();
