# Roadmap

<p><a href="ROADMAP.md">English</a> · <b>ภาษาไทย</b></p>

svg-motion-kit เริ่มจากงานเดียว คือทำ SVG เคลื่อนไหวที่เข้ากับธีมของโปรเจกต์ แล้วจะค่อย ๆ ขยายเป็นชุดเครื่องมือตรวจ frontend ที่ครอบคลุม UI, UX, accessibility, performance, security และความเป็นมืออาชีพ ทุกเวอร์ชันใช้งานได้ด้วยตัวเอง ไม่ต้องรอเวอร์ชันถัดไป

| เวอร์ชัน | ธีม | skill ใหม่ | สถานะ |
|---|---|---|---|
| [v0.1](#v01--motion-ที่ตรงธีม) | Motion ที่ตรงธีม | `theme-extract` ✅, `svg-motion` ✅, `design-lint` ✅ | ✅ ออกแล้ว 2026-11-27 |
| [v0.2](#v02--ux-และ-accessibility) | UX และ accessibility | `ui-audit` | ✅ ออกแล้ว 2026-11-27 |
| [v0.3](#v03--performance) | Performance | `perf-audit` | ✅ ออกแล้ว 2026-11-27 |
| [v0.4](#v04--security) | Security | `security-audit` | วางแผนไว้ |
| [v0.5](#v05--ความเป็นมืออาชีพ) | ความเป็นมืออาชีพ | `polish-audit` | วางแผนไว้ |
| [v1.0](#v10--รายงานเดียว-แก้ไขได้ปลอดภัย) | รายงานเดียว แก้ไขได้ปลอดภัย | `audit` (ตัวรวม) | วางแผนไว้ |

---

## หลักการ (ใช้กับทุกเวอร์ชัน)

1. **ทุกข้อต้องมีหลักฐาน ไม่ใช่ความรู้สึก** ทุก finding ต้องระบุไฟล์และบรรทัด และยกโค้ดที่เจอมาให้ดู การตรวจที่ทำแบบตายตัวได้ให้เขียนเป็น script ส่วน Claude ทำเฉพาะงานที่ต้องใช้วิจารณญาณ เช่น การเรียบเรียงคำ การจัดลำดับความสำคัญ และการเสนอทิศทางดีไซน์
2. **ค่าเริ่มต้นคืออ่านอย่างเดียว** การตรวจไม่แก้โค้ด การแก้ต้องให้ผู้ใช้เลือกเอง ทำทีละข้อ และแสดง diff ก่อนทุกครั้ง
3. **บอกขีดจำกัดตามจริง** การอ่านโค้ดวัดความเร็วโหลดจริงไม่ได้ และพิสูจน์ไม่ได้ว่าปลอดภัย รายงานต้องบอกว่าตรวจอะไรไปแล้วและอะไรยังไม่ได้ตรวจ และแนะนำเครื่องมือที่ต้องรันจริงเมื่อจำเป็น เช่น Lighthouse, PageSpeed Insights หรือ pentest
4. **ใช้รสนิยมของโปรเจกต์เอง** สี radius ฟอนต์ และ library animation มาจาก `theme.json` ถ้าโปรเจกต์เองยังดูเป็นแบบทั่วไป ให้เสนอทิศทางดีไซน์พร้อมเหตุผล แทนที่จะใช้หน้าตาเริ่มต้นแบบเดิม
5. **script ไม่มี dependency** เป็น Node 18 ขึ้นไป (`.mjs`) ล้วน ไม่ต้องติดตั้งอะไร ไม่ใช้ network เว้นแต่ผู้ใช้อนุญาต (เช่น `npm audit`) และสั้นพอจะอ่านจบก่อนรัน
6. **สองภาษาตั้งแต่ต้น** คำสั่งเรียกใช้ รายงาน และตัวอย่าง ใช้ได้ทั้งภาษาไทยและอังกฤษ

### รูปแบบ finding กลาง (เริ่มใช้ใน v0.2 และใช้กับทุก audit)

```json
{
  "id": "perf.image.format",
  "area": "ui | ux | a11y | svg | performance | security | polish",
  "severity": "high | medium | low",
  "effort": "S | M | L",
  "title": "PNG hero image could be AVIF/WebP",
  "file": "app/page.tsx",
  "line": 42,
  "evidence": "<img src=\"/hero.png\"> (1.8 MB)",
  "why": "Largest image on the page; slows Largest Contentful Paint.",
  "fix": "Use next/image with the source converted to AVIF/WebP.",
  "autofix": false
}
```

ระดับความรุนแรง:
- **high:** ผู้ใช้ทำต่อไม่ได้ หรือข้อมูลรั่ว เช่น หน้า checkout ไม่มี error state, มี secret อยู่ในโค้ดฝั่ง client หรือรูป LCP ขนาด 2 MB
- **medium:** ประสบการณ์แย่ลงจนสังเกตได้
- **low:** เรื่องเก็บรายละเอียด

รายงานเรียงตามความรุนแรงก่อน แล้วตามแรงที่ต้องใช้แก้ โดยข้อที่แก้ง่ายขึ้นก่อน

---

## v0.1 — Motion ที่ตรงธีม

**เป้าหมาย:** SVG เคลื่อนไหวที่ดูเป็นส่วนหนึ่งของโปรเจกต์*นี้*จริง ๆ วางในจุดที่ช่วยผู้ใช้ได้มากที่สุด และไม่ออกมาเป็นโทน "ม่วงแบบ AI"

### Skills

| Skill | หน้าที่ |
|---|---|
| `theme-extract` ✅ | อ่าน Tailwind v3/v4, CSS variables, shadcn/ui, dark mode, radius, ฟอนต์ และ library ที่ติดตั้งไว้ แล้วบันทึกเป็น `.svg-motion/theme.json` |
| `svg-motion` | **Scout:** หาจุดที่ motion ช่วยได้ (ดูตารางด้านล่าง) แล้วเสนอ 3–5 จุดที่คุ้มที่สุด **Draw:** สร้าง SVG จาก template โดยใช้สีตาม role ในธีม **Place:** เขียน component ตาม framework ของโปรเจกต์ และแสดง diff |
| `design-lint` | ชี้จุดที่ทำให้เว็บดูเหมือน AI สร้าง แล้วเสนอทิศทางดีไซน์ 3 แบบที่มีเหตุผลรองรับ |

### สัญญาณที่ scout ของ `svg-motion` มองหา

| สัญญาณในโค้ด | ภาพที่แนะนำ |
|---|---|
| `items.length === 0`, "No data", "ไม่พบข้อมูล" | empty state |
| `isLoading` ที่แสดงแค่ข้อความ "Loading…" | skeleton หรือ loader |
| `catch` หรือ `error &&` ที่แสดงแค่ข้อความ, `not-found.tsx`, `error.tsx` | error state |
| ส่งฟอร์มแล้วแค่ redirect หรือเรียก `alert()` | success feedback |
| `<input type="file">` | upload progress |
| แอปที่ใช้ข้อมูลเยอะแต่ไม่รองรับ `navigator.onLine` หรือสถานะ offline | offline state |
| การสมัครสมาชิกหรือ onboarding หลายขั้น | ภาพประกอบแต่ละขั้น |

จัดอันดับตาม **ความถี่ที่ผู้ใช้เจอ × ความสำคัญทางอารมณ์ของจังหวะนั้น** จุด error และจุดที่ต้องรอนานมาก่อนภาพ hero เสมอ

### สิ่งที่ `design-lint` ตรวจ (script: `lint-design.mjs`)

- **สี:** ไล่สีจาก indigo ไป violet หรือจากม่วงไปชมพู, ตัวอักษรไล่สี และเงาเรืองแสงสี
- **พื้นผิว:** glassmorphism (`backdrop-blur` กับพื้นขาวโปร่ง), hero ที่ใช้ก้อน blob และการ์ด `rounded-2xl shadow-lg` หน้าตาเหมือนกันเรียง 3 คอลัมน์
- **ของตกแต่ง:** emoji แทนไอคอน, ไอคอนประกาย ✨ และป้าย "New" ที่วางกลางเหนือ hero ทุกหน้า
- **ตัวอักษร:** ใช้ฟอนต์ตระกูลเดียว และไม่มีลำดับขนาดที่ชัดเจน
- **ผลลัพธ์:** คะแนนความ generic พร้อมหลักฐานระดับไฟล์และบรรทัด และทิศทางดีไซน์ 3 แบบที่อิงกลุ่มผู้ใช้และประเภทธุรกิจ เช่น เว็บมรดกสุโขทัยควรใช้โทนศิลาแลงและดินเผาแทนสีม่วง

### Template และสูตรสำหรับแต่ละ framework

- **Template:** banner เส้นวาดตัวเอง, loader, skeleton, empty state, error, success, offline, upload และ hero ทุกอันใช้สีจาก `var(--token, fallback)` หรือ `currentColor` เท่านั้น
- **สูตร (recipe):** React/Next (component แบบ TSX ใช้ `className` กับ `currentColor` สำหรับ Tailwind) และ HTML ธรรมดา (inline SVG หรือ `<img>`)
- **`validate-svg.mjs` ตรวจว่า:**
  - ไม่มีสี hardcode นอกค่า fallback
  - มี `prefers-reduced-motion`
  - animate เฉพาะ `transform` และ `opacity`
  - ใส่ `aria-*` และ `<title>` ถูกต้อง
  - ขนาดไม่เกิน 15 KB
  - ไม่มี `<script>`, event handler หรือการอ้างไฟล์ภายนอก

### งานอื่นใน v0.1

- ✅ เปลี่ยนตัวอย่าง 4 อันแรกใน README และไอคอนให้ออกจากโทน indigo/violet แล้ว (D2) ตอนนี้แบรนด์ของชุดเครื่องมือใช้สีกระดาษ หมึกดำ และแดงชาด และเปลี่ยน hero แบบ blob ออกแล้ว
- ✅ ตัดสินใจเรื่องชื่อ plugin แล้ว (D1) ใช้ชื่อ `svg-motion-kit` ต่อ และอธิบายใน README ว่าขั้นตอนการทำงานครอบคลุมอะไรบ้าง
- ติดตั้ง plugin ผ่าน marketplace แบบเดียวกับผู้ใช้จริง แล้วทดสอบกับโปรเจกต์ใน `examples/` ทั้ง 4 และโปรเจกต์จริงอย่างน้อย 2 โปรเจกต์
- ชุด eval (`claude plugin eval`) สำหรับเช็คว่า skill ถูกเรียกใช้ถูกตัว ทั้งภาษาไทยและอังกฤษ

### เสร็จเมื่อ

- ใน `examples/next-tailwind` และ `examples/plain-html`:
  - scout เจอจุด empty, loading และ error ที่ฝังไว้
  - SVG ที่สร้างผ่าน `validate-svg.mjs`
  - SVG เปลี่ยนสีตามโหมดสว่างและมืด
- `design-lint` จับโปรเจกต์ตัวอย่างที่ตั้งใจทำให้ generic (`examples/generic-ai/` ที่จะเพิ่มใหม่) ได้ และไม่แจ้งเตือนกับ `examples/plain-html`
- `claude plugin validate` และ `npm test` ผ่าน และติด tag v0.1.0 พร้อม release notes

---

## v0.2 — UX และ accessibility

**เป้าหมาย:** รายงานที่บอกนักพัฒนาว่าจังหวะไหนของผู้ใช้ที่พังหรือขาดหายไป และ accessibility พื้นฐานข้อไหนไม่ผ่าน โดยเรียงตามความสำคัญ

### สิ่งที่ `ui-audit` ตรวจ

| ด้าน | ตรวจอะไร | วิธี |
|---|---|---|
| UX: สถานะ | ทุก component ที่ดึงข้อมูลต้องรองรับ loading, empty, error และ success | `scan-states.mjs` หา fetch, SWR, React Query และ await ใน server component แล้วตรวจว่ามีแต่ละ branch ครบไหม |
| UX: ฟอร์ม | input มี label, ข้อความ error แสดงข้างช่องที่ผิด, กดส่งแล้วมี feedback | อ่านจากโค้ด |
| UX: มือถือ | ปุ่มกดใหญ่อย่างน้อย 44 px (เตือนเมื่อปุ่มใช้ `h-8` หรือ `p-1`), ไม่มี action ที่ใช้ได้เฉพาะตอน hover | ตรวจ class ของ Tailwind |
| UX: ข้อความ | microcopy ที่กำกวม เช่น "Error", "Something went wrong" หรือ "เกิดข้อผิดพลาด" ที่ไม่บอกว่าต้องทำอะไรต่อ | Claude อ่านข้อความทั้งหมดที่รวบรวมมา |
| A11y: contrast | contrast ระดับ AA ตาม WCAG ของทุกคู่สีตัวอักษรกับพื้นหลัง ทั้งโหมดสว่างและมืด | `contrast.mjs` คำนวณจากค่า hex ใน `theme.json` |
| A11y: semantics | `<img>` ไม่มี `alt`, ปุ่มที่มีแต่ไอคอนแต่ไม่มี label, `onClick` บน `div`, `outline: none` ที่ไม่มีสไตล์ focus มาแทน | อ่านจากโค้ด |
| A11y: motion | animation ที่ไม่รองรับ `prefers-reduced-motion` | ตรวจ CSS และ library animation |

### งานอื่นใน v0.2

- รูปแบบ finding กลาง และรายงาน `.svg-motion/audit.md` / `audit.json`
- สูตรของ `svg-motion` สำหรับ Vue (SFC) และ Svelte
- โปรเจกต์ตัวอย่าง `examples/ux-gaps/` ที่จงใจให้ขาดสถานะ มี input ไม่มี label และมี contrast ต่ำ

### เสร็จเมื่อ

- `ui-audit` เจอปัญหาที่ฝังไว้ใน `examples/ux-gaps/` ครบทุกข้อ และระบุไฟล์และบรรทัดถูกต้อง
- ไม่แจ้งเตือนผิดระดับ high กับตัวอย่างอื่น
- ทุก finding ที่ `svg-motion` แก้ได้ มีลิงก์ไปหา `svg-motion`

---

## v0.3 — Performance

**เป้าหมาย:** หาปัญหา performance ฝั่ง frontend ที่มองเห็นได้จากโค้ด และบอกให้ชัดว่าข้อไหนต้องวัดตอนรันจริง

### สิ่งที่ `perf-audit` ตรวจ

**รูปภาพ**
- PNG/JPEG ที่ควรเป็น AVIF หรือ WebP และไฟล์ที่ใหญ่เกิน 200 KB
- ใช้ `<img>` แทน `next/image` (ในโปรเจกต์ Next)
- ไม่ระบุ `width` หรือ `height` ทำให้หน้าเลื่อน
- รูป LCP ไม่ใส่ `priority` และรูปที่อยู่ใต้ส่วนแรกของหน้าไม่ได้ lazy load

**ฟอนต์**
- ไม่ใช้ `next/font` หรือ `font-display: swap`
- **ฟอนต์ไทยที่โหลดทุก weight โดยไม่ subset** มักใหญ่เกิน 300 KB ต่อไฟล์
- ใช้ฟอนต์หลายตระกูลเกินไป

**การดึงข้อมูล**
- `await` ที่เรียงกันทั้งที่รันพร้อมกันได้ (ควรใช้ `Promise.all`)
- `useEffect` ที่ fetch โดยไม่มี cache (ควรใช้ Server Components, SWR หรือ React Query)
- request ในลูป (N+1) และ list ที่ไม่มี pagination
- ดึงข้อมูลทั้ง record ทั้งที่ใช้ไม่กี่ field
- ไม่ยกเลิก request ด้วย `AbortController` ตอน component ถูกถอดออก

**Caching (Next)**
- `fetch` ที่ไม่ได้ตั้ง `revalidate` หรือ cache policy
- ใช้ `cache: "no-store"` ทุกที่
- เรียก `cookies()` หรือ `headers()` โดยไม่จำเป็น จนทั้งหน้าถูกบังคับให้ render แบบ dynamic

**Bundle**
- import library หนัก (moment, lodash ทั้งก้อน, library กราฟหรือแผนที่) ตั้งแต่โหลดแรก
- ไม่ใช้ `dynamic()` กับ component หนักที่ทำงานเฉพาะฝั่ง client
- วาง `"use client"` ไว้ระดับ layout

**การ render**
- list ที่ไม่มี `key` ที่คงที่
- list ยาวมากที่ไม่ใช้ virtualization
- context provider ที่ทำให้ทั้ง tree render ใหม่

**Script ภายนอก**
- `<script>` ที่ไม่ใช้ strategy ของ `next/script`
- analytics ที่โหลดก่อนเนื้อหา

**SVG และ motion**
- SVG ขนาดใหญ่ที่ inline ซ้ำในหลายหน้า (ควรทำเป็น sprite)
- SVG ที่ยังไม่ผ่าน svgo
- ใช้ Lottie ในงานที่ CSS ทำได้
- animate property ที่กระทบ layout

### งานอื่นใน v0.3

- รอบตรวจตอนรันจริง (ไม่บังคับ): ถ้าผู้ใช้อนุญาตและมี Lighthouse ให้รันกับ URL ในเครื่อง แล้วรวมค่า Core Web Vitals เข้ารายงาน
- `svg-motion` ใช้ framer-motion, motion หรือ GSAP เมื่อโปรเจกต์มีอยู่แล้ว
- `svg-motion` render แล้วตรวจงานตัวเอง: render SVG ในเบราว์เซอร์ ดูภาพ แล้วแก้ 1 รอบ
- โปรเจกต์ตัวอย่าง `examples/slow-next/`

### เสร็จเมื่อ

- เจอปัญหาที่ฝังไว้ใน `examples/slow-next/` ครบทุกข้อ
- finding เรื่องรูปภาพบอกขนาดและ format ปัจจุบันด้วย
- รายงานแยก "เจอจากโค้ด" ออกจาก "ต้องวัดตอนรันจริง" ชัดเจน

---

## v0.4 — Security

**เป้าหมาย:** จับความผิดพลาดด้าน security ฝั่ง frontend ที่ทำให้ secret รั่วหรือเปิดช่อง XSS โดยไม่อ้างว่าเป็นการตรวจ security เต็มรูปแบบ

### สิ่งที่ `security-audit` ตรวจ

**Secret**
- API key และ token ในโค้ด (ตรวจจากรูปแบบ key ที่รู้จัก)
- secret ในตัวแปร `NEXT_PUBLIC_*` หรือ `VITE_*`
- ไฟล์ `.env` ที่ถูก commit

**จุดเสี่ยง XSS**
- `dangerouslySetInnerHTML`, `v-html`, `innerHTML`, `eval` และ `new Function` ที่รับข้อมูลจากผู้ใช้หรือจากภายนอก
- **SVG ที่ผู้ใช้อัปโหลดแล้วนำมาแสดงโดยไม่ sanitize** (SVG ฝัง script ได้)

**Auth ฝั่ง client**
- เก็บ token ใน `localStorage`
- ตัดสินสิทธิ์เฉพาะในโค้ดฝั่ง client

**ขอบเขตฝั่ง server (Next)**
- server action และ API route ที่ไม่ตรวจ session
- open redirect จาก query parameter

**Header**
- ไม่มี CSP, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy` และ `Permissions-Policy` ใน `next.config`, `vercel.json` หรือ middleware

**Build**
- source map เปิดให้ดูได้บน production
- flag สำหรับ debug ที่ยังเปิดค้างไว้

**Dependency**
- `npm audit` (รันเฉพาะเมื่อผู้ใช้อนุญาต เพราะต้องใช้ network)

### เสร็จเมื่อ

- รายงานปัญหาใน `examples/leaky/` ครบทุกข้อ
- secret ที่เจอแสดงแบบปิดบังค่า
- ต้นรายงานบอกชัดว่า audit นี้ไม่ครอบคลุมอะไรบ้าง

---

## v0.5 — ความเป็นมืออาชีพ

**เป้าหมาย:** รายละเอียดที่แยกเว็บมืออาชีพออกจากเว็บต้นแบบ

### สิ่งที่ `polish-audit` ตรวจ

- **การใช้ design system:**
  - สีและ spacing ที่ hardcode เทียบกับการใช้ token จาก `theme.json`
  - component ที่เกือบซ้ำกัน
  - สไตล์ปุ่มและ input ที่ไม่สม่ำเสมอ
- **สุขภาพโค้ด:** จำนวน `any` และ `@ts-ignore` ใน TypeScript, การไม่มี lint config และ component ที่ไม่มีใครใช้
- **i18n:**
  - ข้อความไทยหรืออังกฤษที่ hardcode ใน component (เมื่อโปรเจกต์ใช้ระบบ i18n)
  - รูปแบบวันที่และตัวเลขที่ปนกัน
- **Meta และการแชร์:**
  - `<title>` และ description ของทุกหน้า
  - รูป Open Graph และ Twitter
  - favicon และไอคอนแอป
  - attribute `lang`
- **หน้าพิเศษ:** หน้า 404 และ 500 ที่ออกแบบไว้, หน้าปิดปรับปรุง และหน้าออฟไลน์
- **SEO พื้นฐาน:** `robots.txt`, `sitemap.xml`, canonical URL และลำดับ heading

### เสร็จเมื่อ

- รันกับทุกตัวอย่างแล้วไม่มีการแจ้งเตือนผิดระดับ high
- ทุก finding มีวิธีแก้ที่ทำได้จริง

---

## v1.0 — รายงานเดียว แก้ไขได้ปลอดภัย

**เป้าหมาย:** สั่งคำสั่งเดียวแล้วได้ภาพรวมของ frontend ทั้งหมดเรียงตามความสำคัญ และการแก้ไขทำได้อย่างปลอดภัย

- **ตัวรวม `audit`:**
  - รัน audit ที่เลือก (ค่าเริ่มต้นคือทั้งหมด) แล้วรวม finding และตัดข้อที่ซ้ำ
  - เขียนเป็น `audit.md` ไฟล์เดียว พร้อมคะแนนแยกตามด้าน และ 10 สิ่งที่ควรทำก่อน
- **โหมดแก้ไข:**
  - ผู้ใช้เลือก finding ที่จะแก้ แล้ว Claude แก้ทีละข้อ แสดง diff ทุกข้อ รันการตรวจข้อนั้นซ้ำ และหยุดทันทีถ้าไม่ผ่าน
  - วิธีแก้มาจากคู่มือของแต่ละ audit เช่น แปลงรูป, เพิ่ม empty state ที่ขาดด้วย `svg-motion` หรือเพิ่ม header
- **คุณภาพก่อนออกจริง:**
  - ชุด eval ครบ และ GitHub Action ที่รัน `npm test` กับ `claude plugin validate`
  - หน้า gallery บน GitHub Pages ที่รวมทุก template ในหลายธีม
  - ส่ง plugin เข้า plugin directory

### เสร็จเมื่อ

ผู้ใช้ครั้งแรกติดตั้ง plugin แล้วพิมพ์คำสั่งเดียว (ไทยหรืออังกฤษ) ก็ได้รายงานที่เรียงลำดับความสำคัญของโปรเจกต์จริงภายในไม่กี่นาที และแก้ได้ด้วย diff ที่อ่านเข้าใจ

---

## สิ่งที่ตัดสินใจแล้ว

| ID | เรื่อง | ผล |
|---|---|---|
| D1 | **ชื่อ plugin** | **ใช้ `svg-motion-kit` ต่อ** โดยหัวข้อ "ขั้นตอนการทำงานครอบคลุมอะไรบ้าง" ใน README อธิบายว่าชุดเครื่องมือนี้ทำได้มากกว่า SVG (ธีม, สำรวจ, ดูหน้าตา, วาด, ตรวจ, รายงานและแก้) |
| D2 | **ทำตัวอย่างชุดแรกและไอคอนใหม่** | **ทำแล้ว** แบรนด์ใช้สีกระดาษ หมึกดำ และแดงชาด ในสไตล์โต๊ะเขียนแบบ (ตารางจุด, เส้น bezier พร้อม handle) ส่วน loader และ empty state ใช้ชุดสีของตัวเอง เปลี่ยน hero แบบ blob เป็นหน้าเว็บที่ประกอบตัวเองขึ้นมา และไม่มีประกายดาวหรือเอฟเฟกต์กระจกแล้ว |
| D3 | **ที่เก็บรายงาน** | **`.svg-motion/`** ตาม D1 ตอนนี้มี `theme.json` และตั้งแต่ v0.2 จะมี `audit.md` กับ `audit.json` |

## นอกขอบเขต

- Performance ของ backend และฐานข้อมูล, infrastructure และ load testing
- Penetration test หรือการตรวจ compliance (PCI, SOC 2, PDPA) เพราะ security audit ในที่นี้เป็นแค่ checklist ระดับโค้ด
- การสร้างทั้งหน้าเว็บ หรือ design system ใหม่ตั้งแต่ศูนย์
