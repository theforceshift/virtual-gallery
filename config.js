// Cấu hình kết nối Supabase.
// Để trống cả hai giá trị => website chạy ở CHẾ ĐỘ DEMO:
//   poster lưu trong trình duyệt (IndexedDB), không cần tài khoản nào.
// Điền vào (lấy ở Supabase > Project Settings > API Keys) => dùng database + storage thật.
// Publishable key được phép công khai; quyền ghi bị khóa bằng policy trong supabase/schema.sql.
// KHÔNG BAO GIỜ đặt secret / service_role key ở đây.
export const SUPABASE_URL = 'https://syjwxudaqpmozxbecnto.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_Jtqpd9orDM8LQTht10afsw_m0WrHTJm';
export const BUCKET = 'posters';
