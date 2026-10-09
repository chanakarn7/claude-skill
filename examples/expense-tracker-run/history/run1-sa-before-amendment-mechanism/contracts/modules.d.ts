/**
 * Contract: Expense Tracker (client-only, Vite + React + TypeScript + localStorage).
 * Source of truth for module exports and stored JSON shapes. Module names use the "@/" alias for src/.
 * Change this file first if the implementation needs another shape, then re-run
 * `node docs/pipeline/templates/check-contract.mjs . docs`.
 */

// ---------------------------------------------------------------- shared types
declare module '@/domain/types' {
  /** Calendar date "YYYY-MM-DD" on the user's local calendar. No time, no time zone. */
  export type ISODate = string;
  /** Month key "YYYY-MM". */
  export type YearMonth = string;
  /** Integer satang (1 baht = 100 satang). Never a float. */
  export type Satang = number;
  export type TransactionType = 'income' | 'expense';
  export type ExpenseCategoryId =
    | 'food' | 'transport' | 'shopping' | 'bills' | 'housing'
    | 'health' | 'entertainment' | 'education' | 'other_expense';
  export type IncomeCategoryId = 'salary' | 'bonus' | 'sales' | 'gift' | 'other_income';
  export type CategoryId = ExpenseCategoryId | IncomeCategoryId;

  /** One stored record. amount 1..9_999_999_999; note trimmed, 0..200 UTF-16 units. */
  export interface Transaction {
    id: string;            // crypto.randomUUID()
    type: TransactionType;
    amount: Satang;
    categoryId: CategoryId; // must belong to `type`
    date: ISODate;          // 2000-01-01 .. 2099-12-31
    note: string;
    createdAt: string;      // ISO 8601 UTC (Date#toISOString)
    updatedAt: string;      // ISO 8601 UTC
  }

  /** localStorage["expense-tracker:v1"] */
  export interface StorageEnvelopeV1 {
    version: 1;
    transactions: Transaction[];
  }

  /** localStorage["expense-tracker:theme"]; missing = 'system'. */
  export type ThemePreference = 'light' | 'dark' | 'system';

  export interface Category {
    id: CategoryId;
    type: TransactionType;
    label: string; // Thai label from PRD §5
    icon: string;  // lucide-react icon name, chosen in the design stage
  }

  /** Raw form values, exactly as typed. */
  export interface TransactionDraft {
    type: TransactionType;
    amountText: string;
    categoryId: CategoryId | null;
    date: string;
    note: string;
  }

  /** Validated values ready to store (id and timestamps are added by the store). */
  export type TransactionInput = Pick<Transaction, 'type' | 'amount' | 'categoryId' | 'date' | 'note'>;

  export type FieldName = 'amount' | 'categoryId' | 'date' | 'note';
  /** Thai message per invalid field (texts in VALIDATION_MESSAGES). */
  export type FieldErrors = Partial<Record<FieldName, string>>;

  export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

  export interface MonthSummary { income: Satang; expense: Satang; balance: Satang; count: number }
  /** percent = Math.round(amount * 100 / monthExpense); rows are not forced to sum to 100. */
  export interface CategoryShare { categoryId: ExpenseCategoryId; amount: Satang; percent: number }
  export interface DayGroup { date: ISODate; heading: string; items: Transaction[] }
  export type CategoryFilter = 'all' | CategoryId;

  /** 'unavailable' = memory-only mode; 'corrupt-backed-up' = unreadable data copied to a corrupt key, started empty. */
  export type StorageStatus = 'ok' | 'unavailable' | 'corrupt-backed-up';
  export interface LoadResult { transactions: Transaction[]; status: StorageStatus; skipped: number }
  export type SaveError = 'storage-failed' | 'not-found';

  export type FormState = { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; id: string };
  export interface UiState { selectedMonth: YearMonth; categoryFilter: CategoryFilter; form: FormState }
  export interface TransactionsState { transactions: Transaction[]; status: StorageStatus; skipped: number }
  export type Route = { name: 'home' } | { name: 'list' };
}

// ---------------------------------------------------------------- domain (pure, unit-tested)
declare module '@/domain/categories' {
  import type { Category, CategoryId, TransactionType } from '@/domain/types';
  /**
   * Fixed category list (9 expense, 5 income) in PRD §5 order; that order breaks ties everywhere.
   * @stories US-01, US-08, US-11
   */
  export const CATEGORIES: readonly Category[];
  /** @stories US-01, US-08 */
  export function categoriesFor(type: TransactionType): readonly Category[];
  /** @stories US-07, US-08, US-11 */
  export function getCategory(id: CategoryId): Category;
  /** @stories US-01, US-02, US-12 */
  export function isCategoryOfType(id: string, type: TransactionType): id is CategoryId;
}

declare module '@/domain/money' {
  import type { Result, Satang, Transaction } from '@/domain/types';
  /** 1 satang = ฿0.01. @stories US-02 */
  export const MIN_SATANG: 1;
  /** 9_999_999_999 satang = ฿99,999,999.99. @stories US-02 */
  export const MAX_SATANG: 9999999999;
  /**
   * Baht text → integer satang using string arithmetic only (no float).
   * Trims, strips "," and spaces. Error precedence: 'invalid' (empty, not /^\d+(\.\d+)?$/, negative)
   * → 'decimals' (> 2 decimals) → 'zero' (value 0) → 'too-large' (> MAX_SATANG).
   * @stories US-01, US-02
   */
  export function parseAmount(text: string): Result<Satang, 'invalid' | 'decimals' | 'zero' | 'too-large'>;
  /**
   * "฿1,234.50"; negative → "−฿500.00" (U+2212). signed=true adds "+" for positive values.
   * Grouping by integer math on satang, never via float.
   * @stories US-05, US-07, US-08, US-11
   */
  export function formatTHB(amount: Satang, opts?: { signed?: boolean }): string;
  /** Income "+฿150.00", expense "−฿150.00". @stories US-07 */
  export function formatTransactionAmount(t: Pick<Transaction, 'type' | 'amount'>): string;
  /** Satang → plain form text without symbol or grouping, e.g. 15050 → "150.50" (edit form prefill). @stories US-03 */
  export function satangToInputText(amount: Satang): string;
}

declare module '@/domain/dates' {
  import type { ISODate, YearMonth } from '@/domain/types';
  /** @stories US-02 */
  export const DATE_MIN: '2000-01-01';
  /** @stories US-02 */
  export const DATE_MAX: '2099-12-31';
  /** Local calendar date of `now` (default new Date()), recomputed each time the form opens. @stories US-01 */
  export function todayISO(now?: Date): ISODate;
  /** @stories US-06 */
  export function currentYearMonth(now?: Date): YearMonth;
  /** "2026-10-07" → "2026-10". @stories US-03, US-07 */
  export function monthOf(date: ISODate): YearMonth;
  /** Integer month arithmetic, no Date objects; unlimited range. @stories US-06 */
  export function addMonths(ym: YearMonth, delta: number): YearMonth;
  /** Format YYYY-MM-DD, a real calendar date (leap years), inside DATE_MIN..DATE_MAX. @stories US-02, US-12 */
  export function isValidISODate(s: string): s is ISODate;
  /** "2026-10" → "ตุลาคม 2569" (Intl, locale "th-TH-u-ca-buddhist"). @stories US-06 */
  export function formatMonthLabel(ym: YearMonth): string;
  /** "2026-10-07" → "พ. 7 ต.ค. 2569" (weekday from th-TH of the local date). @stories US-07 */
  export function formatDayHeading(date: ISODate): string;
}

declare module '@/domain/validation' {
  import type { FieldErrors, FieldName, Result, TransactionDraft, TransactionInput } from '@/domain/types';
  /** @stories US-02 */
  export const NOTE_MAX: 200;
  /**
   * Exact Thai texts: amountInvalid "กรุณากรอกจำนวนเงินมากกว่า 0" (also for 'zero'),
   * amountDecimals "ทศนิยมได้ไม่เกิน 2 ตำแหน่ง", amountTooLarge "จำนวนเงินสูงเกินไป",
   * categoryRequired "กรุณาเลือกหมวดหมู่", dateInvalid "กรุณาเลือกวันที่",
   * saveFailed "บันทึกไม่สำเร็จ: พื้นที่เก็บข้อมูลเต็มหรือใช้ไม่ได้".
   * @stories US-02, US-12
   */
  export const VALIDATION_MESSAGES: Readonly<Record<
    'amountInvalid' | 'amountDecimals' | 'amountTooLarge' | 'categoryRequired' | 'dateInvalid' | 'saveFailed', string>>;
  /** Form order used to focus the first invalid field: amount, categoryId, date, note. @stories US-02 */
  export const FIELD_ORDER: readonly FieldName[];
  /** Validates every field at once (all errors returned together); trims note. @stories US-01, US-02, US-03 */
  export function validateDraft(draft: TransactionDraft): Result<TransactionInput, FieldErrors>;
  /** @stories US-02 */
  export function firstInvalidField(errors: FieldErrors): FieldName | null;
}

declare module '@/domain/summary' {
  import type { CategoryFilter, CategoryShare, DayGroup, MonthSummary, Satang, Transaction, YearMonth } from '@/domain/types';
  /** New array: date desc, then createdAt desc. Used by the home "recent" list and the list page. @stories US-05, US-07 */
  export function sortTransactions(list: readonly Transaction[]): Transaction[];
  /** Entries whose date starts with `ym`. @stories US-03, US-05, US-07 */
  export function inMonth(list: readonly Transaction[], ym: YearMonth): Transaction[];
  /** Integer satang sums; balance = income − expense of this month only (no carry-over). @stories US-05, US-10 */
  export function summarizeMonth(list: readonly Transaction[], ym: YearMonth): MonthSummary;
  /** Expense categories with amount > 0, amount desc (ties: CATEGORIES order). [] when no expenses. @stories US-11 */
  export function expenseByCategory(list: readonly Transaction[], ym: YearMonth): CategoryShare[];
  /** First `limit` (default 5) of sortTransactions(inMonth(list, ym)). @stories US-05 */
  export function recentTransactions(list: readonly Transaction[], ym: YearMonth, limit?: number): Transaction[];
  /** @stories US-08 */
  export function filterByCategory(list: readonly Transaction[], filter: CategoryFilter): Transaction[];
  /** Signed total of a filtered list for "รวม ฿x" (income +, expense −). @stories US-08 */
  export function totalOf(list: readonly Transaction[]): Satang;
  /** Groups an already sorted list by date, newest day first, with formatDayHeading headings. @stories US-07 */
  export function groupByDay(list: readonly Transaction[]): DayGroup[];
}

// ---------------------------------------------------------------- persistence
declare module '@/storage/storage' {
  import type { LoadResult, Result, SaveError, ThemePreference, Transaction } from '@/domain/types';
  /** @stories US-09 */
  export const STORAGE_KEY: 'expense-tracker:v1';
  /** @stories US-09 */
  export const SCHEMA_VERSION: 1;
  /** Backup key = CORRUPT_KEY_PREFIX + Date.now(). @stories US-12 */
  export const CORRUPT_KEY_PREFIX: 'expense-tracker:v1:corrupt-';
  /** @stories US-09 */
  export const THEME_KEY: 'expense-tracker:theme';
  /** Writes then removes "expense-tracker:probe"; false on any throw. @stories US-12 */
  export function isStorageAvailable(): boolean;
  /** Runtime guard for one stored record (all PRD §5 rules). @stories US-12 */
  export function isValidTransaction(x: unknown): x is Transaction;
  /**
   * Parses the stored JSON; null when unreadable (bad JSON, not an object, no transactions array,
   * version not 1). Skips invalid records and duplicate ids (first wins) and counts them.
   * @stories US-09, US-12
   */
  export function parseEnvelope(raw: string): { transactions: Transaction[]; skipped: number } | null;
  /**
   * Startup load (flow F6): probe → read → parse → on unreadable data copy raw to a corrupt key, then write an
   * empty envelope; if that copy fails, use memory-only mode and leave the key untouched. Never throws.
   * @stories US-09, US-12
   */
  export function loadTransactions(): LoadResult;
  /** One setItem of the whole envelope (atomic per action). Never throws. @stories US-09, US-12 */
  export function saveTransactions(list: readonly Transaction[]): Result<void, SaveError>;
  /** `storage` event listener for STORAGE_KEY (other tabs); returns unsubscribe. @stories US-09 */
  export function onExternalChange(cb: () => void): () => void;
  /** @stories US-09 */
  export function readThemePreference(): ThemePreference;
  /** Ignores storage errors. @stories US-09 */
  export function writeThemePreference(p: ThemePreference): void;
}

// ---------------------------------------------------------------- state (useSyncExternalStore stores)
declare module '@/store/transactions' {
  import type { Result, SaveError, Transaction, TransactionInput, TransactionsState } from '@/domain/types';
  /** Calls loadTransactions() once and wires onExternalChange (reload, last write wins). @stories US-09, US-12 */
  export function initTransactions(): void;
  /** @stories US-05, US-07, US-09 */
  export function getTransactionsState(): TransactionsState;
  /** @stories US-05, US-07 */
  export function subscribeTransactions(listener: () => void): () => void;
  /** React hook over the two functions above. @stories US-05, US-07, US-08, US-11 */
  export function useTransactions(): TransactionsState;
  /**
   * New id + createdAt/updatedAt; persists first and changes in-memory state only on success
   * (memory-only mode always succeeds). @stories US-01, US-12
   */
  export function addTransaction(input: TransactionInput, now?: Date): Result<Transaction, SaveError>;
  /** Same id and createdAt, new updatedAt. @stories US-03, US-12 */
  export function updateTransaction(id: string, input: TransactionInput, now?: Date): Result<Transaction, SaveError>;
  /** Hard delete. @stories US-04, US-12 */
  export function deleteTransaction(id: string): Result<void, SaveError>;
}

declare module '@/store/ui' {
  import type { CategoryFilter, UiState, YearMonth } from '@/domain/types';
  /** In memory only: selectedMonth starts at currentYearMonth() on every load, filter 'all', form closed. @stories US-06, US-08 */
  export function getUiState(): UiState;
  /** @stories US-06, US-08 */
  export function useUiState(): UiState;
  /** @stories US-06 */
  export function setSelectedMonth(ym: YearMonth): void;
  /** ◀ = -1, ▶ = +1; keeps the category filter. @stories US-06, US-08 */
  export function stepMonth(delta: -1 | 1): void;
  /** "เดือนนี้" button. @stories US-06 */
  export function goToCurrentMonth(): void;
  /** @stories US-08, US-11 */
  export function setCategoryFilter(f: CategoryFilter): void;
  /** "ล้างตัวกรอง". @stories US-08 */
  export function clearCategoryFilter(): void;
  /** @stories US-01, US-10 */
  export function openAddForm(): void;
  /** @stories US-03 */
  export function openEditForm(id: string): void;
  /** @stories US-01, US-03, US-04 */
  export function closeForm(): void;
}

declare module '@/app/router' {
  import type { Route } from '@/domain/types';
  /** "#/" or "" → home, "#/list" → list, anything else → home. @stories US-05, US-07 */
  export function parseHash(hash: string): Route;
  /** @stories US-05, US-07, US-11 */
  export function navigate(route: Route): void;
  /** Re-renders on hashchange. @stories US-05, US-07 */
  export function useRoute(): Route;
}

declare module '@/theme/theme' {
  import type { ThemePreference } from '@/domain/types';
  /** Sets/clears the "dark" class on <html> (system = prefers-color-scheme, live). Serves PRD §7 Theme. @stories US-09 */
  export function applyTheme(p: ThemePreference): void;
  /** Reads THEME_KEY, applies, returns [pref, set]; set persists and applies. @stories US-09 */
  export function useTheme(): [ThemePreference, (p: ThemePreference) => void];
}

declare module '@/demo/demoData' {
  import type { Transaction } from '@/domain/types';
  /**
   * Deterministic demo set relative to `now`: 3 months, every category, about 120 entries; includes a negative-balance
   * month, an empty month, a 200-char note with emoji and a line break, 0.1 + 0.2 entries, a future date,
   * a 29 Feb / 31st entry when in range. Loaded only by `npm run demo` (MODE === 'demo').
   * @stories US-05, US-07, US-11
   */
  export function buildDemoTransactions(now: Date): Transaction[];
  /** Writes the demo set only when STORAGE_KEY is absent; no-op otherwise. @stories US-05, US-07, US-11 */
  export function seedDemoIfEmpty(now?: Date): void;
}

// ---------------------------------------------------------------- UI (React components; props only)
declare module '@/components/MonthSwitcher' {
  import type { ReactElement } from 'react';
  /** ◀ label ▶ + "เดือนนี้" (shown only when not on the current month). Shared by both pages. @stories US-06 */
  export function MonthSwitcher(): ReactElement;
}

declare module '@/components/SummaryCards' {
  import type { ReactElement } from 'react';
  import type { MonthSummary } from '@/domain/types';
  /** Balance (most prominent; negative = "−" + warning color), income, expense. @stories US-05, US-10 */
  export function SummaryCards(props: { summary: MonthSummary }): ReactElement;
}

declare module '@/components/CategoryBreakdown' {
  import type { ReactElement } from 'react';
  import type { CategoryShare } from '@/domain/types';
  /**
   * Horizontal CSS bar rows (label, amount, percent). Empty shares → section stays with text
   * "ยังไม่มีรายจ่ายในเดือนนี้". Row tap → setCategoryFilter + navigate list.
   * @stories US-11
   */
  export function CategoryBreakdown(props: { shares: CategoryShare[] }): ReactElement;
}

declare module '@/components/TransactionList' {
  import type { ReactElement } from 'react';
  import type { Transaction } from '@/domain/types';
  /** Day-grouped (grouped=true) or flat rows; row tap → openEditForm. Note shown as text, one line, ellipsis. @stories US-03, US-05, US-07 */
  export function TransactionList(props: { items: Transaction[]; grouped: boolean }): ReactElement;
}

declare module '@/components/TransactionForm' {
  import type { ReactElement } from 'react';
  /**
   * Add/edit form driven by UiState.form. Sheet (bottom) under 768 px, Dialog from 768 px. Edit mode shows "ลบ" →
   * AlertDialog "ลบรายการนี้? ไม่สามารถกู้คืนได้". Save button disabled while saving; toasts "บันทึกแล้ว"/"ลบแล้ว" (2.5 s).
   * On SaveError the form stays open with VALIDATION_MESSAGES.saveFailed.
   * @stories US-01, US-02, US-03, US-04, US-12
   */
  export function TransactionForm(): ReactElement;
}

declare module '@/components/StorageBanner' {
  import type { ReactElement } from 'react';
  import type { StorageStatus } from '@/domain/types';
  /**
   * 'unavailable' → "ไม่สามารถบันทึกข้อมูลในเครื่องได้ ข้อมูลจะหายเมื่อปิดหน้า";
   * 'corrupt-backed-up' → "ข้อมูลเดิมอ่านไม่ได้ ได้สำรองไว้แล้ว"; 'ok' → renders nothing.
   * @stories US-12
   */
  export function StorageBanner(props: { status: StorageStatus }): ReactElement | null;
}

declare module '@/pages/HomePage' {
  import type { ReactElement } from 'react';
  /** Month switcher, SummaryCards, CategoryBreakdown, 5 recent + "ดูทั้งหมด", first-run empty state. @stories US-05, US-06, US-10, US-11 */
  export function HomePage(): ReactElement;
}

declare module '@/pages/TransactionsPage' {
  import type { ReactElement } from 'react';
  /** Month switcher, category Select (groups "รายจ่าย"/"รายรับ"), "รวม ฿x", grouped list, empty states. @stories US-06, US-07, US-08, US-10 */
  export function TransactionsPage(): ReactElement;
}

declare module '@/App' {
  import type { ReactElement } from 'react';
  /** Shell: header (title, theme toggle, desktop add button), StorageBanner, route outlet, bottom tabs "หน้าแรก" | "รายการ", FAB, form, Toaster, privacy footer. @stories US-01, US-06, US-09, US-12 */
  export function App(): ReactElement;
}
