# Chia tiền du lịch - Web App

App chia tiền cho nhóm du lịch. Hỗ trợ:
- Quản lý gia đình (tên, số người)
- Ghi nhận khoản góp quỹ chung
- Ghi nhận khoản chi (chia theo đầu người)
- Tự động tính cân đối, gợi ý quyết toán
- Xuất Excel báo cáo
- **Đồng bộ realtime** - cả nhóm xem chung, ai sửa cũng tự cập nhật

---

## 🚀 HƯỚNG DẪN DEPLOY (KHÔNG CẦN BIẾT CODE)

### Bước 1: Tạo database trên Supabase (5 phút)

1. Vào https://supabase.com → **Start your project** → Đăng nhập bằng GitHub
2. Bấm **New Project**:
   - Name: `travel-split` (hoặc tên gì cũng được)
   - Database Password: tạo password mạnh, **lưu lại**
   - Region: chọn `Southeast Asia (Singapore)` - gần Việt Nam nhất
   - Bấm **Create new project** → chờ ~2 phút
3. Khi xong, vào tab **SQL Editor** ở sidebar trái → **New query**
4. Mở file `supabase_setup.sql` trong project này, copy toàn bộ → paste vào SQL Editor → bấm **Run** (góc dưới phải)
5. Vào tab **Settings** (⚙️) → **API**, copy 2 giá trị:
   - `Project URL` (dạng `https://xxxxx.supabase.co`)
   - `anon public` key (chuỗi dài bắt đầu bằng `eyJ...`)

### Bước 2: Đưa code lên GitHub (5 phút)

1. Tạo tài khoản https://github.com nếu chưa có
2. Tạo repository mới: bấm **New** → tên: `travel-split` → **Private** → **Create**
3. **Cách dễ nhất nếu chưa biết Git**: dùng **GitHub Desktop** (https://desktop.github.com/)
   - Tải về, đăng nhập
   - **File → Add local repository** → chọn thư mục `travel-split-web` đã tải về
   - Bấm **Publish repository** → chọn repo vừa tạo
4. **Hoặc** upload thủ công: vào trang repo trên web, bấm **Add file → Upload files** → kéo thả toàn bộ thư mục `travel-split-web` (trừ file `.env.local` nếu có) → Commit

### Bước 3: Deploy trên Vercel (3 phút)

1. Vào https://vercel.com → **Sign Up with GitHub**
2. Bấm **Add New → Project** → Chọn repo `travel-split` vừa push lên
3. **Quan trọng**: Mở phần **Environment Variables**, thêm 2 biến:
   - Tên: `NEXT_PUBLIC_SUPABASE_URL` → Value: paste `Project URL` từ Supabase
   - Tên: `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Value: paste `anon public` key
4. Bấm **Deploy** → chờ ~2 phút

Xong! Vercel sẽ cho bạn URL dạng `https://travel-split-xxx.vercel.app` - gửi cho cả nhóm là dùng được.

---

## 📱 CHIA SẺ CHO NHÓM

Gửi link Vercel cho cả nhóm. Mỗi người mở trên điện thoại:
- **iPhone**: Safari → biểu tượng Share (mũi tên lên) → **Add to Home Screen**
- **Android**: Chrome → menu 3 chấm → **Cài đặt vào màn hình chính**

App sẽ chạy như app native, dữ liệu đồng bộ realtime giữa các thiết bị.

---

## 🔒 LƯU Ý BẢO MẬT

Bản này dùng policy **mở** (ai có link đều xem/sửa được) - phù hợp nhóm tin nhau.

Nếu cần bảo vệ:
- **Cách đơn giản**: bật Vercel Password Protection (cần plan Pro $20/tháng)
- **Cách miễn phí**: thêm trang đăng nhập đơn giản bằng Supabase Auth (cần ít code, có thể nhờ Claude hướng dẫn sau)

---

## 🛠️ CHẠY LOCAL (nếu muốn test trước khi deploy)

Cần có Node.js cài sẵn (https://nodejs.org). Mở terminal:

```bash
cd travel-split-web
npm install
cp .env.local.example .env.local
# Mở file .env.local, điền URL và KEY từ Supabase
npm run dev
```

Mở http://localhost:3000

---

## 📂 CẤU TRÚC FILE

```
travel-split-web/
├── app/
│   ├── layout.js          # Layout chung
│   └── page.js            # Trang chính (toàn bộ logic UI)
├── lib/
│   └── supabase.js        # Kết nối Supabase
├── package.json           # Khai báo dependencies
├── next.config.js
├── supabase_setup.sql     # Script tạo bảng database
├── .env.local.example     # Template biến môi trường
└── README.md
```

Tất cả logic UI nằm trong 1 file `app/page.js` - dễ chỉnh sửa.
