-- Makes it impossible to insert the same imported row twice, even if two
-- sync calls happen to overlap. Postgres enforces this directly, so it's a
-- much stronger guarantee than only checking-before-inserting in app code.
create unique index transactions_import_dedupe
  on public.transactions (user_id, occurred_on, amount, kind, coalesce(description, ''))
  where source = 'import';
