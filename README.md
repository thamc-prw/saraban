# ระบบสารบรรณ ฝ่ายการเงินและบัญชี ศูนย์การแพทย์ธรรมศาสตร์

ทะเบียนหนังสือออก (เลข กบ.) และหนังสือรับเข้า แยกเลขรันตามปี ดูข้อมูลตามปีงบประมาณ เก็บข้อมูลบน Google Sheets

## โครงสร้าง

| ไฟล์ | หน้าที่ |
| --- | --- |
| `index.html`, `support.js` | หน้าเว็บของระบบ |
| `data.json` | ข้อมูลเริ่มต้นนำเข้าจาก Excel (หนังสือออก 1,858 / รับเข้า 2,635 รายการ) ใช้เมื่อยังไม่ได้เชื่อม Google Sheets |
| `apps-script/Code.gs` | ตัวเชื่อม Google Sheets (Apps Script Web App) |
| `apps-script/appsscript.json` | manifest (เขตเวลา Asia/Bangkok, เว็บแอป) |
| `.github/workflows/pages.yml` | deploy ขึ้น GitHub Pages อัตโนมัติ |

## 1) ติดตั้ง Apps Script (ตัวเชื่อม Google Sheets)

### วิธีมือ (ง่ายสุด)
1. เปิด Google Sheet `1fG1U1d_BMtzcI9KdGINg17mdbAXeFuNjopBfu_vSEvg` > ส่วนขยาย > Apps Script
2. วางเนื้อหา `apps-script/Code.gs` แทนโค้ดเดิม และเปิด Project Settings > Show "appsscript.json" แล้ววางเนื้อหา `appsscript.json`
3. แก้ `TOKEN` ในบรรทัดที่ 10 เป็นรหัสของคุณเอง
4. Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone > คัดลอก Web App URL

### วิธี clasp
```bash
npm i -g @google/clasp && clasp login
cd apps-script
cp .clasp.json.example .clasp.json   # ใส่ scriptId
clasp push
clasp deploy --description "v1"
```

## 2) Deploy ขึ้น GitHub Pages
1. สร้าง repo ใหม่ แล้ว push โฟลเดอร์นี้ขึ้น branch `main`
   ```bash
   git init && git add . && git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```
2. Settings > Pages > Source เลือก **GitHub Actions**
3. รอ workflow ทำงานเสร็จ เว็บจะอยู่ที่ `https://<user>.github.io/<repo>/`

## 3) เชื่อมระบบกับชีท
เปิดเว็บ > ตั้งค่า > ฐานข้อมูล (Google Sheets) > ใส่ Web App URL และ TOKEN > ทดสอบการเชื่อมต่อ > ส่งข้อมูลทั้งหมดขึ้นชีท

- ชีทแยกตามปีงบประมาณ (1 ต.ค. – 30 ก.ย.): `ออก FY2570`, `รับ FY2570`
- ชีทปีงบฯ ใหม่ถูกสร้างอัตโนมัติเมื่อเปิดระบบหลัง 1 ต.ค. หรือเมื่อมีเอกสารแรกของปีนั้น

## ข้อควรระวัง
- `TOKEN` และ Web App URL อยู่ในเบราว์เซอร์ของผู้ใช้ (localStorage) ไม่ควรใส่ลงใน repo สาธารณะ
- ข้อมูลใน `data.json` เป็นข้อมูลจริงของหน่วยงาน หาก repo เป็น public ให้ลบไฟล์นี้ออกหรือตั้ง repo เป็น private ก่อน
- รหัสเข้าเมนูแอดมินในต้นแบบ (`admin`) อยู่ในโค้ดฝั่งเบราว์เซอร์ ระบบจริงต้องตรวจสอบสิทธิ์ฝั่งเซิร์ฟเวอร์
