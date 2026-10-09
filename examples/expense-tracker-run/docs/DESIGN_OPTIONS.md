Chosen: Banknote

# Design options — Expense Tracker (แอปบันทึกรายรับรายจ่ายส่วนตัว)

Stage 3 (design) · 2026-10-09 · Why this file exists: the idea's Look & feel says only "ให้ AI เสนอ 3 แบบ" (PRD §7b, Q1), so here are three directions that differ in color, Thai font, density and personality. The `Chosen:` line above is binding for `docs/UXUI_DESIGN.md`. To switch, change it at the design gate and the designer is re-run on that direction.

All three use the same stack (Vite + React + Tailwind v4 + shadcn/ui + lucide-react), support light, dark and system themes with a visible toggle, load Thai-capable fonts from `@fontsource` (self-hosted, no third-party requests per PRD §7 Privacy), and meet WCAG AA. Ratios below were computed with the WCAG 2.1 formula. They were not estimated.

## 1. Banknote (ธนบัตร), chosen

**Vibe.** Calm and trustworthy like a well-kept passbook, but with warmth: deep bottle-green ink on warm paper, with a marigold accent that suggests a Thai banknote's seal. It feels like real money without the coldness of a banking app.

| Role | Light | Dark |
|---|---|---|
| Primary (bottle green) | #1E5A43 | #6FCF9F |
| Accent (marigold seal) | #F2B53A | #F2B53A |
| Surface (paper / night) | #FAF7F0 (cards #FFFFFF) | #101613 (cards #18201C) |
| Text (ink) | #1C1B18 | #ECE8DD |

- **Fonts:** Prompt 500/600 (headings and all money figures: geometric, loopless Thai, strong digits) + Sarabun 400 (body: looped, very readable Thai at small sizes). Both cover Thai, Latin and ฿.
- **Signature element:** the **Banknote slab**. The balance card is a solid bottle-green block with a thin inset frame and a round marigold ฿ seal, like the face of a banknote. When the balance goes negative the slab turns brick red and gets a marigold "ติดลบ" badge. The marigold add button (FAB) repeats the seal.
- **Layout character:** a mobile single column of generous cards on a paper background, bottom tab bar plus marigold FAB. On desktop the page becomes a centered 2-column dashboard with a slim top bar.
- **Density:** comfortable (rows 56 px, 16 px gutters).
- **Contrast check:** body #1C1B18 on #FAF7F0 = 16.10:1; button #FFFFFF on #1E5A43 = 8.08:1; dark body #ECE8DD on #101613 = 14.97:1.
- **When it fits:** a personal money tool used daily by a general Thai audience. It should feel trustworthy and a little warm. It must stay calm when the numbers are bad.

## 2. Night Market (ตลาดนัดกลางคืน)

**Vibe.** Loud, playful and dark-first, like neon signs over a Thai night market. Logging money feels closer to a game than a chore.

| Role | Value |
|---|---|
| Primary (coral) | #FF6B5B (label text #15121F = 6.59:1) |
| Accent (lime) | #C6F432 (on surface = 14.40:1) |
| Surface (dark-first) | #15121F |
| Text | #F4F1FA (16.53:1) |

- **Fonts:** Kanit 600 (chunky display Thai for numbers and headings) + Noto Sans Thai 400 (body).
- **Signature element:** per-category neon color coding. Each category gets its own saturated hue on chips, rows and a stacked breakdown bar, and the balance is a huge lime number on black.
- **Layout character:** stacked rounded cards with a horizontally scrolling category strip. Light theme is secondary: a pale lilac version.
- **Density:** airy, oversized touch targets.
- **When it fits:** young users who log money for fun. The risks: 14 category hues are hard to keep color-blind-safe and distinct, and constant neon gets tiring in daily use.

## 3. Plain Ledger (สมุดบัญชีเรียบ)

**Vibe.** Quiet, dense and table-first like a bank statement. It is built for people who want to see many rows at once and nothing else.

| Role | Value |
|---|---|
| Primary (navy) | #1D3A8A (label text #FFFFFF = 10.37:1) |
| Accent (steel teal) | #0B6E8F (on white = 5.77:1) |
| Surface | #FFFFFF |
| Text | #111827 (17.74:1) |

- **Fonts:** Noto Sans Thai 400/600 only (one family, neutral).
- **Signature element:** a sticky three-column totals strip (รายรับ | รายจ่าย | คงเหลือ) pinned under the header on every page.
- **Layout character:** top bar with dense day-grouped rows (44 px) and right-aligned tabular amounts. Minimal cards and no illustrations.
- **Density:** compact.
- **When it fits:** power users with many entries per day, desktop-heavy use. It is the safest option and the most forgettable: it looks like every banking app.

## Why Banknote

It has the strongest identity that still fits a daily, mobile, money app for a general Thai audience. The green-on-paper and marigold seal are recognizable at a glance and money-themed without being cliché. Monochrome green bars stay color-blind-safe, unlike Night Market's 14 hues. It is warmer and more memorable than Plain Ledger at almost the same clarity. The brick-red slab gives the negative balance (US-05) a clear second cue on top of the "−" sign and the "ติดลบ" badge.
