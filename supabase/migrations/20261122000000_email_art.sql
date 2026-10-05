-- Settings → Email: which picture tops each kind of email ("photo" = Roni's photo of the day,
-- "sketch" = a line drawing, "none"). Flows and campaigns can still choose per email.
alter table public.email_settings
  add column if not exists email_art jsonb not null
    default '{"member": "photo", "system": "sketch", "flows": "photo"}'::jsonb
    check (jsonb_typeof(email_art) = 'object');
