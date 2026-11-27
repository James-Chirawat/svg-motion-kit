<p align="center">
  <img src="docs/assets/banner.svg" alt="svg-motion-kit — SVG เคลื่อนไหวที่เข้ากับธีมของโปรเจกต์" width="840">
</p>

<p align="center">
  ชุด Claude skills ที่อ่านธีมจากโปรเจกต์ของคุณ ช่วยวิเคราะห์ UI/UX<br>
  แล้ววาด SVG เคลื่อนไหวลงหน้าเว็บได้ทันที
</p>

<p align="center">
  <a href="README.md">English</a> · <b>ภาษาไทย</b>
</p>

> [!NOTE]
> **อยู่ระหว่างพัฒนา** ตอนนี้ยังติดตั้งใช้งานไม่ได้ กด Watch หรือ Star ไว้เพื่อติดตามเวอร์ชัน v0.1 ได้ครับ

## ทำไมต้องใช้

skill ด้านดีไซน์ส่วนใหญ่แค่ให้คำแนะนำ แต่ skill ชุดนี้ลงมือสร้างชิ้นงานให้เลย

1. **อ่านธีมจากโค้ด** รองรับ Tailwind v3/v4, CSS variables, token ของ shadcn, ฟอนต์ และ dark mode
2. **วาด SVG ด้วย token ของโปรเจกต์** ใช้ `var(--primary)` และ `currentColor` ไม่ใส่โค้ดสีตายตัว จึงรองรับ dark mode ไปด้วยในตัว
3. **ทำ animation ด้วยเครื่องมือที่โปรเจกต์ใช้อยู่แล้ว** ปกติใช้ CSS `@keyframes` ธรรมดา จะใช้ framer-motion หรือ GSAP ก็ต่อเมื่อมีใน `package.json` อยู่แล้ว และไม่ติดตั้งอะไรเพิ่มโดยไม่ถามก่อน
4. **วางลงโปรเจกต์เป็น component** ตาม framework ที่ใช้ และแสดง diff ให้ดูก่อนเขียนไฟล์ทุกครั้ง

## ตัวอย่าง

| Loader | Empty state | Hero |
|:---:|:---:|:---:|
| <img src="docs/assets/loader.svg" alt="ตัวโหลดแบบวงกลมหมุนและ skeleton" width="260"> | <img src="docs/assets/empty-state.svg" alt="หน้าว่างที่มีกล่องลอยขึ้นลง" width="260"> | <img src="docs/assets/hero-blob.svg" alt="ก้อนสีไล่เฉดรอบการ์ด UI ที่ลอยอยู่" width="260"> |
| วงหมุน + แสงวิ่ง | ลอย + โผล่ | blob เปลี่ยนรูป |

**ท่าเดิม ธีมไหนก็ได้** สามภาพนี้ใช้ชุดสีต่างกันสามแบบ เพื่อให้เห็นว่าผลลัพธ์จะเข้ากับธีมของโปรเจกต์*คุณ* ไม่ใช่โทนม่วงแบบที่ AI ชอบใช้

| บันทึกสำเร็จ | ออฟไลน์ | อัปโหลด |
|:---:|:---:|:---:|
| <img src="docs/assets/success.svg" alt="บันทึกสำเร็จ: เครื่องหมายถูกวาดตัวเองในวงกลม" width="260"> | <img src="docs/assets/offline.svg" alt="ออฟไลน์: ปลั๊กพยายามเสียบเข้าเต้ารับ" width="260"> | <img src="docs/assets/upload.svg" alt="กำลังอัปโหลดไฟล์ พร้อมแถบความคืบหน้า" width="260"> |
| เขียวป่า · วาดเครื่องหมายถูก + ชีพจร | ส้มอิฐ · ยื่นเข้าหา + ลองใหม่ | ดำ + เหลืองอำพัน · แถบโหลด + เสร็จ |

แต่ละภาพเป็นไฟล์ SVG ไฟล์เดียว ขนาด 3–6 KB มีชุดสีสำหรับ dark mode ในตัว และรองรับการตั้งค่า `prefers-reduced-motion`

## Skills

| Skill | สถานะ | หน้าที่ |
|---|---|---|
| `theme-extract` | ✅ v0.1 (ยังไม่ออกเวอร์ชัน) | อ่าน design token ของโปรเจกต์ แล้วบันทึกเป็น `.svg-motion/theme.json` |
| `svg-motion` | 🚧 v0.1 | สร้าง SVG เคลื่อนไหวที่เข้ากับธีม (เส้นวาดตัวเอง, loader, empty state, ภาพ hero) ออกมาเป็น component |
| `ui-audit` | 🗓 v0.2 | วิเคราะห์ UI/UX (หลักการใช้งาน, contrast ตาม WCAG, สถานะต่าง ๆ ของหน้า) และแนะนำจุดที่ควรใส่ motion |

## การติดตั้ง (เมื่อออก v0.1 แล้ว)

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

- [x] **v0.0** วางโครง repo, ไฟล์ marketplace และตัวอย่างใน README
- [ ] **v0.1** `theme-extract` และ `svg-motion` สำหรับ React/Next + Tailwind และ HTML ธรรมดา
- [ ] **v0.2** `ui-audit`
- [ ] **v0.3** รองรับ Vue และ Svelte, ใช้ framer-motion หรือ GSAP เมื่อโปรเจกต์มีอยู่แล้ว, ให้ AI render แล้วตรวจงานตัวเอง และทำหน้า gallery บน GitHub Pages

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
