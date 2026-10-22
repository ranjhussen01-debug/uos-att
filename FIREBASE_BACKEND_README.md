# ڕێبەری تەواوی باکئێند و بەستنەوەی فایەربەیس (Firebase Backend Guide)
## پرۆژە: `uosattendance-df9e3` | زانکۆی سلێمانی - کۆلێژی کارگێڕی و ئابووری

ئەم سیستمە بە تەواوەتی بەسترایەوە بە داتابەیسی کلاودی **Google Firebase (Firestore)**.

---

### ١. زانیارییەکانی بەستنەوەی فایەربەیس (Firebase Config)
فایەربەیسەکەت بە سەرکەوتوویی ناسێندراوە لە پەڕگەی `.env` و `firebase-service.js`:
* **Project ID:** `uosattendance-df9e3`
* **Auth Domain:** `uosattendance-df9e3.firebaseapp.com`
* **Storage Bucket:** `uosattendance-df9e3.firebasestorage.app`
* **App ID:** `1:512431536760:web:399c39d8ec3dffe97f4b8d`
* **Measurement ID:** `G-L9CZS81LLE`

---

### ٢. پێکهاتەی باکئێند (Backend Architecture)

1. **`server.js` (سێرڤەری سەرەکی باکئێند)**:
   - بە زمانی Node.js دروستکراوە بە کەمترین پەیوەستی و بەرزترین خێرایی.
   - ڕاستەوخۆ پەیوەستە بە Google Firestore REST API بۆ خوێندنەوە، پاشەکەوتکردن و سڕینەوەی داتا.
   - خزمەتگوزاری پەڕە و فۆڵدەرەکانی وێب پێشکەش دەکات لەسەر پۆرت `3000`.

2. **`firebase-service.js` (بزوێنەری کلاودی ڕاستەوخۆ - Client Sync Engine)**:
   - لە سەرجەم پەڕەکاندا کار دەکات (`index.html`, `login.html`, `departments.html`, `super_admin.html`, `teacher_attendance.html`).
   - خاوەنی **هاوکاتکردنی ڕاستەوخۆیە (Realtime Sync)** بە بەکارهێنانی `onSnapshot`.
   - باجێکی جوان لە گۆشەی خوارەوەی چەپ پیشان دەدات بە ڕەنگی سەوز (🟢 فایەربەیس: پەیوەستە) کە کلیکی لێ بکەیت زانیاری و ژمارەی خوێندکاران و دانیشتنەکان پیشان دەدات لەگەڵ دوگمەی Force Sync.
   - ئەگەر مامۆستایەک لە ئامێرێکەوە غیابات تۆمار بکات، ڕاستەوخۆ لە هەمان چرکەدا بۆ سەرپەرشتیار و سەرۆک بەشەکان دەگوازرێتەوە.

---

### ٣. چۆنیەتی کارپێکردنی سێرڤەری باکئێند (How to Run)

لە تێرمیناڵ یان PowerShell لە ناو فۆڵدەری پڕۆژەکە ئەم فەرمانە لێبدە:

```bash
node server.js
```
یان ئەگەر پەیجەکان دابمەزرێنیت:
```bash
npm start
```

کاتێک کار دەکات دەتوانیت لە ڕێگەی براوسەرەوە بچیتە ناو:
* **پۆرتاڵی سەرەکی:** [http://localhost:3000](http://localhost:3000)
* **بەشی سەرپەرشتیاری باڵا:** [http://localhost:3000/super_admin.html](http://localhost:3000/super_admin.html)
* **بەشی سەرۆک بەشەکان:** [http://localhost:3000/departments.html](http://localhost:3000/departments.html)
* **پەڕەی مامۆستایان:** [http://localhost:3000/teacher_attendance.html](http://localhost:3000/teacher_attendance.html)
* **چوونەژوورەوە:** [http://localhost:3000/login.html](http://localhost:3000/login.html)

---

### ٤. ڕێڕەوەکانی باکئێند (REST API Endpoints)

| شێواز | ڕێڕەو (Route) | فەرمان |
| :--- | :--- | :--- |
| `GET` | `/api/status` | پشکنینی دۆخی سێرڤەر و پەیوەندی فایەربەیس |
| `GET` | `/api/config` | هێنانی کۆنفیگی گشتی فایەربەیس |
| `GET` | `/api/students` | هێنانی سەرجەم خوێندکاران لە کلاود |
| `POST` | `/api/students` | زیادکردن یان نوێکردنەوەی خوێندکار لە فایەربەیس |
| `DELETE` | `/api/students/:id` | سڕینەوەی خوێندکارێک لە فایەربەیس |
| `DELETE` | `/api/students` | سڕینەوەی هەموو خوێندکاران (کۆتایی ساڵی خوێندن) |
| `GET` | `/api/sessions` | هێنانی سەرجەم دانیشتنەکانی غیابات لە کلاود |
| `POST` | `/api/sessions` | پاشەکەوتکردنی دانیشتنێکی نوێی غیابات |
| `POST` | `/api/sync` | هاوکاتکردنی بەکۆمەڵی داتاکان بە یەکجاری |
| `POST` | `/api/reset-semester` | کۆتایی سمستەر: سفرکردنەوەی غیابات و هێشتنەوەی خوێندکاران |
| `POST` | `/api/reset-academic-year` | کۆتایی ساڵ: پاکتاوی هەموو خوێندکاران لە فایەربەیس |

---

### ٥. پاراستنی داتا و کارکردن بەبێ ئینتەرنێت (Offline Support)
سیستەمەکە بە هەردوو شێوازەکە دروستکراوە:
* کاتێک ئینتەرنێت هەبێت دەستبەجێ بە فایەربەیسەوە دەبەسترێت.
* کاتێک ئینتەرنێت بپچڕێت داتاکان لە ناوخۆی ئامێرەکەدا پارێزراون (LocalStorage Cache)، بە هاتنەوەی ئینتەرنێت بە شێوەیەکی خۆکار بەرز دەکرێنەوە بۆ فایەربەیس.
