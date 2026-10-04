-- The built-in Accessibility Statement page (Israeli accessibility regulations ask every service site for one).
-- site_pages.system_key lists the built-in pages, so it must know the new one.
alter table public.site_pages drop constraint if exists site_pages_system_key_check;
alter table public.site_pages add constraint site_pages_system_key_check
  check (system_key in ('home', 'about', 'courses', 'stories', 'privacy', 'terms', 'refund', 'accessibility'));
