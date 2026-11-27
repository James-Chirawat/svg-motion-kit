<p align="center">
  <img src="docs/assets/banner.svg" alt="svg-motion-kit — motion ที่ตรงธีม และการตรวจ frontend สำหรับ Claude Code" width="840">
</p>

<p align="center">
  <a href="https://github.com/James-Chirawat/svg-motion-kit/actions/workflows/ci.yml"><img src="https://github.com/James-Chirawat/svg-motion-kit/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/version-1.0.0-1B1A17" alt="เวอร์ชัน 1.0.0"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-1B1A17" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/node-%E2%89%A518-1B1A17" alt="Node 18 ขึ้นไป">
</p>

<p align="center">
  <a href="README.md">English</a> · <b>ภาษาไทย</b> · <a href="https://james-chirawat.github.io/svg-motion-kit/">เว็บไซต์และ gallery</a>
</p>

**svg-motion-kit** คือ plugin ของ Claude Code ที่ช่วยเก็บงาน frontend ให้เสร็จสมบูรณ์ สิ่งที่มันทำ:

- อ่านธีมจริงจากโค้ดของโปรเจกต์
- หาจุดที่ UX ควรปรับ แล้วใส่ SVG เคลื่อนไหวที่เข้ากับดีไซน์
- ตรวจ security, accessibility, performance, ดีไซน์ และความเรียบร้อยของงาน

ทุกข้อที่ตรวจเจอมีหลักฐานระดับ `ไฟล์:บรรทัด` และแก้ไขให้ทีละ diff

## ติดตั้ง

```text
/plugin install svg-motion-kit --marketplace James-Chirawat/svg-motion-kit
```

ถ้าใช้ Claude Code เวอร์ชันก่อน 2.1.275 ให้ติดตั้ง 2 ขั้นตอน:

```text
/plugin marketplace add James-Chirawat/svg-motion-kit
/plugin install svg-motion-kit@svg-motion-kit
```

ต้องมี Claude Code และ Node.js 18 ขึ้นไป ไม่ต้องติดตั้งอะไรเพิ่ม

## เริ่มใช้งาน

พิมพ์สั่งได้เลย ภาษาไทยหรืออังกฤษก็ได้:

| พิมพ์ว่า | สิ่งที่เกิดขึ้น |
|---|---|
| *"ตรวจเว็บทั้งหมดก่อนขึ้น production แล้วบอกว่าควรแก้อะไรก่อน"* | `audit` ตรวจทุกด้าน แล้วสรุปเป็นรายงานเดียว เรียงตามความสำคัญ ทุกข้อมีหมายเลข |
| *"แก้ F2 กับ F5"* | แก้ให้ทีละข้อ แสดง diff ทุกครั้ง แล้วตรวจซ้ำว่าแก้สำเร็จ |
| *"ใส่ภาพ empty state เคลื่อนไหวในหน้ารายการสั่งซื้อ"* | `svg-motion` สร้างภาพด้วยสีของธีมโปรเจกต์ แล้ววางเป็น component |
| *"ทำไมหน้าเว็บดูเหมือน AI ทำ"* | `design-lint` ชี้จุดที่ดูซ้ำซาก แล้วเสนอทิศทางดีไซน์ 3 แบบ |

## Skills

| Skill | หน้าที่ |
|---|---|
| **audit** | รันการตรวจทุกด้านด้านล่างนี้ แล้วรวมเป็นรายงานเดียว มีคะแนนรวม หัวข้อ "ทำอันนี้ก่อน" และหมายเลขทุกข้อ สั่งแก้ตามหมายเลขได้เลย |
| **svg-motion** | หาจังหวะ empty, loading, error, success, offline และ upload แล้วสร้าง SVG เคลื่อนไหวจาก template 8 แบบ ตรวจคุณภาพ และ export เป็น component ของ React, Vue หรือ Svelte |
| **theme-extract** | อ่าน design token จริงจาก Tailwind v3/v4, CSS variables, shadcn/ui, dark mode, radius และฟอนต์ |
| **design-lint** | ให้คะแนนว่า UI ดู generic แค่ไหน (ไล่สีม่วง, กระจก, ก้อน blob, emoji แทนไอคอน…) และเสนอทางเลือกที่มีเหตุผลรองรับ |
| **ui-audit** | สถานะของหน้าที่ขาดไป, label ของฟอร์ม, focus, ขนาดปุ่มกด, alt ของรูป และ contrast ตาม WCAG ที่คำนวณจากธีมจริง |
| **perf-audit** | format รูป, น้ำหนักและ subset ของฟอนต์ไทย, request ที่รอกันเป็นทอด (waterfall), N+1, cache, bundle ที่หนัก, script ภายนอก |
| **security-audit** | key ที่หลุด (แสดงแบบปิดบังค่าเสมอ), `.env` ที่ถูก commit, ค่าลับที่หลุดผ่าน public env, จุดเสี่ยง XSS, route และ server action ที่ไม่ตรวจสิทธิ์, security header |
| **polish-audit** | metadata และรูป Open Graph, favicon, หน้า 404 และหน้า error, robots และ sitemap, i18n, ส่วนที่ไม่ตรงกับ design system |

## ตัวอย่าง

ภาพทุกชิ้นใช้ชุดสีของโปรเจกต์ และเปลี่ยนตาม dark mode ไปด้วย

| Loader | Empty state | Success |
|:---:|:---:|:---:|
| <img src="docs/assets/loader.svg" alt="ตัวโหลดแบบวงกลมหมุนและ skeleton" width="260"> | <img src="docs/assets/empty-state.svg" alt="หน้าว่างพร้อมกล่องที่เปิดอยู่" width="260"> | <img src="docs/assets/success.svg" alt="บันทึกสำเร็จ เครื่องหมายถูกวาดตัวเอง" width="260"> |
| **Offline** | **Upload** | **Hero** |
| <img src="docs/assets/offline.svg" alt="ออฟไลน์ ปลั๊กพยายามเสียบเข้าเต้ารับ" width="260"> | <img src="docs/assets/upload.svg" alt="กำลังอัปโหลดไฟล์" width="260"> | <img src="docs/assets/hero.svg" alt="หน้าเว็บประกอบตัวเองขึ้นมา" width="260"> |

ดูครบทั้ง 8 template ใน 5 ธีมได้ที่ **[gallery](https://james-chirawat.github.io/svg-motion-kit/gallery/)**

## ทำงานอย่างไร

1. **ธีม:** อ่าน design token จากโค้ดจริง ไม่เดาเอง
2. **ตรวจ:** script ที่ทำงานแบบตายตัวสแกนโค้ดอย่างรวดเร็ว จากนั้น Claude เปิดไฟล์ยืนยันทุกข้อสำคัญก่อนรายงาน
3. **รายงาน:** ใส่หมายเลขทุกข้อ เรียงตามความรุนแรง ด้าน และแรงที่ต้องใช้แก้ แล้วบันทึกไว้ที่ `.svg-motion/audit.md`
4. **แก้:** คุณเลือกเองว่าจะแก้ข้อไหน ทุกการแก้เป็นการเปลี่ยนน้อยที่สุดที่ได้ผล แสดง diff ก่อน แล้วตรวจซ้ำ

## ความปลอดภัยและความน่าเชื่อถือ

- **ค่าเริ่มต้นคืออ่านอย่างเดียว:** จะแก้โค้ดก็ต่อเมื่อคุณสั่ง และแก้ทีละ diff
- **ไม่ใช้ network และไม่มี dependency:** script ที่แถมมาเป็น Node.js ล้วน อ่านเฉพาะโปรเจกต์ของคุณ ส่วนเครื่องมือเสริม (`npm audit`, Lighthouse) จะรันเฉพาะเมื่อคุณอนุญาต
- **ค่าลับไม่หลุด:** key ที่ตรวจเจอถูกปิดบังค่าในทุก output และคำแนะนำการแก้จะบอกให้ rotate key ก่อนเสมอ
- **บอกขีดจำกัดตามจริง:** นี่คือการตรวจระดับโค้ด ไม่ได้แทน Lighthouse, `npm audit`, การทำ pentest หรือการเปิดดูเว็บในเบราว์เซอร์ และทุกรายงานจะบอกว่าอะไรที่ยังไม่ได้ตรวจ

## อ่านเพิ่มเติม

- [Changelog](CHANGELOG.md)
- [Roadmap](docs/ROADMAP.th.md)
- [ร่วมพัฒนา](CONTRIBUTING.md)
- [วิธีทดสอบ](docs/TESTING.md)

## License

[MIT](LICENSE)
