
create type public.txn_kind as enum ('expense','income');
create type public.category_kind as enum ('expense','income');
create type public.shopping_list_kind as enum ('personal','grocery');
create type public.shopping_status as enum ('pending','purchased','skipped');
create type public.wishlist_status as enum ('to_buy','done');
create type public.txn_source as enum ('manual','import','seed');

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path=public as $$
begin new.updated_at = now(); return new; end $$;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  currency text not null default 'INR',
  theme text not null default 'dark',
  starting_balance numeric not null default 0,
  seeded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all
  using (auth.uid()=id) with check (auth.uid()=id);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  kind public.category_kind not null default 'expense',
  is_fixed boolean not null default false,
  color text,
  sort_order int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index categories_uniq on public.categories(user_id, lower(name), kind);
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "own categories" on public.categories for all
  using (auth.uid()=user_id) with check (auth.uid()=user_id);

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create unique index merchants_uniq on public.merchants(user_id, lower(name));
grant select, insert, update, delete on public.merchants to authenticated;
grant all on public.merchants to service_role;
alter table public.merchants enable row level security;
create policy "own merchants" on public.merchants for all
  using (auth.uid()=user_id) with check (auth.uid()=user_id);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create unique index pm_uniq on public.payment_methods(user_id, lower(name));
grant select, insert, update, delete on public.payment_methods to authenticated;
grant all on public.payment_methods to service_role;
alter table public.payment_methods enable row level security;
create policy "own pm" on public.payment_methods for all
  using (auth.uid()=user_id) with check (auth.uid()=user_id);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create unique index tags_uniq on public.tags(user_id, lower(name));
grant select, insert, update, delete on public.tags to authenticated;
grant all on public.tags to service_role;
alter table public.tags enable row level security;
create policy "own tags" on public.tags for all
  using (auth.uid()=user_id) with check (auth.uid()=user_id);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  occurred_on date not null,
  amount numeric not null check (amount >= 0),
  kind public.txn_kind not null default 'expense',
  category_id uuid references public.categories on delete set null,
  merchant_id uuid references public.merchants on delete set null,
  payment_method_id uuid references public.payment_methods on delete set null,
  description text,
  notes text,
  is_recurring boolean not null default false,
  source public.txn_source not null default 'manual',
  import_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.transactions to authenticated;
grant all on public.transactions to service_role;
alter table public.transactions enable row level security;
create policy "own transactions" on public.transactions for all
  using (auth.uid()=user_id) with check (auth.uid()=user_id);
create index tx_user_date on public.transactions(user_id, occurred_on desc);
create index tx_user_cat on public.transactions(user_id, category_id);
create trigger transactions_touch before update on public.transactions
  for each row execute function public.touch_updated_at();

create table public.transaction_tags (
  transaction_id uuid not null references public.transactions on delete cascade,
  tag_id uuid not null references public.tags on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  primary key (transaction_id, tag_id)
);
grant select, insert, update, delete on public.transaction_tags to authenticated;
grant all on public.transaction_tags to service_role;
alter table public.transaction_tags enable row level security;
create policy "own tt" on public.transaction_tags for all
  using (auth.uid()=user_id) with check (auth.uid()=user_id);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  month date not null,
  category_id uuid not null references public.categories on delete cascade,
  planned_amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, month, category_id)
);
grant select, insert, update, delete on public.budgets to authenticated;
grant all on public.budgets to service_role;
alter table public.budgets enable row level security;
create policy "own budgets" on public.budgets for all
  using (auth.uid()=user_id) with check (auth.uid()=user_id);
create index budgets_um on public.budgets(user_id, month);
create trigger budgets_touch before update on public.budgets
  for each row execute function public.touch_updated_at();

create table public.monthly_settings (
  user_id uuid not null references auth.users on delete cascade,
  month date not null,
  starting_balance numeric not null default 0,
  income_planned numeric not null default 0,
  notes text,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);
grant select, insert, update, delete on public.monthly_settings to authenticated;
grant all on public.monthly_settings to service_role;
alter table public.monthly_settings enable row level security;
create policy "own ms" on public.monthly_settings for all
  using (auth.uid()=user_id) with check (auth.uid()=user_id);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  list public.shopping_list_kind not null default 'personal',
  name text not null,
  priority numeric not null default 50,
  estimated_cost numeric not null default 0,
  category_id uuid references public.categories on delete set null,
  notes text,
  status public.shopping_status not null default 'pending',
  purchased_on date,
  purchased_price numeric,
  month date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.shopping_items to authenticated;
grant all on public.shopping_items to service_role;
alter table public.shopping_items enable row level security;
create policy "own shopping" on public.shopping_items for all
  using (auth.uid()=user_id) with check (auth.uid()=user_id);
create index shop_ulp on public.shopping_items(user_id, list, priority);
create trigger shopping_touch before update on public.shopping_items
  for each row execute function public.touch_updated_at();

create table public.shopping_budgets (
  user_id uuid not null references auth.users on delete cascade,
  month date not null,
  list public.shopping_list_kind not null,
  budget_amount numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month, list)
);
grant select, insert, update, delete on public.shopping_budgets to authenticated;
grant all on public.shopping_budgets to service_role;
alter table public.shopping_budgets enable row level security;
create policy "own sb" on public.shopping_budgets for all
  using (auth.uid()=user_id) with check (auth.uid()=user_id);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  cost numeric not null default 0,
  priority numeric not null default 5,
  status public.wishlist_status not null default 'to_buy',
  purchased_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.wishlist_items to authenticated;
grant all on public.wishlist_items to service_role;
alter table public.wishlist_items enable row level security;
create policy "own wishlist" on public.wishlist_items for all
  using (auth.uid()=user_id) with check (auth.uid()=user_id);
create trigger wishlist_touch before update on public.wishlist_items
  for each row execute function public.touch_updated_at();

create table public.trip_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  travel numeric not null default 0,
  visa numeric not null default 0,
  hotel_per_night numeric not null default 0,
  transport_per_day numeric not null default 0,
  food_per_day numeric not null default 0,
  activities_per_day numeric not null default 0,
  stay_length int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.trip_budgets to authenticated;
grant all on public.trip_budgets to service_role;
alter table public.trip_budgets enable row level security;
create policy "own trips" on public.trip_budgets for all
  using (auth.uid()=user_id) with check (auth.uid()=user_id);
create trigger trips_touch before update on public.trip_budgets
  for each row execute function public.touch_updated_at();

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  filename text,
  rows_ok int not null default 0,
  rows_skipped int not null default 0,
  detected_month date,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.imports to authenticated;
grant all on public.imports to service_role;
alter table public.imports enable row level security;
create policy "own imports" on public.imports for all
  using (auth.uid()=user_id) with check (auth.uid()=user_id);
