-- Chạy 1 lần trong Supabase > SQL Editor.

-- 1) Bảng poster
create table if not exists public.posters (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default '',
  wall_path   text not null,          -- ảnh nhẹ hiển thị trên tường
  full_path   text not null,          -- ảnh lớn xem toàn màn hình
  width       int,
  height      int,
  sort_order  int  not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.posters enable row level security;

-- Ai cũng xem được poster đang hiện; người đã đăng nhập (chỉ bạn) xem được cả poster ẩn
create policy "read posters" on public.posters
  for select using (published or auth.role() = 'authenticated');

-- Chỉ người đã đăng nhập được thêm / sửa / xóa
create policy "admin writes posters" on public.posters
  for all to authenticated using (true) with check (true);

-- 2) Kho ảnh (public để gallery tải nhanh qua CDN)
insert into storage.buckets (id, name, public)
values ('posters', 'posters', true)
on conflict (id) do nothing;

create policy "public read poster files" on storage.objects
  for select using (bucket_id = 'posters');
create policy "admin upload poster files" on storage.objects
  for insert to authenticated with check (bucket_id = 'posters');
create policy "admin update poster files" on storage.objects
  for update to authenticated using (bucket_id = 'posters');
create policy "admin delete poster files" on storage.objects
  for delete to authenticated using (bucket_id = 'posters');

-- 3) QUAN TRỌNG: vào Authentication > Providers > Email, TẮT "Allow new users to sign up",
--    rồi Authentication > Users > "Add user" để tạo đúng 1 tài khoản admin cho bạn.
