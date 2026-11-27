# Roadmap

<p><a href="ROADMAP.md">English</a> · <b>ภาษาไทย</b></p>

## ออกแล้ว

| เวอร์ชัน | ไฮไลต์ |
|---|---|
| **1.0** | `audit` รวมการตรวจทุกด้านเป็นรายงานเดียวที่เรียงตามความสำคัญ ทุกข้อมีหมายเลข มีโหมดแก้ไขทีละ diff พร้อมตรวจซ้ำ และมี [gallery](https://james-chirawat.github.io/svg-motion-kit/gallery/) รวมทุก template |
| 0.5 | `polish-audit` ตรวจ metadata, Open Graph, favicon, หน้า 404 และหน้า error, robots และ sitemap, i18n และส่วนที่ไม่ตรงกับ design system |
| 0.4 | `security-audit` ตรวจ secret (แสดงแบบปิดบังค่า), การจัดการ `.env`, ค่าลับที่หลุดผ่าน public env, XSS, route และ server action ที่ไม่ตรวจสิทธิ์ และ header |
| 0.3 | `perf-audit` ตรวจรูป, ฟอนต์ไทย, waterfall, N+1, cache, bundle และ script ภายนอก และเพิ่มหน้า preview ให้ `svg-motion` ตรวจงานที่ render แล้ว |
| 0.2 | `ui-audit` ตรวจสถานะของหน้า, accessibility และ contrast ตาม WCAG จากธีม และ export เป็น Vue หรือ Svelte ได้ |
| 0.1 | `theme-extract`, `svg-motion` (scout, template 8 แบบ, ตัวตรวจคุณภาพ, export เป็น React) และ `design-lint` |

รายละเอียดอยู่ใน [changelog](../CHANGELOG.md)

## ต่อไป

- **Eval ที่ใช้โปรเจกต์จริง:** ใส่โปรเจกต์ตัวอย่างเข้าไปใน eval แต่ละเคส ให้ grader ให้คะแนนจากหลักฐานระดับไฟล์ ไม่ใช่แค่คำแนะนำที่ฟังดูดี
- **ผล performance ที่วัดจริง:** นำผล Lighthouse (รันเมื่อผู้ใช้อนุญาต) มารวมในรายงาน `perf-audit` คู่กับผลตรวจจากโค้ด
- **รองรับ framework เพิ่ม:** สูตรสำหรับ Astro และรองรับแบบแผน route ของ Nuxt และ SvelteKit สำหรับหน้า loading, error และ not-found
- **Template เพิ่ม:** ค้นหาไม่พบ, รอการชำระเงิน, ไม่มีสิทธิ์เข้าถึง และขั้นตอน onboarding
- **i18n เชิงลึก:** ตรวจว่าทุกภาษามีข้อความครบทุก key

เสนอไอเดียหรือขอฟีเจอร์ได้ที่ [GitHub issues](https://github.com/James-Chirawat/svg-motion-kit/issues)

## หลักการ

1. **ทุกข้อต้องมีหลักฐาน ไม่ใช่ความรู้สึก:** ทุก finding ระบุไฟล์และบรรทัด การตรวจที่ทำแบบตายตัวได้เป็น script และ Claude ทำเฉพาะส่วนที่ต้องใช้วิจารณญาณ
2. **ค่าเริ่มต้นคืออ่านอย่างเดียว:** การแก้ไขต้องให้ผู้ใช้เลือก ทำทีละข้อ และแสดง diff ก่อนเสมอ
3. **บอกขีดจำกัดตามจริง:** รายงานบอกเสมอว่าการตรวจจากโค้ดมองไม่เห็นอะไรบ้าง
4. **ใช้รสนิยมของโปรเจกต์:** สี ฟอนต์ และ library มาจากโปรเจกต์ ไม่ใช่หน้าตาแบบ AI ทั่วไป
5. **script ไม่มี dependency:** เป็น Node 18 ขึ้นไปล้วน และไม่ใช้ network ถ้าผู้ใช้ไม่อนุญาต
