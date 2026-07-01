# 🎉 PickPop

โปรแกรมสุ่มผู้โชคดี สำหรับทุกงานอีเวนต์ — สุ่มได้ทั้งรูปภาพและรายชื่อ

## 📁 โครงสร้างโปรเจกต์

```
pickpop/
├── index.html              ← หน้าแรก (Landing Page) เลือกโหมด
├── image-mode.html         ← โหมดสุ่มรูปภาพ (Step 2)
├── text-mode.html          ← โหมดสุ่มข้อความ (Step 4)
├── privacy.html            ← นโยบายความเป็นส่วนตัว (Step 5)
├── terms.html              ← ข้อกำหนดการใช้งาน (Step 5)
├── css/
│   ├── common.css          ← Style ที่ใช้ร่วมกัน (ตัวแปร, ปุ่ม, ฟอนต์)
│   ├── landing.css         ← Style สำหรับหน้าแรก
│   ├── image-mode.css      ← Style สำหรับโหมดรูป (Step 2)
│   └── text-mode.css       ← Style สำหรับโหมดข้อความ (Step 4)
├── js/
│   ├── common.js           ← ฟังก์ชันร่วม (toast, modal, storage)
│   ├── settings.js         ← Settings menu (Step 3)
│   ├── image-mode.js       ← Logic โหมดรูป (Step 2)
│   └── text-mode.js        ← Logic โหมดข้อความ (Step 4)
└── assets/                 ← รูปภาพ, ไอคอน, ฯลฯ
```

## 🚀 การพัฒนา

**Phase 1 - MVP** (กำลังทำ)
- ✅ Step 1: Landing Page + โครงสร้างโปรเจกต์
- ⏳ Step 2: โหมดสุ่มรูปภาพ
- ⏳ Step 3: Settings Menu
- ⏳ Step 4: โหมดสุ่มข้อความ
- ⏳ Step 5: Privacy Policy + Terms
- ⏳ Step 6: Final polish

**Phase 2 - ระบบขาย** (อนาคต)
- License key system
- PromptPay payment
- Free tier limit (30 คน)

## 💡 การใช้งาน

เปิดไฟล์ `index.html` ในเบราว์เซอร์เพื่อเริ่มต้น

## 🌐 การ Deploy (Vercel)

1. Push โค้ดขึ้น GitHub
2. เชื่อม GitHub กับ Vercel
3. Deploy อัตโนมัติ

## 📄 License

Proprietary © 2025 PickPop
