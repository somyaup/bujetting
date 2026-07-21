-- The previous index only stopped two IMPORTED rows from colliding. It
-- didn't stop a manual entry (pushed to the sheet by quick-add) from being
-- read back in on the next sync and inserted a second time as an import.
-- Replace it with one guard that covers every source.
drop index if exists public.transactions_import_dedupe;

create unique index transactions_dedupe
  on public.transactions (user_id, occurred_on, amount, kind, coalesce(description, ''));
