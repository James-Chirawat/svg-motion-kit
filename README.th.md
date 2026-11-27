<p align="center">
  <img src="docs/assets/banner.svg" alt="svg-motion-kit — motion ที่ตรงธีม และการตรวจ frontend สำหรับ Claude Code" width="840">
</p>

<p align="center">
  ชุด skill สำหรับ Claude Code ที่อ่านธีมจากโปรเจกต์ หาจุดที่ UX ควรปรับ<br>
  วาด SVG เคลื่อนไหวที่เข้ากับเว็บ และตรวจ frontend ทั้งด้าน UX, performance, security และความเรียบร้อย
</p>

<p align="center">
  <a href="README.md">English</a> · <b>ภาษาไทย</b>
</p>

> [!NOTE]
> **v0.1.0** มี `theme-extract`, `svg-motion` และ `design-lint` ให้ใช้งานแล้ว ส่วน audit ด้าน UX, performance, security และความเรียบร้อย อยู่ใน [roadmap](docs/ROADMAP.th.md)

## ขั้นตอนการทำงานครอบคลุมอะไรบ้าง

แม้ชื่อจะเขียนว่า SVG แต่ชุดเครื่องมือนี้ครอบคลุมทุกขั้นตอนที่ทำให้ frontend ดูเสร็จสมบูรณ์ แต่ละขั้นเป็น skill แยกกัน จะใช้ตัวเดียวหรือรันทั้งหมดก็ได้

| ขั้น | Skill | ทำอะไร | สถานะ |
|---|---|---|---|
| **1. ธีม** | `theme-extract` | อ่าน design token จริงของโปรเจกต์ (Tailwind v3/v4, CSS variables, shadcn/ui, dark mode, radius, ฟอนต์ และ library ที่ติดตั้งไว้) แล้วบันทึกลง `.svg-motion/theme.json` | ✅ |
| **2. สำรวจ** | `svg-motion` | สแกนโค้ดหาจังหวะที่ผู้ใช้ต้องรอ ติดขัด หรือไม่ได้รับ feedback (empty, loading, error, success, offline, upload) แล้วจัดอันดับว่าใส่ motion ตรงไหนได้ประโยชน์ที่สุด | ✅ v0.1 |
| **3. ดูหน้าตา** | `design-lint` | ชี้จุดที่ทำให้เว็บดูเหมือน AI สร้าง (ไล่สีม่วง, กระจก, ก้อน blob, emoji แทนไอคอน) แล้วเสนอทิศทางดีไซน์ที่อิงกลุ่มผู้ใช้จริง | ✅ v0.1 |
| **4. วาด** | `svg-motion` | สร้าง SVG เคลื่อนไหวที่ตรงธีม แล้ววางเป็น component ตาม framework ของโปรเจกต์ โดยแสดง diff ก่อน | ✅ v0.1 |
| **5. ตรวจ** | `ui-audit` · `perf-audit` · `security-audit` · `polish-audit` | **UX และ accessibility:** สถานะของหน้า, ฟอร์ม, มือถือ, contrast<br>**Performance:** รูป WebP/AVIF, subset ฟอนต์ไทย, การดึงข้อมูล, cache, bundle<br>**Security:** secret รั่ว, XSS รวมถึง SVG ที่ไม่ปลอดภัย, header<br>**ความเรียบร้อย:** การใช้ design system, i18n, meta/OG, หน้า 404/500, SEO | ✅ v0.2–v0.5 |
| **6. รายงานและแก้** | `audit` | รายงานเดียวเรียงตามความสำคัญ ทุกข้ออ้างอิงไฟล์และบรรทัด และแก้ทีละข้อพร้อมแสดง diff | v1.0 |

กติกาที่ใช้กับทุกขั้น:

- **ค่าเริ่มต้นคืออ่านอย่างเดียว** ไม่มีอะไรถูกแก้โดยที่คุณยังไม่ได้ดูและอนุมัติ diff
- **ทุกข้อต้องมีหลักฐาน ไม่ใช่ความรู้สึก** ทุก finding ระบุไฟล์และบรรทัด การตรวจที่ทำแบบตายตัวได้เป็น script ส่วน Claude ทำเฉพาะงานที่ต้องใช้วิจารณญาณ
- **บอกขีดจำกัดตามจริง** การอ่านโค้ดวัดความเร็วจริงไม่ได้ และพิสูจน์ไม่ได้ว่าปลอดภัย รายงานจะบอกไว้ชัด และแนะนำ Lighthouse หรือการตรวจที่จริงจังกว่า
- **ใช้รสนิยมของโปรเจกต์คุณ** สี radius ฟอนต์ และ library animation มาจากโค้ดของคุณ ไม่ติดตั้งอะไรเพิ่มโดยไม่ถามก่อน
- **script ไม่มี dependency** ใช้ Node 18 ขึ้นไป ไม่ใช้ network ถ้าคุณไม่อนุญาต และใช้ได้ทั้งภาษาไทยและอังกฤษ

แผนฉบับเต็มพร้อมสิ่งที่ตรวจทุกข้อ อยู่ใน [docs/ROADMAP.th.md](docs/ROADMAP.th.md)

## ตัวอย่าง

ทุกภาพใช้ชุดสีของตัวเอง เพราะผลลัพธ์ควรเข้ากับธีมของโปรเจกต์*คุณ* ไม่ใช่โทนม่วงแบบที่ AI ชอบใช้ ส่วน banner, hero และไอคอนใช้ธีมประจำของชุดเครื่องมือนี้ คือสีกระดาษ หมึกดำ และแดงชาด

| Loader | Empty state | Hero |
|:---:|:---:|:---:|
| <img src="docs/assets/loader.svg" alt="ตัวโหลดแบบวงกลมหมุนและ skeleton" width="260"> | <img src="docs/assets/empty-state.svg" alt="หน้าว่างที่มีกล่องลอยขึ้นลง" width="260"> | <img src="docs/assets/hero.svg" alt="หน้าเว็บประกอบตัวเองขึ้นมา แล้วมีเคอร์เซอร์มาคลิกปุ่ม" width="260"> |
| น้ำเงินเข้ม + มิ้นต์ · วงหมุน + แสงวิ่ง | เขียวหัวเป็ด + ส้มปะการัง · ลอย + โผล่ | กระดาษ + หมึก · ประกอบหน้า + คลิก |

| บันทึกสำเร็จ | ออฟไลน์ | อัปโหลด |
|:---:|:---:|:---:|
| <img src="docs/assets/success.svg" alt="บันทึกสำเร็จ: เครื่องหมายถูกวาดตัวเองในวงกลม" width="260"> | <img src="docs/assets/offline.svg" alt="ออฟไลน์: ปลั๊กพยายามเสียบเข้าเต้ารับ" width="260"> | <img src="docs/assets/upload.svg" alt="กำลังอัปโหลดไฟล์ พร้อมแถบความคืบหน้า" width="260"> |
| เขียวป่า · วาดเครื่องหมายถูก + ชีพจร | ส้มอิฐ · ยื่นเข้าหา + ลองใหม่ | ดำ + เหลืองอำพัน · แถบโหลด + เสร็จ |

แต่ละภาพเป็นไฟล์ SVG ไฟล์เดียว ขนาด 3–6 KB มีชุดสีสำหรับ dark mode ในตัว และรองรับการตั้งค่า `prefers-reduced-motion`

## Skills

| Skill | สถานะ | หน้าที่ |
|---|---|---|
| `theme-extract` | ✅ v0.1 | อ่าน design token ของโปรเจกต์ แล้วบันทึกเป็น `.svg-motion/theme.json` |
| `svg-motion` | ✅ v0.1 | หาจุดที่ motion ช่วยให้ UX ดีขึ้น แล้วสร้าง SVG เคลื่อนไหวที่เข้ากับธีม (loader, empty/error/success state, banner) ออกมาเป็น component |
| `design-lint` | ✅ v0.1 | ชี้จุดที่ทำให้เว็บดูเหมือน AI สร้าง (ไล่สีม่วง, กระจก, ก้อน blob, emoji แทนไอคอน) และเสนอทิศทางดีไซน์ที่มีเหตุผลรองรับ |
| `ui-audit` | ✅ v0.2 | สถานะของหน้า (UX states), ฟอร์ม, มือถือ, microcopy, contrast ตาม WCAG และ accessibility พื้นฐาน |
| `perf-audit` | ✅ v0.3 | รูปภาพ (AVIF/WebP, ขนาด), ฟอนต์ (รวมถึงการ subset ฟอนต์ไทย), การดึงข้อมูล, cache และ bundle |
| `security-audit` | ✅ v0.4 | secret รั่ว, จุดเสี่ยง XSS (รวมถึง SVG ที่ไม่ปลอดภัย), auth ฝั่ง client และ security header |
| `polish-audit` | ✅ v0.5 | การใช้ design system, สุขภาพโค้ด, i18n, meta/OG, หน้า 404/500 และ SEO พื้นฐาน |
| `audit` | 🗓 v1.0 | รันทุก audit แล้วรวมเป็นรายงานเดียวเรียงตามความสำคัญ และแก้ไขอย่างปลอดภัยพร้อม diff |

## การติดตั้ง

พิมพ์ใน Claude Code:

```text
/plugin marketplace add James-Chirawat/svg-motion-kit
/plugin install svg-motion-kit@svg-motion-kit
```

จากนั้นสั่งงานเป็นภาษาธรรมดาได้เลย เช่น *"ทำ loader ให้เข้าธีมหน่อย"* หรือ *"ใส่ภาพ empty state เคลื่อนไหวในหน้ารายการสั่งซื้อ"*

## หลักการ

SVG ทุกชิ้นที่สร้างต้อง:

- ใช้สีจาก token ของธีมหรือ `currentColor` ห้ามใส่โค้ดสีตายตัว ยกเว้นเป็นค่าสำรอง (fallback)
- รองรับ `prefers-reduced-motion` และไม่กะพริบเกิน 3 ครั้งต่อวินาที (WCAG 2.3.1)
- ขยับด้วย `transform` และ `opacity` เท่านั้น
- ใส่ attribute สำหรับการเข้าถึงให้ถูกต้อง ภาพตกแต่งใส่ `aria-hidden="true"` ส่วนภาพที่สื่อความหมายใส่ `role="img"` พร้อม `<title>`
- มีขนาดเล็ก (เป้าหมายไม่เกิน 15 KB) และไม่ต้องพึ่ง library ใดตอนรัน

script ที่แถมมาเป็น Node ล้วน (`.mjs`) ไม่มี dependency ไม่เชื่อมต่อ network และสั้นพอจะอ่านทั้งหมดได้ก่อนรัน

## Roadmap

- [x] **v0.0** วางโครง repo, ไฟล์ marketplace, ตัวอย่างใน README และไอคอน
- [x] **v0.1** Motion ที่ตรงธีม: `theme-extract` ✅, `svg-motion` (scout + วาด + วางลงโปรเจกต์), `design-lint`
- [x] **v0.2** UX และ accessibility: `ui-audit`, รูปแบบรายงานกลาง และสูตรสำหรับ Vue และ Svelte
- [x] **v0.3** Performance: `perf-audit`, ตรวจด้วย Lighthouse (ไม่บังคับ) และใช้ library motion เมื่อโปรเจกต์มีอยู่แล้ว
- [x] **v0.4** Security: `security-audit`
- [x] **v0.5** ความเป็นมืออาชีพ: `polish-audit`
- [ ] **v1.0** รายงานเดียว แก้ไขได้ปลอดภัย: ตัวรวม `audit`, โหมดแก้ไข, หน้า gallery และส่งเข้า plugin directory

รายละเอียด สิ่งที่ตรวจ และเกณฑ์ "เสร็จเมื่อ" ของทุกเวอร์ชันอยู่ใน **[docs/ROADMAP.th.md](docs/ROADMAP.th.md)**

## ดูตัวอย่างในเครื่อง

```bash
python3 -m http.server 8765 --directory docs
```

แล้วเปิด <http://127.0.0.1:8765/preview.html>

## ร่วมพัฒนา

ยินดีรับทั้ง issue และ pull request ดูรายละเอียดได้ที่ [CONTRIBUTING.md](CONTRIBUTING.md)

รันชุดทดสอบด้วยคำสั่งนี้ (ใช้ Node 18 ขึ้นไป ไม่ต้องติดตั้งอะไรเพิ่ม):

```bash
npm test
```

## License

[MIT](LICENSE)
