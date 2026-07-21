alter table public.profiles
  add column gsheet_url text,
  add column gsheet_apps_script_url text,
  add column gsheet_last_synced_at timestamptz;
