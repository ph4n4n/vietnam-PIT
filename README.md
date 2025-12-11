# 🧮 Vietnam PIT Calculator

Công cụ tính thuế Thu nhập Cá nhân (TNCN) Việt Nam - So sánh giữa Luật thuế 2025 và Luật thuế mới 2026.

## ✨ Tính năng

### Core
- Tính thuế TNCN từ thu nhập **Gross** hoặc **Net**
- So sánh song song thuế 2025 vs 2026
- Hỗ trợ 4 vùng lương tối thiểu
- Tính số người phụ thuộc (giảm trừ gia cảnh)
- Hiển thị tiền hoàn thuế cuối năm
- Chi phí doanh nghiệp (tổng cost employer)
- Giao diện responsive, hỗ trợ mobile

### 🔗 Chia sẻ kết quả qua URL
Chia sẻ link tính thuế với đồng nghiệp, HR:
```
https://vietnam-pit.vercel.app?income=50000000&type=gross&dep=2&region=1
```
| Param    | Mô tả                  |
| -------- | ---------------------- |
| `income` | Số tiền (không có dấu) |
| `type`   | `gross` hoặc `net`     |
| `dep`    | Số người phụ thuộc     |
| `region` | Vùng lương (1-4)       |

### 📊 So sánh nhiều mức lương
Đang đàm phán offer? Nhập nhiều mức lương để so sánh NET:
```
30,000,000 ; 40,000,000 ; 50,000,000
```
- Hỗ trợ 2-5 mức lương
- Hiển thị chênh lệch NET so với mức đầu tiên

### 💰 Bonus / Tháng 13
- Nhập số tháng bonus (0-12)
- Tính thuế lũy tiến theo năm (12 tháng lương + bonus)
- Hiển thị tổng kết thu nhập cả năm

### 📱 PWA - Cài đặt như app
- Add to Home Screen trên mobile
- Hoạt động offline sau lần load đầu
- Icon và splash screen native

## 📊 Thông số thuế

### Bảo hiểm bắt buộc (Người lao động - 10.5%)
| Loại | Tỷ lệ | Trần                      |
| ---- | ----- | ------------------------- |
| BHXH | 8%    | 46.8M                     |
| BHYT | 1.5%  | 46.8M                     |
| BHTN | 1%    | 20 × Lương tối thiểu vùng |

### Bảo hiểm doanh nghiệp đóng (21.5%)
| Loại                             | Tỷ lệ | Trần                      |
| -------------------------------- | ----- | ------------------------- |
| BHXH                             | 17%   | 46.8M                     |
| BH tai nạn LĐ - Bệnh nghề nghiệp | 0.5%  | 46.8M                     |
| BHYT                             | 3%    | 46.8M                     |
| BHTN                             | 1%    | 20 × Lương tối thiểu vùng |

### Giảm trừ gia cảnh
| Mục             | 2025        | 2026        |
| --------------- | ----------- | ----------- |
| Bản thân        | 11,000,000₫ | 15,500,000₫ |
| Người phụ thuộc | 4,400,000₫  | 6,200,000₫  |

### Biểu thuế lũy tiến
**2025 (7 bậc):** 5% → 10% → 15% → 20% → 25% → 30% → 35%

**2026 (5 bậc):** 5% → 15% → 25% → 30% → 35%
 
## 🌐 Demo

[https://vietnam-pit.vercel.app](https://vietnam-pit.vercel.app)

## 📝 License
MIT

## Author
ph4n4n


