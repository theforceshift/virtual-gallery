# Virtual Gallery

Website showcase poster: nhân vật đi dọc bức tường bê tông kiểu side-scrolling, poster sáng viền khi đứng giữa, chạm / Space để xem toàn màn hình.

## Cấu trúc

| File | Vai trò |
|---|---|
| `index.html`, `style.css`, `gallery.js` | Trang gallery |
| `admin.html` | Trang quản trị: kéo thả ảnh, đổi tên, ẩn/hiện, sắp thứ tự, xóa |
| `data.js` | Lớp dữ liệu: Supabase thật hoặc chế độ demo (IndexedDB) |
| `config.js` | Điền URL + anon key của Supabase. Để trống = demo |
| `supabase/schema.sql` | Tạo bảng `posters`, bucket ảnh và quyền truy cập |
| `assets/sprite/` | 4 frame đi phải + 4 frame đã lật để đi trái (đã crop, cao 720px) |
| `assets/wall/concrete.jpg` | Texture tường lặp ngang |
| `assets/posters/` | 6 poster mẫu (bản `wall` nhẹ và bản `full`) |

Không cần build: đây là HTML/JS thuần, deploy thẳng lên bất kỳ static host nào.

## Chạy thử trên máy

```bash
cd virtual-gallery
python3 -m http.server 8000
# mở http://localhost:8000 và http://localhost:8000/admin.html
```

## Lên bản thật (khoảng 15 phút)

1. **Supabase** (miễn phí): tạo project tại supabase.com.
   - SQL Editor → dán và chạy `supabase/schema.sql`.
   - Authentication → Providers → Email: tắt "Allow new users to sign up".
   - Authentication → Users → Add user: tạo tài khoản admin của bạn.
   - Project Settings → API: copy `Project URL` và `anon public key` vào `config.js`.
     (anon key được phép công khai; quyền ghi đã bị khóa bởi các policy trong schema.)
2. **GitHub**: tạo repo trống, đẩy thư mục này lên.
3. **Hosting**: Vercel, Netlify hoặc Cloudflare Pages → import repo → không cần build command, output là thư mục gốc. Có thể gắn tên miền riêng.
4. Vào `/admin.html`, đăng nhập, kéo thả poster. Admin tự tạo bản nhẹ (1100px) cho tường và bản lớn (2200px) để xem toàn màn hình.

## Tinh chỉnh nhanh (đầu file `gallery.js`)

- `SPEED`: tốc độ đi · `FRAME_MS`: 200ms/frame
- `SPACING`: khoảng cách giữa poster · `ACTIVE_RANGE`: vùng được highlight
- `POSTER_MAX_W/H`, `POSTER_CY`: kích thước và độ cao poster trên tường
- `HERO_H`: chiều cao nhân vật · `IDLE_FRAME`: frame khi đứng yên
