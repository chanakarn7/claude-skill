Direction: Banknote

# UX/UI Design — Expense Tracker (แอปบันทึกรายรับรายจ่ายส่วนตัว)

Version 1.0 · 2026-10-09 · Stage 3 (design) · Inputs: `docs/PRD.md` (A1–A9 applied), `docs/SA_BLUEPRINT.md`, `docs/contracts/modules.d.ts`, `docs/STACK.md`, `docs/IDEA.md`, `docs/DESIGN_OPTIONS.md` (`Chosen: Banknote`).
Stack reminder: Vite + React 19 + TypeScript, Tailwind v4 (`@tailwindcss/vite`), shadcn/ui in `src/components/ui`, lucide-react, `@fontsource` fonts, tokens as CSS variables in `src/index.css`.

## Table of contents
| Section | Lines |
|---|---|
| 1. Direction | 23–28 |
| 2. Design tokens | 30–111 |
| Contrast pairs | 113–167 |
| 3. Icons | 169–208 |
| 4. Components | 210–253 |
| 5. Screens | 255–365 |
| 6. Charts | 367–374 |
| 7. Interaction & motion | 376–385 |
| 8. Accessibility checklist | 387–401 |
| 9. Demo data needs | 403–411 |
| 10. Look & feel map | 413–429 |

## 1. Direction
**Banknote (ธนบัตร).** Bottle-green ink on warm paper with a marigold seal. It is calm and trustworthy like a well-kept passbook and warm enough to open every day. Money is the hero, so every figure uses one strong display face (Prompt) and everything else steps back.

- **Why it fits:** a single Thai user logs money on a phone several times a day (PRD §1). The app has to feel trustworthy (money), quick (thumb-friendly form) and calm when the month is in the red. A single green hue keeps the US-11 bars color-blind-safe. A warm paper surface and the marigold accent keep it from feeling like a cold bank app. Alternatives were Night Market (neon, per-category colors) and Plain Ledger (dense navy table); see `docs/DESIGN_OPTIONS.md`.
- **Signature element: the Banknote slab.** The month balance sits in a solid bottle-green card (`--slab`) with a 1 px inset frame (`--slab-frame`, 8 px inset, decorative) and a 40 px round marigold **฿ seal** (`--seal`) in its top-right corner, like the face of a banknote. A negative balance turns the slab brick red (`--slab-negative`) and adds a marigold "ติดลบ" badge, so the "−" sign is not the only cue. The marigold add button (FAB) repeats the seal on every mobile page.
- **Wordmark:** the 28 px seal (marigold circle, ink "฿") + "รายรับรายจ่าย" in Prompt 600 18 px. The favicon is the seal as an inline SVG file in `public/`.

## 2. Design tokens
All colors are CSS variables in `src/index.css` (`:root` = light, `.dark` = dark), exposed to Tailwind v4 through `@theme inline` (e.g. `--color-primary: var(--primary)`). Components use token utilities (`bg-primary`, `text-muted-foreground`), **never raw hex and never `dark:` color utilities**, so one token change re-themes everything.

### 2.1 Color: shadcn semantic tokens
| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | #FAF7F0 | #101613 | page (paper / night) |
| `--foreground` | #1C1B18 | #ECE8DD | body text (ink), expense amounts |
| `--card` / `--popover` | #FFFFFF | #18201C | cards, sheet, dialog, select menu, toast |
| `--card-foreground` / `--popover-foreground` | #1C1B18 | #ECE8DD | text on cards |
| `--primary` | #1E5A43 | #6FCF9F | primary buttons, selected chips, links, bars |
| `--primary-foreground` | #FFFFFF | #0B1F15 | label on primary |
| `--secondary` / `--muted` / `--accent` | #F2EDE1 | #202A25 | chips, icon tiles, ghost hover, skeletons |
| `--secondary-foreground` / `--accent-foreground` | #1C1B18 | #ECE8DD | text on those |
| `--muted-foreground` | #5F5A4E | #A9A596 | secondary text, captions, day headings, counters |
| `--destructive` | #B3261E | #FF8A80 | error text, delete button fill |
| `--destructive-foreground` | #FFFFFF | #1C1B18 | label on delete button |
| `--border` | #E3DCCB | #2E3A34 | dividers, card outlines (decorative) |
| `--input` | #8C8472 | #7D8A82 | input/select/textarea borders (≥3:1) |
| `--ring` | #1E5A43 | #F2B53A | focus ring, 2 px + 2 px offset |

### 2.2 Color: app tokens
| Token | Light | Dark | Use |
|---|---|---|---|
| `--slab` | #1E5A43 | #1D4D3B | Banknote slab (balance ≥ 0) |
| `--slab-foreground` | #FFFFFF | #FFFFFF | balance figure |
| `--slab-muted` | #CFE3D8 | #CFE3D8 | "ยอดคงเหลือ" label, month caption on slab |
| `--slab-frame` | #4A8268 | #3F7A61 | 1 px inset frame (decorative only) |
| `--slab-negative` | #7A2318 | #7A2318 | slab when balance < 0 |
| `--slab-negative-muted` | #F3D4CC | #F3D4CC | label on negative slab |
| `--seal` | #F2B53A | #F2B53A | ฿ seal, FAB fill, "ติดลบ" badge fill |
| `--seal-foreground` | #1C1B18 | #1C1B18 | glyph/icon on seal and FAB |
| `--income` | #2E6B34 | #7FD99A | income amounts (+ sign is always present) |
| `--bar` | #1E5A43 | #6FCF9F | US-11 bar fill |
| `--bar-track` | #E9E2D2 | #2A3530 | US-11 bar track |
| `--nav-active` | #E3EFE8 | #1F3A2E | active bottom-nav / top-nav pill |
| `--warning` | #FCEFCB | #3A2E10 | storage banner background |
| `--warning-foreground` | #5C3D00 | #FCE3A6 | storage banner text and icon |
| `--warning-border` | #E0B85A | #6B5520 | storage banner border (decorative) |

Expense amounts use `--foreground`. Expense never uses red: red means "error" or "negative balance" only.

### 2.3 Theme
- Three preferences: `light`, `dark`, `system` (default), stored in `expense-tracker:theme` (`loadThemePreference` / `applyThemePreference`).
- `applyThemePreference` resolves `system` with `matchMedia('(prefers-color-scheme: dark)')`, toggles the `dark` class on `<html>`, sets `color-scheme`, and listens for OS changes while on `system`. It runs in `src/main.tsx` **before** `createRoot().render` (the CSP forbids inline scripts in `index.html`).
- To avoid a light flash before JS: `src/index.css` also copies the dark token block into `@media (prefers-color-scheme: dark) { :root:not(.light) { … } }`. `applyThemePreference('light')` adds `light` to `<html>` so an explicit light choice wins over the media query.
- Tailwind v4 dark variant: `@custom-variant dark (&:where(.dark, .dark *));` (used only by shadcn internals; app code uses tokens).
- **Visible toggle** in the app shell header on every page (see §4 ThemeToggle).

### 2.4 Typography
Fonts are self-hosted via `@fontsource`, imported in `src/main.tsx` (Thai + Latin subsets only, 3 weight files total):
```ts
import '@fontsource/sarabun/thai-400.css';
import '@fontsource/sarabun/latin-400.css';
import '@fontsource/prompt/thai-500.css';
import '@fontsource/prompt/latin-500.css';
import '@fontsource/prompt/thai-600.css';
import '@fontsource/prompt/latin-600.css';
```
Both families contain the Thai block (incl. ฿ U+0E3F, vowels and tone marks), Latin and Arabic digits. `font-display: swap` (fontsource default).
`@theme`: `--font-sans: "Sarabun", "Noto Sans Thai", system-ui, sans-serif;` `--font-display: "Prompt", "Sarabun", system-ui, sans-serif;`. Body uses `font-sans`. Headings, buttons, labels and **every money figure** use `font-display`. Money also gets `tabular-nums` and `whitespace-nowrap`, with right alignment in rows.

| Style | Family / weight | Mobile size / line-height | ≥1024 px | Used for |
|---|---|---|---|---|
| balance | Prompt 600 | `clamp(28px, 9vw, 40px)` / 1.2 | 48 / 56 | balance figure on slab |
| amount-input | Prompt 600 | 36 / 44 | 36 / 44 | amount field in form |
| total | Prompt 600 | 20 / 28 | 22 / 30 | income/expense totals, filter total |
| h1 | Prompt 600 | 22 / 30 | 26 / 34 | page title, form title, month label (20/28) |
| h2 | Prompt 500 | 18 / 26 | 18 / 26 | card headings |
| label | Prompt 500 | 16 / 24 | 16 / 24 | buttons, row category, chip text (14/20), field labels |
| row-amount | Prompt 500 | 16 / 24 | 16 / 24 | amounts in rows and breakdown |
| body | Sarabun 400 | 16 / 26 | 16 / 26 | body copy, inputs, messages |
| caption | Sarabun 400 | 14 / 22 | 14 / 22 | notes in rows, day headings, counters, errors, privacy note |

Thai text needs room above and below for vowels and tone marks: never set Thai line-height below 1.3, and never clip text vertically (`overflow-hidden` with a fixed height). Minimum text size is 14 px.

### 2.5 Spacing, layout, radius, elevation
- **Spacing:** 4 px base (Tailwind default scale). Page gutter 16 px (<640), 24 px (640–1023), 32 px (≥1024). Section gap 24 px mobile, 32 px desktop. Card padding 16 px mobile, 20 px desktop. Slab padding 24 px.
- **Breakpoints:** mobile <640 (bottom nav + FAB + Sheet form); tablet 640–1023 (top bar with nav + "เพิ่มรายการ" button, single column max 640 px centered, Dialog form); desktop ≥1024 (same top bar, 2-column home, content max 1040 px).
- **Touch targets:** every interactive element ≥ 44×44 px (`h-11 min-w-11`), rows ≥ 56 px.
- **Radius:** `--radius: 14px` (shadcn base: cards). `sm` 8 px (badges, bar ends `rounded-full`), `md` 10 px (inputs, buttons), `lg` 14 px (cards, dialog), `xl` 20 px (slab, sheet top corners), `full` (chips, seal, FAB, nav pills).
- **Elevation (light):** card `0 1px 2px rgba(28,27,24,0.06)` + 1 px `--border`; slab `0 12px 24px -12px rgba(30,90,67,0.55)`; FAB `0 6px 16px -4px rgba(28,27,24,0.35)`; sheet/dialog `0 -8px 32px rgba(28,27,24,0.18)`. **Dark:** no card shadows (border only); FAB and overlays keep their shadow at 0.6 alpha black. Overlay scrim: `rgba(16,22,19,0.55)`.

## Contrast pairs
Computed with the WCAG 2.1 relative-luminance formula (`docs/pipeline/templates/check-design.mjs` verifies every line). Disabled controls use 50% opacity and are exempt (WCAG 1.4.3).
- body text: #1C1B18 on #FAF7F0 (light) = 16.10:1
- body text on card: #1C1B18 on #FFFFFF (light) = 17.22:1
- muted text: #5F5A4E on #FAF7F0 (light) = 6.42:1
- muted text on card: #5F5A4E on #FFFFFF (light) = 6.86:1
- muted text on chip: #5F5A4E on #F2EDE1 (light) = 5.88:1
- chip and ghost-hover text: #1C1B18 on #F2EDE1 (light) = 14.74:1
- primary button label: #FFFFFF on #1E5A43 (light) = 8.08:1
- link and primary text: #1E5A43 on #FAF7F0 (light) = 7.55:1
- link on card: #1E5A43 on #FFFFFF (light) = 8.08:1
- active nav: #1E5A43 on #E3EFE8 (light) = 6.84:1
- balance figure: #FFFFFF on #1E5A43 (light) = 8.08:1
- slab label: #CFE3D8 on #1E5A43 (light) = 6.02:1
- seal and FAB icon: #1C1B18 on #F2B53A (light) = 9.39:1
- seal on slab: #F2B53A on #1E5A43 (light) = 4.40:1 ui
- negative balance figure: #FFFFFF on #7A2318 (light) = 10.09:1
- negative slab label: #F3D4CC on #7A2318 (light) = 7.26:1
- negative badge on slab: #F2B53A on #7A2318 (light) = 5.50:1 ui
- income amount: #2E6B34 on #FFFFFF (light) = 6.42:1
- error text in form: #B3261E on #FFFFFF (light) = 6.54:1
- error text on page: #B3261E on #FAF7F0 (light) = 6.11:1
- delete button label: #FFFFFF on #B3261E (light) = 6.54:1
- storage banner: #5C3D00 on #FCEFCB (light) = 8.64:1
- input border in form: #8C8472 on #FFFFFF (light) = 3.71:1 ui
- input border on page: #8C8472 on #FAF7F0 (light) = 3.47:1 ui
- focus ring on page: #1E5A43 on #FAF7F0 (light) = 7.55:1 ui
- focus ring on card: #1E5A43 on #FFFFFF (light) = 8.08:1 ui
- bar fill on track: #1E5A43 on #E9E2D2 (light) = 6.26:1 ui
- body text: #ECE8DD on #101613 (dark) = 14.97:1
- body text on card: #ECE8DD on #18201C (dark) = 13.59:1
- muted text: #A9A596 on #101613 (dark) = 7.42:1
- muted text on card: #A9A596 on #18201C (dark) = 6.74:1
- muted text on chip: #A9A596 on #202A25 (dark) = 6.00:1
- chip and ghost-hover text: #ECE8DD on #202A25 (dark) = 12.09:1
- primary button label: #0B1F15 on #6FCF9F (dark) = 9.09:1
- link and primary text: #6FCF9F on #101613 (dark) = 9.69:1
- link on card: #6FCF9F on #18201C (dark) = 8.80:1
- active nav: #6FCF9F on #1F3A2E (dark) = 6.52:1
- balance figure: #FFFFFF on #1D4D3B (dark) = 9.65:1
- slab label: #CFE3D8 on #1D4D3B (dark) = 7.18:1
- seal and FAB icon: #1C1B18 on #F2B53A (dark) = 9.39:1
- seal on slab: #F2B53A on #1D4D3B (dark) = 5.26:1 ui
- negative balance figure: #FFFFFF on #7A2318 (dark) = 10.09:1
- negative slab label: #F3D4CC on #7A2318 (dark) = 7.26:1
- income amount: #7FD99A on #18201C (dark) = 9.74:1
- error text in form: #FF8A80 on #18201C (dark) = 7.29:1
- error text on page: #FF8A80 on #101613 (dark) = 8.03:1
- delete button label: #1C1B18 on #FF8A80 (dark) = 7.54:1
- storage banner: #FCE3A6 on #3A2E10 (dark) = 10.57:1
- input border in form: #7D8A82 on #18201C (dark) = 4.62:1 ui
- input border on page: #7D8A82 on #101613 (dark) = 5.09:1 ui
- focus ring on page: #F2B53A on #101613 (dark) = 9.99:1 ui
- focus ring on card: #F2B53A on #18201C (dark) = 9.07:1 ui
- bar fill on track: #6FCF9F on #2A3530 (dark) = 6.73:1 ui

## 3. Icons
One family: **lucide-react** (tree-shaken named imports). Default size 20 px, stroke 2, `aria-hidden="true"` whenever a text label sits next to the icon; icon-only buttons carry `aria-label`. No emoji anywhere in the UI chrome or as status markers (user notes may contain emoji; they are shown as text).

| Where | Item | lucide icon |
|---|---|---|
| Nav | หน้าแรก | `House` |
| Nav | รายการ | `List` |
| Primary action | เพิ่มรายการ (FAB, header button, empty state) | `Plus` |
| Month switcher | เดือนก่อน / เดือนถัดไป | `ChevronLeft` / `ChevronRight` |
| Month switcher | เดือนนี้ | `CalendarDays` |
| Theme toggle | สว่าง / มืด / ตามระบบ | `Sun` / `Moon` / `Monitor` |
| Type toggle | รายจ่าย / รายรับ | `ArrowUpRight` / `ArrowDownLeft` |
| Summary | รวมรายรับ / รวมรายจ่าย | `ArrowDownLeft` / `ArrowUpRight` |
| Form | ปิด | `X` |
| Form | ลบ | `Trash2` |
| Form | saving spinner | `LoaderCircle` (`animate-spin`) |
| Form | selected chip mark | `Check` |
| Form/field | error marker | `CircleAlert` |
| List | ตัวกรองหมวด (select trigger) | `ListFilter` |
| List | ล้างตัวกรอง | `X` |
| Home | ดูทั้งหมด / breakdown row | `ChevronRight` |
| Banners | storage warning | `TriangleAlert` |
| Footer | privacy note | `ShieldCheck` |
| Error boundary | โหลดใหม่ | `RotateCw` |

Category icons (final values for `Category.icon` in `src/domain/categories.ts`):

| id | label | icon | | id | label | icon |
|---|---|---|---|---|---|---|
| food | อาหาร | `UtensilsCrossed` | | salary | เงินเดือน | `Wallet` |
| transport | เดินทาง | `Bus` | | bonus | โบนัส | `Trophy` |
| shopping | ช้อปปิ้ง | `ShoppingBag` | | sales | ขายของ | `Store` |
| bills | บิล/ค่าน้ำไฟ | `Receipt` | | gift | ของขวัญ/ได้รับ | `Gift` |
| housing | ที่พัก | `BedDouble` | | other_income | อื่นๆ | `CircleEllipsis` |
| health | สุขภาพ | `HeartPulse` | | | | |
| entertainment | บันเทิง | `Clapperboard` | | | | |
| education | การศึกษา | `GraduationCap` | | | | |
| other_expense | อื่นๆ | `CircleEllipsis` | | | | |

`housing` uses **`BedDouble`** (so `House` stays unique to navigation). The `icon` field stores the lucide export name; a `CATEGORY_ICONS` map in `src/components/CategoryIcon.tsx` maps names to imported components (no dynamic import of the whole icon set).

## 4. Components
Every control is a shadcn/ui component from the SA install list (`button input textarea label dialog sheet alert-dialog toggle-group select sonner card badge alert`). No `table`, `tabs`, `dropdown-menu` or `tooltip` is used (SA decision); icon-only buttons rely on `aria-label`, plus a visible text label wherever space allows.

**Common states** (apply to every interactive component unless overridden):
- default: as specified per component.
- hover (pointer devices only, `@media (hover:hover)`): background shifts one step (`primary` → 90% via `bg-primary/90`; ghost/outline → `bg-accent`).
- focus-visible: `outline-none ring-2 ring-ring ring-offset-2 ring-offset-background` (light green ring, dark marigold ring). Never removed.
- active (pressed): `scale-[0.98]` + same color as hover; disabled under reduced motion.
- disabled: `opacity-50 pointer-events-none`, `aria-disabled` / `disabled`.
- loading: `disabled` + `aria-busy="true"` + `LoaderCircle` spinner replacing the leading icon; label unchanged.
- error: `aria-invalid="true"` → border `--destructive`, ring `--destructive` on focus; message below with `CircleAlert` 16 px, `text-destructive text-sm`, linked by `aria-describedby`.

| UI element | shadcn component | Variant / overrides | Notes and component-specific states |
|---|---|---|---|
| Primary action (บันทึก, เพิ่มรายการ in header/empty state) | `Button` | `default`, `h-11 px-5 rounded-md font-display` | loading = spinner + `disabled` while `saving` (double-tap guard §6) |
| Secondary (ยกเลิก, เดือนนี้, ล้างตัวกรอง) | `Button` | `outline`, border `--input` | — |
| Delete in form | `Button` | `outline` with `text-destructive border-destructive` + `Trash2` | hover `bg-destructive/10` |
| Delete confirm action | `AlertDialogAction` | `buttonVariants({variant:'destructive'})`, label `--destructive-foreground` | — |
| Icon buttons (month arrows, close, theme items) | `Button` | `ghost size="icon"` → `size-11` | `aria-label` required |
| FAB | `Button` | custom class: `size-14 rounded-full bg-seal text-seal-foreground border-2 border-primary shadow-fab`, fixed `bottom: calc(80px + env(safe-area-inset-bottom)) right: 16px` | mobile only (<640); hover `brightness-95`; hidden while the sheet is open |
| Transaction row | `Button` | `ghost`, `h-auto min-h-14 w-full justify-start gap-3 px-4 py-2 rounded-none text-left` | whole row opens edit; focus ring inset (`ring-inset`) |
| Breakdown row | `Button` | same as transaction row | opens list filtered to that category |
| Amount / date fields | `Input` | amount: `h-16 text-[36px] font-display pl-10 tabular-nums`, `inputmode="decimal"`, `autocomplete="off"`, prefix "฿" absolutely positioned (`aria-hidden`); date: `type="date" min="2000-01-01" max="2099-12-31" h-12` | error state as Common |
| Note | `Textarea` | `rows=3 resize-none` + counter `n/200` (`text-muted-foreground text-sm`, right-aligned, id in `aria-describedby`) | input runs `limitNoteInput`; counter never turns red (cut, not error) |
| Field labels | `Label` | `font-display text-base` | every field has a visible label |
| Type switch | `ToggleGroup type="single"` | full width, 2 `ToggleGroupItem`s `h-12 flex-1`; on: `data-[state=on]:bg-primary data-[state=on]:text-primary-foreground` | `onValueChange` ignores empty value (cannot deselect); arrow keys move |
| Category chips | `ToggleGroup type="single"` | `grid grid-cols-3 gap-2`; item `h-16 flex-col gap-1 rounded-xl bg-secondary text-sm`, icon 20; on: `bg-primary text-primary-foreground` + `Check` 14 px in top-right corner | group `aria-label="หมวดหมู่"`; error: group gets `aria-invalid` + message; ignores empty value |
| Category filter | `Select` | trigger `h-12 w-full sm:w-72` with `ListFilter` icon; content: `SelectItem` "ทุกหมวด", then `SelectGroup` + `SelectLabel` "รายจ่าย" (9 items) and "รายรับ" (5 items), each with its category icon | selected value shows icon + label |
| Form container (mobile) | `Sheet` | `side="bottom"`, `rounded-t-[20px] max-h-[92dvh] overflow-y-auto bg-popover`, 4×40 px drag-handle bar (`bg-border`, decorative), sticky footer | Esc / scrim tap / X close; focus trapped; returns to trigger |
| Form container (≥640) | `Dialog` | `max-w-[480px] bg-popover rounded-lg` | same |
| Delete confirm | `AlertDialog` | title = `MESSAGES.deleteConfirm`; description = entry summary (category · signed amount · day heading) | initial focus on "ยกเลิก" (Radix default) |
| Summary / breakdown / recent / list groups | `Card` | `rounded-lg border bg-card p-4 sm:p-5` (rows go edge-to-edge with `p-0`) | loading = skeleton blocks `bg-muted animate-pulse` (no shadcn skeleton installed; plain `div`) |
| Banknote slab | `Card` | override: `bg-slab text-slab-foreground rounded-[20px] p-6 border-0 shadow-slab`, inner frame `absolute inset-2 rounded-[14px] border border-slab-frame pointer-events-none`; negative: `bg-slab-negative` | `aria-live="polite"` on the figure so month changes are announced |
| "ติดลบ" badge | `Badge` | `bg-seal text-seal-foreground font-display` | only when balance < 0 |
| Filter-total label | `Badge` | `secondary` | "รวม ฿x" uses `total` type next to it |
| Storage banners | `Alert` | custom `warning` variant: `bg-warning text-warning-foreground border-warning-border` + `TriangleAlert`; `role="alert"` | unavailable = persistent; corrupt = has a close `Button` (ghost icon, `aria-label="ปิด"`) |
| Save failed | `Alert` | `destructive` variant inside the form above the footer, `role="alert"` | form stays open with data |
| Toast | `Sonner` `<Toaster>` | `position="bottom-center"`, `offset` 96 px on mobile (clears nav + FAB) / 24 px ≥640, `duration={2500}`, `richColors={false}`, `toastOptions.className="font-display"`, uses `--popover` / `--popover-foreground` / `--border` | messages: "บันทึกแล้ว", "ลบแล้ว"; `aria-live="polite"` (sonner default) |
| Theme toggle | `ToggleGroup type="single"` | 3 icon items `size-11` (`Sun`, `Moon`, `Monitor`), `aria-label` "สว่าง" / "มืด" / "ตามระบบ", group `aria-label="ธีม"`; on: `bg-nav-active text-primary` | in header on every page |
| Bottom nav | plain `<nav aria-label="เมนูหลัก">` with two `Button asChild` links | `ghost`, `h-16 flex-1 flex-col gap-0.5 text-sm`; active: icon inside `bg-nav-active text-primary` pill 56×32 + `aria-current="page"` | mobile only, `pb-[env(safe-area-inset-bottom)]`, top border |
| Top nav (≥640) | same links in header | `ghost h-11 px-4`; active `bg-nav-active text-primary` + `aria-current="page"` | — |
| Error boundary | `Card` + `Button` | centered card: "เกิดข้อผิดพลาด" (h1) + `Button` "โหลดใหม่" with `RotateCw` | data untouched |

App components (from SA §6) built from these: `MonthSwitcher`, `SummaryCards` (slab + ledger card), `ExpenseBreakdown`, `TransactionList`, `TransactionRow`, `TransactionForm`, `CategoryChips`, `CategoryFilter`, `StorageBanner`, `ThemeToggle`, `EmptyState`, `BottomNav`, `PrivacyNote`, plus `CategoryIcon` and `Seal` (decorative SVG/div, `aria-hidden`).

## 5. Screens
| screen-id | title | stories | priority |
|---|---|---|---|
| home | หน้าแรก (สรุปเดือน) | US-01, US-03, US-05, US-06, US-09, US-10, US-11 | P1 |
| entry-form | ฟอร์มเพิ่ม/แก้ไขรายการ | US-01, US-02, US-03, US-04 | P1 |
| list | หน้ารายการย้อนหลัง | US-03, US-06, US-07, US-08, US-10 | P1 |
| delete-confirm | กล่องยืนยันการลบ | US-04 | P2 |
| storage-alerts | แถบเตือนที่เก็บข้อมูลและข้อผิดพลาด | US-09, US-12 | P2 |

Every PRD story (US-01 … US-12) is on at least one screen. `entry-form` and `delete-confirm` are overlays: the prototype shows them over `home` (form) and over `entry-form` in edit mode (confirm), each with its own `data-screen` root. `storage-alerts` is `home` with both banners plus the form's save-failed alert, and the error-boundary card as a second state.

**App shell (all screens).** Mobile (<640): header 56 px (`bg-background`, sticky, bottom border on scroll): wordmark left, ThemeToggle right. Then any StorageBanner, then page content (gutter 16 px, bottom padding 160 px so FAB + nav never cover content), then the FAB and the bottom nav. Tablet/desktop (≥640): header 64 px: wordmark, top nav (หน้าแรก | รายการ), spacer, `Button` "เพิ่มรายการ" (`Plus`), ThemeToggle. No FAB and no bottom nav. Content max 640 px (tablet) / 1040 px (desktop), centered. The month and filter live in `AppState`, so they survive navigation between `#/` and `#/list` (US-06, US-08).

### 5.1 home: หน้าแรก (สรุปเดือน), KEY PAGE 1
**Purpose.** Show income, expense and balance for the selected month at a glance, where the money went, and the latest entries, and keep "add" one tap away.

**Layout, mobile (390 px), top to bottom:**
1. **MonthSwitcher:** `ChevronLeft` (aria "เดือนก่อนหน้า") · month label h1 20/28 centered "ตุลาคม 2569" (`formatMonthTh`) · `ChevronRight` (aria "เดือนถัดไป"). Under it, centered, an outline `Button` "เดือนนี้" (`CalendarDays`) that renders **only** when the selected month ≠ current month (US-06). The label row is `aria-live="polite"`.
2. **Banknote slab** (full width, min-height 168 px): top-left caption "ยอดคงเหลือ" (`--slab-muted`, 14 px) + month caption; top-right 40 px ฿ seal; bottom-left the balance figure (`balance` style), e.g. "฿12,499.50". Negative: slab `--slab-negative`, figure "−฿500.00" (U+2212), "ติดลบ" Badge next to the caption (US-05).
3. **Ledger card** (one Card, two 56 px rows split by a `--border` divider): row 1 icon tile (`ArrowDownLeft`, 32 px circle `bg-secondary`, icon `--income`) + "รวมรายรับ" (body) + right-aligned `total` figure "฿20,000.00" in `--income`; row 2 `ArrowUpRight` + "รวมรายจ่าย" + "฿7,500.50" in `--foreground`. Totals carry no +/− sign (PRD US-05 format); the labels say which is which.
4. **รายจ่ายตามหมวด** (Card, h2 heading). Rendered only when the month has expenses (A2). Rows as in §6. Each row is a Button: tap sets the filter to that category and navigates to `#/list` (US-11).
5. **รายการล่าสุด** (Card): header row h2 + right-aligned ghost link-button "ดูทั้งหมด" (`ChevronRight`), which runs `setCategoryFilter('all')` then `navigate('list')` (A5). Body: up to 5 `TransactionRow`s (US-05 order); tapping a row opens `entry-form` in edit mode (US-03).
6. **PrivacyNote:** `ShieldCheck` 16 + `MESSAGES.privacyNote`, caption, muted, centered (US-09, PRD §7 Privacy).
7. FAB (bottom-right) and bottom nav (หน้าแรก active).

**Layout, desktop (≥1024 px):** 12-column grid, 32 px gap. Left column (7/12): MonthSwitcher (left-aligned, "เดือนนี้" inline to the right of the arrows), slab (balance 48 px), ledger card, breakdown. Right column (5/12): รายการล่าสุด card, then PrivacyNote. Tablet: mobile order in a 640 px column.

**Visual hierarchy.**
- **Eye lands first on** the balance figure: the only saturated block on the page (bottle green or brick), 40 px (mobile) / 48 px (desktop) white Prompt 600, roughly 2× any other number on screen. The marigold seal and FAB are the second accent and pull the thumb to "add".
- **Reading order:** month → balance → income/expense (20–22 px) → breakdown (16 px figures + bars) → recent entries (16 px) → privacy note (14 px muted).
- **Whitespace:** 24 px between sections (32 px desktop); 24 px padding inside the slab with the figure anchored bottom-left so the slab feels like a note, not a form; ledger and list rows are 56 px with 16 px side padding. Nothing else on the page uses a filled color block, so the slab keeps its weight.

**States.**
- **Loading:** storage is synchronous, so first paint already has data. While fonts swap, layout does not shift (fixed row heights). No spinner.
- **Empty app (US-10):** slab "฿0.00" (green); ledger "฿0.00" ×2; breakdown hidden; the recent card is replaced by `EmptyState`: 56 px muted seal outline, `MESSAGES.emptyApp` (body, centered), primary `Button` "เพิ่มรายการ" (`Plus`). The FAB stays.
- **Empty month, other months have data (US-05 A5, US-10):** totals "฿0.00"; breakdown hidden; recent card body shows "ไม่มีรายการในเดือนนี้" (muted, centered, 72 px tall); **no** "ดูทั้งหมด".
- **Income-only month:** breakdown hidden (A2); everything else normal.
- **Negative balance:** brick slab + "−" + "ติดลบ" badge.
- **Error:** storage banners (see `storage-alerts`); render error → error-boundary card.

### 5.2 entry-form: ฟอร์มเพิ่ม/แก้ไขรายการ, KEY PAGE 2
**Purpose.** Add or edit an entry in ≤4 taps after opening (PRD §8): amount, category, save.

**Layout, mobile (Sheet from bottom, `max-h-[92dvh]`):**
1. Drag-handle bar (decorative), then header row: title h1 "เพิ่มรายการ" / "แก้ไขรายการ" (US-03) + close `X` (aria "ปิด").
2. **Type switch:** ToggleGroup "รายจ่าย" (`ArrowUpRight`, default) | "รายรับ" (`ArrowDownLeft`), 48 px, full width. Switching type filters the chips and clears a category that does not match (US-01).
3. **จำนวนเงิน (บาท):** Label + 64 px amount Input with "฿" prefix, `placeholder="0.00"`, autofocus on open (mobile keyboard opens with the sheet). Errors per A4 order, one message at a time.
4. **หมวดหมู่:** Label + chip grid, 3 columns × 64 px (9 expense chips = 3 rows; 5 income chips = 2 rows). The selected chip is filled green with a `Check` mark.
5. **วันที่:** Label + native date Input (default today, recomputed on every open), min/max as A3.
6. **โน้ต (ไม่บังคับ):** Label + Textarea + "n/200" counter.
7. Save-failed `Alert` (only after a failed write, US-12).
8. **Sticky footer** (`bg-popover`, top border, `pb-[env(safe-area-inset-bottom)]`): add mode: "ยกเลิก" (outline) + "บันทึก" (primary, flex-1). Edit mode: "ลบ" (destructive outline, `Trash2`, left) + "ยกเลิก" + "บันทึก". All 48 px. "บันทึก" is in the thumb zone, bottom-right.

**Layout, ≥640 (Dialog 480 px):** same order; footer is the dialog footer (not sticky); chips stay 3 columns; the amount field is autofocused here too, so keyboard users can start typing at once.

**Visual hierarchy.**
- **Eye lands first on** the amount field: the biggest type in the app after the balance (36 px Prompt 600), directly under the type switch.
- **Reading order:** title → type → amount → category chips → date → note → save. Required fields come first; optional ones (date already filled, note) sit below the fold on small phones, which is fine because they rarely change.
- **Whitespace:** 20 px between field groups, 8 px between chips, 24 px sheet padding; the footer is separated by a border and never scrolls away.
- Taps for a typical add: chip (1) + บันทึก (1) after typing the amount = 2 taps, ≤4 (PRD §8, SA §11 #2).

**Behavior and states.**
- Submit via "บันทึก" or Enter in the amount/date field (`<form onSubmit>`); `validateDraft` shows **all** field errors at once and focuses the first invalid field (amount → category → date → note) (US-02).
- Messages (exact `MESSAGES`): amountRequired / amountDecimals / amountTooLarge under amount; categoryRequired under chips; dateRequired under date.
- Saving: "บันทึก" loading state (spinner, disabled), then on `{ok:true}`: close, toast "บันทึกแล้ว" (≤3 s), totals and lists update (US-01, US-03). On `{ok:false}`: form stays open with data and `MESSAGES.saveFailed` alert (US-12).
- Cancel / X / Esc / scrim: closes without saving or asking (PRD §6 no draft); focus returns to the trigger (FAB, header button or row).
- Edit mode: every field prefilled (`draftFromTransaction`, amount via `satangToInputText`); "ลบ" opens `delete-confirm`.
- Loading: none (form opens instantly). Empty: the default add state *is* the empty state.

### 5.3 list: หน้ารายการย้อนหลัง, KEY PAGE 3
**Purpose.** Browse every entry of a month grouped by day, filter by category, see the filter total.

**Layout, mobile:**
1. Page title h1 "รายการ".
2. MonthSwitcher (shared state with home, US-06).
3. **CategoryFilter** Select (full width, 48 px), default "ทุกหมวด" (US-08).
4. **Filter summary** (only when a category is selected): Card row with the CategoryIcon + label + "รวม ฿1,234.00" (`total` style, `filteredTotal`) on the left and a ghost `Button` "ล้างตัวกรอง" (`X`) on the right (US-08). With "ทุกหมวด" there is a muted caption "n รายการ" instead.
5. **Day groups** (US-07): a heading per day (`formatDayHeadingTh`, e.g. "พ. 7 ต.ค. 2569", caption style in Prompt 500, muted, `<h2>`, sticky under the header with `bg-background`), then a Card holding that day's `TransactionRow`s divided by `--border`. Days newest first; within a day newest `createdAt` first.
6. Bottom padding, FAB, bottom nav (รายการ active).

**TransactionRow** (shared with home): 56 px min; left 40 px circular icon tile (`bg-secondary`, icon `--foreground`); middle column: category label (label style) and the note below it (caption, muted, one line, `truncate` with "…"; omitted when empty); right: amount (row-amount, tabular): income "+฿150.00" in `--income`, expense "−฿150.00" in `--foreground` (U+2212). The row's accessible name is "<หมวด> <จำนวนพร้อมเครื่องหมาย> <โน้ต>". Tap/Enter opens `entry-form` in edit mode (US-03).

**Layout, ≥1024:** content column 720 px centered; MonthSwitcher and Select sit in one row (switcher left, Select 288 px right); the filter summary sits under them; day groups as on mobile.

**Visual hierarchy.**
- **Eye lands first on** the month label and, when filtered, the filter total "รวม ฿x" (20–22 px Prompt 600, the largest figure on this page). Unfiltered, the eye goes straight to the first day group.
- **Reading order:** title → month → filter → filter total → day heading → rows (category, note, amount on the right edge where the eye scans down a column of tabular figures).
- **Whitespace:** 16 px between controls, 24 px between day groups, 8 px between a day heading and its card; rows 56 px with 16 px padding. The page is denser than home on purpose: it is for scanning.

**States.**
- **Loading:** none (sync); a 5,000-row store still renders one month only.
- **Empty month (US-10):** under the controls: "ไม่มีรายการในเดือนนี้" (muted, centered, with a 40 px muted `List` icon above).
- **Filter with no results (US-08):** "ไม่มีรายการในหมวดนี้ในเดือนนี้" + outline `Button` "ล้างตัวกรอง". The filter summary card still shows "รวม ฿0.00".
- **Filter kept when the month changes** (US-08); reset to "ทุกหมวด" only by "ล้างตัวกรอง", "ดูทั้งหมด" from home, or reload.
- **Error:** storage banners as in the shell.

### 5.4 delete-confirm: กล่องยืนยันการลบ
**Purpose.** Prevent accidental deletes (US-04).
**Layout.** AlertDialog centered on all widths (max 400 px, 16 px margin on mobile). Title (h1 20 px): "ลบรายการนี้? ไม่สามารถกู้คืนได้". Description (body, muted): the entry summary, e.g. "อาหาร · −฿150.00 · พ. 7 ต.ค. 2569". Footer: mobile stacked full width ("ลบ" destructive on top, "ยกเลิก" outline below); ≥640 inline right-aligned "ยกเลิก" then "ลบ".
**Behavior.** Opens over the edit form; focus starts on "ยกเลิก"; Esc = ยกเลิก. "ลบ" → delete, close both dialogs, toast "ลบแล้ว", totals update; focus goes to the page's main heading (the row is gone). "ยกเลิก" → back to the edit form, entry unchanged.
**States.** Loading: "ลบ" shows the spinner while the write runs. Error: a failed write closes the confirm and shows the `saveFailed` alert in the form (the entry stays). Empty: n/a.

### 5.5 storage-alerts: แถบเตือนที่เก็บข้อมูลและข้อผิดพลาด
**Purpose.** Tell the user when data cannot be stored or was unreadable, and never crash (US-12). Also the visible side of US-09 (data stays in this browser).
**Layout.** Banners sit directly under the header, full width inside the content gutter, above the MonthSwitcher, on every page:
- **Unavailable** (`status: 'unavailable'`): warning Alert, `TriangleAlert`, `MESSAGES.storageUnavailable`. Persistent (no close button), because data will be lost.
- **Corrupt** (`status: 'corrupt'`): warning Alert, `TriangleAlert`, `MESSAGES.storageCorrupt`, ghost close `X` (aria "ปิด"); dismissal lasts for the session only.
- **Save failed** (inside `entry-form`): destructive Alert above the footer with `MESSAGES.saveFailed`; form data kept.
- **Error boundary** (any render error): full-page centered Card: "เกิดข้อผิดพลาด" + "โหลดใหม่" (`RotateCw`) primary button.
- Privacy note (home footer) is the persistent US-09 message.
**States.** Banners do not shift the layout after first paint (status is known before render). Both banners can appear together only in theory; if they do, unavailable is shown first.

## 6. Charts
| Dataset | Chart | Series / encoding | Colors | Loading | Empty |
|---|---|---|---|---|---|
| Expense by category of the selected month (US-11, `expenseByCategory`) | **Horizontal bar list** (plain CSS, no chart library, SA ADR-4) sorted by amount desc | one row per expense category with amount > 0: CategoryIcon + label (left), amount + "38%" (right, half-up per A6, <0.5% shows 0%), bar below spanning the row width; bar fill width = that category's share of the month's total expense (`width: <percent>%`, min 2 px when amount > 0) | single hue: fill `--bar` on track `--bar-track` (6.26:1 light / 6.73:1 dark), 8 px tall, `rounded-full`. One color for all rows is color-blind-safe; identity comes from the text label and icon, never from color | none (sync data) | section hidden entirely when the month has no expenses (A2) |
| Income vs expense of the month (US-05) | **No chart**: numbers in the slab + ledger card | — | — | — | "฿0.00" |

Why no chart for income vs expense: PRD §7c says numbers in the card are enough, and two bars would repeat the ledger card's two figures. The slab color already shows the sign of the difference.
Accessibility: the bar list is a `<ul>`; each row's accessible name is "อาหาร ฿2,850.00 38 เปอร์เซ็นต์ ของรายจ่ายรวม, ดูรายการ"; bars are `aria-hidden`. Long labels never truncate the amount: label `truncate`, amount `shrink-0`.

## 7. Interaction & motion
Motion tokens: `--ease-out: cubic-bezier(0.2, 0.8, 0.2, 1)`; durations `fast 120ms`, `base 200ms`, `slow 320ms`.
- **Sheet** slides up (`base`, ease-out) and down on close (`fast`); scrim fades. **Dialog / AlertDialog** fade + scale 0.97→1 (`fast`).
- **Month change:** totals, slab and lists cross-fade (`fast`); the slab color change (green ↔ brick) transitions `background-color` over `base`. Bars animate width from 0 on month change (`slow`).
- **Save:** button spinner → sheet closes → toast slides in from the bottom (sonner) for 2.5 s; the new row gets a brief `bg-nav-active` highlight that fades over 1 s (where it is visible).
- **Delete:** row removed without an exit animation (simple, avoids layout jank), toast "ลบแล้ว".
- **Press feedback:** `active:scale-[0.98]` on buttons, chips and rows; FAB `active:scale-95`.
- **Reduced motion** (`prefers-reduced-motion: reduce`): no slides, scales, bar growth or highlight fades. Only opacity changes ≤ `fast` remain. `motion-reduce:` utilities on every animated element.
- **Keyboard:** Tab follows visual order (header → banner → month controls → content → nav). Enter/Space activates rows and buttons; arrow keys move within ToggleGroups (type, chips, theme) and the Select. Enter in amount/date submits the form. Esc closes Select, Sheet, Dialog and AlertDialog; focus returns to the opener. No global single-key shortcuts (they would clash with typing Thai).
- **Feedback for every action:** save/delete toast; validation inline; filter change updates the summary immediately; month change is announced via `aria-live` on the month label and the balance.

## 8. Accessibility checklist
- [ ] `<html lang="th">`; page `<title>` "รายรับรายจ่าย"; one `<h1>` per page (page title or, on home, the month label).
- [ ] Landmarks: `<header>`, `<main>`, `<nav aria-label="เมนูหลัก">`, footer for the privacy note.
- [ ] Every field has a visible `<Label htmlFor>`; chip group and type switch have group labels; the "฿" prefix is `aria-hidden`; the amount input's accessible name is "จำนวนเงิน (บาท)".
- [ ] Errors: `aria-invalid` + `aria-describedby` → message id; all errors shown at once; focus moves to the first invalid field (US-02).
- [ ] Icon-only buttons have Thai `aria-label`s: "เดือนก่อนหน้า", "เดือนถัดไป", "ปิด", "เพิ่มรายการ" (FAB), "สว่าง"/"มืด"/"ตามระบบ".
- [ ] Focus order matches visual order; focus is trapped in Sheet/Dialog/AlertDialog and returned on close (Radix); focus ring always visible (2 px `--ring` + 2 px offset, ≥3:1).
- [ ] Touch targets ≥ 44×44 px (icon buttons `size-11`, chips 64 px, rows ≥ 56 px, FAB 56 px, nav items 64 px tall); ≥ 8 px between adjacent targets except rows inside a list (full-width, no ambiguity).
- [ ] Income/expense never by color alone: "+"/"−" signs, labels "รวมรายรับ"/"รวมรายจ่าย", direction icons; negative balance has "−" + "ติดลบ" badge + slab color.
- [ ] All text pairs ≥ 4.5:1 and UI parts ≥ 3:1 in both themes (see Contrast pairs); no text over images.
- [ ] Live regions: toasts (sonner `aria-live="polite"`), month label and balance `aria-live="polite"`, banners and save-failed `role="alert"`.
- [ ] Reduced motion honored (§7); no auto-playing animation longer than 1 s.
- [ ] Zoom to 200% and 360 px width: no horizontal scroll; money figures wrap or shrink via `clamp`, never overflow; Thai text never clipped vertically.
- [ ] Notes rendered as plain text (no HTML), truncated visually with "…" in rows but announced in full via the row's accessible name.
- [ ] axe (`@axe-core/playwright`) passes on every screen in light and dark (SA §11 #12).

## 9. Demo data needs
Generated by `generateDemoTransactions(now)` (`?demo=1`, memory only, SA §3). With "now" = 9 Oct 2026, the screens need:
- **Current month (ตุลาคม 2569):** ~18 entries over 7 days including today and one future date (e.g. 25 Oct, a scheduled bill); salary ฿32,000.00 + one sales income; expenses in at least 6 categories so the breakdown shows 6+ bars with a clear leader (food ~35%) and one tiny category that rounds to 0% (<0.5%, A6); two entries on the same date with different `createdAt` (ordering); one 0.10 + one 0.20 entry in the same category (sum shows ฿0.30 exactly); a 200-code-point Thai note with tone marks + an emoji (truncation); a note with a line break; an entry with no note. Balance positive (green slab), ≥ 6 entries so home shows exactly 5 + "ดูทั้งหมด".
- **Previous month (กันยายน 2569):** ~25 entries, every one of the 14 categories used at least once across demo data, expenses > income so the balance is **negative** (brick slab, "ติดลบ" badge); include 31 Aug → 1 Sep boundary entries.
- **Two months back (สิงหาคม 2569):** income-only month (salary + bonus + gift) so the breakdown is hidden (A2).
- **Edge figures:** one large amount ≥ ฿1,000,000.00 to test wide figures in the slab and rows at 360 px (e.g. bonus ฿1,250,000.00 in August); amounts with satang (฿7,500.50).
- **Empty states without demo:** plain `/` with empty storage (US-10 empty app); November 2569 (one ▶ from the current month in demo) shows the empty month (A5); the filter "การศึกษา" in a month without education entries shows the filter-empty state.
- **Storage states for `storage-alerts`:** the prototype fakes them with toggles; the real app needs the SA test fixtures (`"{not json"`, blocked storage stub, quota error).
- **Perf fixture:** `generateDemoTransactions(now, 5000)` (SA §7) for the ≤100 ms checks; not used in screenshots.

## 10. Look & feel map
| intake item | what it asked for | how this design meets it |
|---|---|---|
| Look & feel (IDEA) | "ให้ AI เสนอ 3 แบบ" | `docs/DESIGN_OPTIONS.md`: Banknote, Night Market, Plain Ledger, which differ in color, Thai font, density and personality; `Chosen: Banknote` (human can switch at the design gate) |
| User / context | not specified (inferred: one person logging on a phone during the day) | mobile-first, thumb-zone FAB and sticky save, amount autofocus, 2 taps after typing |
| Feelings wanted / not wanted | not specified — chose calm, trustworthy, warm; not cold-bank, not noisy | warm paper + bottle-green ink + marigold seal; one accent color; no red for ordinary expenses |
| References | not specified — chose a banknote / passbook metaphor | Banknote slab with inset frame and ฿ seal |
| Anti-references | not specified — chose to avoid generic dashboard-template look and per-category rainbow charts | single-hue bars, one signature block per page, no stock illustrations |
| Page priority | PRD §7c: home > form > list | home gets the signature slab and most care (§5.1); form optimized for speed (§5.2); list for scanning (§5.3) |
| Colors | not specified — chose bottle green #1E5A43 / marigold #F2B53A on paper #FAF7F0 | tokens §2.1–2.2, all pairs AA (Contrast pairs) |
| Fonts | not specified (must support Thai) — chose Prompt 500/600 + Sarabun 400 | both include Thai + ฿; self-hosted via `@fontsource` (PRD §7 Privacy) |
| Logo | not specified — chose ฿ seal + "รายรับรายจ่าย" wordmark | §1 Wordmark; favicon = seal |
| Theme | not specified (PRD: system default + visible toggle) | light, dark, system tokens; ThemeToggle in the header on every page (§2.3, §4) |
| Density | not specified — chose comfortable home, slightly denser list | 56 px rows, 24 px section gaps; list tighter (16 px between controls) |
| Charts | "ไม่ต้องมีกราฟซับซ้อน" → simple expense-by-category bars only | CSS horizontal bar list, single hue (§6); income vs expense as numbers |
| Demo data | not specified (PRD Q6: demo-only path) | §9 lists the `?demo=1` content needed for every state |
| Visual acceptance criteria | not specified — chose: AA contrast in both themes, no horizontal scroll at 360 px, 44 px targets | §8 checklist; checked by `check-design.mjs`, axe and screenshots |
