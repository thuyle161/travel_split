-- ===== SUPABASE SQL SETUP =====
-- Chạy script này 1 lần trong Supabase SQL Editor

-- 1. Bảng gia đình
create table families (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  size integer not null check (size > 0),
  created_at timestamptz default now()
);

-- 2. Bảng góp tiền
create table contributions (
  id uuid default gen_random_uuid() primary key,
  family_id uuid references families(id) on delete cascade,
  date date not null,
  amount numeric not null check (amount > 0),
  note text,
  created_at timestamptz default now()
);

-- 3. Bảng khoản chi
create table expenses (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  date date not null,
  amount numeric not null check (amount > 0),
  participants uuid[] not null,
  created_at timestamptz default now()
);

-- 4. Bật Row Level Security với policy cho phép mọi người đọc/ghi
-- (Đơn giản cho app dùng nội bộ. Nếu cần bảo mật hơn, dùng auth.)
alter table families enable row level security;
alter table contributions enable row level security;
alter table expenses enable row level security;

create policy "allow all on families" on families for all using (true) with check (true);
create policy "allow all on contributions" on contributions for all using (true) with check (true);
create policy "allow all on expenses" on expenses for all using (true) with check (true);

-- 5. Bật Realtime để các thiết bị tự đồng bộ khi có thay đổi
alter publication supabase_realtime add table families;
alter publication supabase_realtime add table contributions;
alter publication supabase_realtime add table expenses;
