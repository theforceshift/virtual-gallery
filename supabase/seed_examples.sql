-- Thêm 6 poster mẫu (ảnh nằm sẵn trong thư mục assets/posters của website).
-- Chạy 1 lần trong Supabase > SQL Editor. Sau đó đổi tên / sắp xếp / xóa trong trang admin.
insert into public.posters (title, wall_path, full_path, width, height, sort_order) values
  ('Poster 01', 'assets/posters/example1_wall.jpg', 'assets/posters/example1_full.jpg',  634,  897, 0),
  ('Poster 02', 'assets/posters/example2_wall.jpg', 'assets/posters/example2_full.jpg', 1760, 2200, 1),
  ('Poster 03', 'assets/posters/example3_wall.jpg', 'assets/posters/example3_full.jpg', 1760, 2200, 2),
  ('Poster 04', 'assets/posters/example4_wall.jpg', 'assets/posters/example4_full.jpg', 1760, 2200, 3),
  ('Poster 05', 'assets/posters/example5_wall.jpg', 'assets/posters/example5_full.jpg', 1650, 2200, 4),
  ('Poster 06', 'assets/posters/example6_wall.jpg', 'assets/posters/example6_full.jpg', 1536, 1920, 5);
