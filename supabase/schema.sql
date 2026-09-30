-- =====================================================================
-- AuraStore database schema (tickets F-03 to F-06)
-- Run this whole file once in: Supabase dashboard > SQL Editor > New query
-- It is safe to run again: it will not duplicate or break existing data.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------

create table if not exists public.categories (
  id          bigint generated always as identity primary key,
  name        text not null,
  slug        text not null unique,
  sort_order  integer not null default 0
);

create table if not exists public.products (
  id                bigint generated always as identity primary key,
  slug              text not null unique,
  name              text not null,
  brand             text,
  category_id       bigint not null references public.categories(id),
  price             integer not null check (price >= 0),          -- whole naira
  old_price         integer check (old_price is null or old_price > price),
  stock_qty         integer not null default 0 check (stock_qty >= 0),
  rating_avg        numeric(2,1) not null default 0,
  rating_count      integer not null default 0,
  badge             text,
  short_description text,
  description       text,
  highlights        text[] not null default '{}',
  specifications    jsonb  not null default '{}'::jsonb,
  box_contents      text[] not null default '{}',
  warranty          text,
  image_urls        text[] not null default '{}',
  is_featured       boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists products_category_idx on public.products(category_id);

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  email           text,
  avatar_url      text,
  phone           text,
  default_address text,
  city            text,
  state           text,
  created_at      timestamptz not null default now()
);

create table if not exists public.cart_items (
  user_id     uuid   not null references auth.users(id) on delete cascade,
  product_id  bigint not null references public.products(id) on delete cascade,
  quantity    integer not null check (quantity > 0),
  updated_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      text not null unique,
  user_id           uuid not null references auth.users(id),
  status            text not null default 'placed'
                    check (status in ('placed','processing','shipped','delivered','cancelled')),
  contact_email     text not null,
  ship_name         text not null,
  ship_phone        text not null,
  ship_address      text not null,
  ship_city         text not null,
  ship_state        text not null,
  subtotal          integer not null,
  delivery_fee      integer not null,
  total             integer not null,
  payment_method    text not null default 'pay_on_delivery',
  email_status      text not null default 'pending'
                    check (email_status in ('pending','sent','failed')),
  client_request_id uuid unique,
  created_at        timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders(user_id, created_at desc);

create table if not exists public.order_items (
  id           bigint generated always as identity primary key,
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   bigint references public.products(id) on delete set null,
  product_name text not null,
  unit_price   integer not null,
  quantity     integer not null check (quantity > 0),
  line_total   integer not null,
  image_url    text
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- ---------------------------------------------------------------------
-- 2. ROW-LEVEL SECURITY (who can see or change what)
-- ---------------------------------------------------------------------

alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.profiles    enable row level security;
alter table public.cart_items  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Anyone can read the catalog. Nobody can change it from the browser.
drop policy if exists "categories are public" on public.categories;
create policy "categories are public" on public.categories
  for select using (true);

drop policy if exists "products are public" on public.products;
create policy "products are public" on public.products
  for select using (true);

-- Profiles: a user can read and edit only their own row.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Cart: a user has full control of their own cart rows only.
drop policy if exists "manage own cart" on public.cart_items;
create policy "manage own cart" on public.cart_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Orders: a user can only read their own. Orders are created by the
-- server function (place_order), never directly from the browser.
drop policy if exists "read own orders" on public.orders;
create policy "read own orders" on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists "read own order items" on public.order_items;
create policy "read own order items" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 3. AUTO-CREATE A PROFILE ON FIRST GOOGLE SIGN-IN
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. PLACE ORDER (all-or-nothing)
-- Called only by the Edge Function (service role). It:
--   * returns the existing order if the same request id is sent twice
--   * checks stock, calculates prices itself, creates order + items
--   * reduces stock and empties the cart
-- Delivery rule (keep in sync with js/config.js):
--   flat 2,500 naira, free when subtotal is 100,000 naira or more.
-- ---------------------------------------------------------------------

create or replace function public.place_order(
  p_user_id       uuid,
  p_contact_email text,
  p_ship_name     text,
  p_ship_phone    text,
  p_ship_address  text,
  p_ship_city     text,
  p_ship_state    text,
  p_request_id    uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c_flat_fee       constant integer := 2500;
  c_free_threshold constant integer := 100000;
  v_existing  uuid;
  v_order_id  uuid;
  v_subtotal  integer;
  v_fee       integer;
  v_number    text;
  v_problems  jsonb;
  v_tries     integer := 0;
begin
  -- Same request sent twice (double click, retry): return the first order.
  select id into v_existing
  from public.orders
  where client_request_id = p_request_id and user_id = p_user_id;
  if v_existing is not null then
    return v_existing;
  end if;

  -- Lock the products in this cart so two buyers cannot take the last item.
  perform 1
  from public.products p
  join public.cart_items c on c.product_id = p.id
  where c.user_id = p_user_id
  for update of p;

  if not exists (select 1 from public.cart_items where user_id = p_user_id) then
    raise exception 'EMPTY_CART';
  end if;

  -- Any item asking for more than we have?
  select jsonb_agg(jsonb_build_object(
           'product_id', p.id,
           'name', p.name,
           'requested', c.quantity,
           'available', p.stock_qty))
  into v_problems
  from public.cart_items c
  join public.products p on p.id = c.product_id
  where c.user_id = p_user_id and c.quantity > p.stock_qty;

  if v_problems is not null then
    raise exception 'STOCK_PROBLEM' using detail = v_problems::text;
  end if;

  -- Prices always come from the products table, never from the browser.
  select sum(p.price * c.quantity)::integer
  into v_subtotal
  from public.cart_items c
  join public.products p on p.id = c.product_id
  where c.user_id = p_user_id;

  v_fee := case when v_subtotal >= c_free_threshold then 0 else c_flat_fee end;

  -- Friendly order number, e.g. AUR-260930-4821 (retry if it already exists).
  loop
    v_number := 'AUR-'
      || to_char(now() at time zone 'Africa/Lagos', 'YYMMDD') || '-'
      || lpad(floor(random() * 10000)::integer::text, 4, '0');
    exit when not exists (select 1 from public.orders where order_number = v_number);
    v_tries := v_tries + 1;
    if v_tries > 20 then
      raise exception 'ORDER_NUMBER_FAILED';
    end if;
  end loop;

  insert into public.orders (
    order_number, user_id, contact_email,
    ship_name, ship_phone, ship_address, ship_city, ship_state,
    subtotal, delivery_fee, total, client_request_id
  ) values (
    v_number, p_user_id, p_contact_email,
    p_ship_name, p_ship_phone, p_ship_address, p_ship_city, p_ship_state,
    v_subtotal, v_fee, v_subtotal + v_fee, p_request_id
  )
  returning id into v_order_id;

  insert into public.order_items
    (order_id, product_id, product_name, unit_price, quantity, line_total, image_url)
  select v_order_id, p.id, p.name, p.price, c.quantity, p.price * c.quantity, p.image_urls[1]
  from public.cart_items c
  join public.products p on p.id = c.product_id
  where c.user_id = p_user_id;

  update public.products p
  set stock_qty = p.stock_qty - c.quantity
  from public.cart_items c
  where c.product_id = p.id and c.user_id = p_user_id;

  delete from public.cart_items where user_id = p_user_id;

  return v_order_id;
end;
$$;

-- Only the server (service role) may run this. Browsers cannot call it.
revoke all on function public.place_order(uuid, text, text, text, text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.place_order(uuid, text, text, text, text, text, text, uuid)
  to service_role;

-- ---------------------------------------------------------------------
-- 5. CHECK (run after the above; you should see 6 rows, all true)
-- ---------------------------------------------------------------------
select tablename, rowsecurity as rls_on
from pg_tables
where schemaname = 'public'
  and tablename in ('categories','products','profiles','cart_items','orders','order_items')
order by tablename;
