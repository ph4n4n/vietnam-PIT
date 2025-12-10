# 🧮 Vietnam PIT Calculator

Công cụ tính thuế Thu nhập Cá nhân (TNCN) Việt Nam - So sánh giữa Luật thuế 2025 và Luật thuế mới 2026.

## ✨ Tính năng

- Tính thuế TNCN từ thu nhập **Gross** hoặc **Net**
- So sánh song song thuế 2025 vs 2026
- Hỗ trợ 4 vùng lương tối thiểu
- Tính số người phụ thuộc (giảm trừ gia cảnh)
- Hiển thị tiền hoàn thuế cuối năm
- Giao diện responsive, hỗ trợ mobile

## 📊 Thông số thuế

### Bảo hiểm bắt buộc (Người lao động)
| Loại | Tỷ lệ | Trần |
|------|-------|------|
| BHXH | 8% | 46.8M |
| BHYT | 1.5% | 46.8M |
| BHTN | 1% | 20 × Lương tối thiểu vùng |

### Giảm trừ gia cảnh
| Mục | 2025 | 2026 |
|-----|------|------|
| Bản thân | 11,000,000₫ | 15,500,000₫ |
| Người phụ thuộc | 4,400,000₫ | 6,200,000₫ |

### Biểu thuế lũy tiến
**2025 (7 bậc):** 5% → 10% → 15% → 20% → 25% → 30% → 35%

**2026 (5 bậc):** 5% → 15% → 25% → 30% → 35%

## 🚀 Development

```bash
# Install dependencies
npm install

# Start dev server
npm run serve

# Build for production (minify)
npm run build

# Build with obfuscation
npm run build:secure

# Serve production build
npm run serve:dist
```

## 📁 Project Structure

```
├── index.html          # Main HTML
├── style.css           # Styles
├── app.js              # Calculator logic
├── build.sh            # Build script
├── dist/               # Production build
│   ├── index.html
│   ├── style.min.css
│   └── app.min.js
└── package.json
```

## 🌐 Demo

[https://vietnam-pit.vercel.app](https://vietnam-pit.vercel.app)

## 📝 License

MIT

