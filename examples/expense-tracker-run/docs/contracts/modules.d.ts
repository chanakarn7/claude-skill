// Contract: client-only Expense Tracker (Vite + React + TypeScript + localStorage).
// Source of truth for module exports. Paths are relative to src/. Amounts are integer satang.
// UI components (src/components, src/screens) are internal and consume only the exports below.
// [PRD-AMEND An] marks behavior that follows PRD amendment An (A1–A9); see docs/pipeline/PRD_AMENDMENTS.md for status.

// ───────────────────────── shared types (src/domain/types.ts) ─────────────────────────
export type TxType = 'income' | 'expense';
export type ExpenseCategoryId =
  | 'food' | 'transport' | 'shopping' | 'bills' | 'housing'
  | 'health' | 'entertainment' | 'education' | 'other_expense';
export type IncomeCategoryId = 'salary' | 'bonus' | 'sales' | 'gift' | 'other_income';
export type CategoryId = ExpenseCategoryId | IncomeCategoryId;
// Local calendar date "YYYY-MM-DD", 2000-01-01..2099-12-31, no time zone.
export type DateString = string;
// Local calendar month "YYYY-MM" (Gregorian; displayed in Buddhist Era).
export type YearMonth = string;

export interface Transaction {
  id: string;            // UUID v4 from generateId() (crypto.getRandomValues; never crypto.randomUUID) [PRD-AMEND A8]
  type: TxType;
  amount: number;        // integer satang, 1..9_999_999_999
  categoryId: CategoryId; // must belong to `type`
  date: DateString;
  note: string;          // trimmed, 0..200 code points counted after trim [PRD-AMEND A7, A9]
  createdAt: string;     // ISO 8601 UTC
  updatedAt: string;     // ISO 8601 UTC
}

// localStorage["expense-tracker:v1"]
export interface StoreV1 { version: 1; transactions: Transaction[] }

export interface Category { id: CategoryId; type: TxType; label: string; icon: string /* lucide-react icon name, final pick in design stage */ }

// Raw form values exactly as typed.
export interface TransactionDraft { type: TxType; amountText: string; categoryId: CategoryId | null; date: string; note: string }
export type FormField = 'amount' | 'categoryId' | 'date' | 'note';
export type FieldErrors = Partial<Record<FormField, string>>;
export interface ValidInput { type: TxType; amount: number; categoryId: CategoryId; date: DateString; note: string }
export type ValidationResult = { ok: true; value: ValidInput } | { ok: false; errors: FieldErrors; firstInvalid: FormField };

export type AmountResult =
  | { ok: true; satang: number }
  | { ok: false; error: 'required' | 'decimals' | 'too_large' };

export interface MonthSummary { income: number; expense: number; balance: number }
export interface CategoryShare { categoryId: ExpenseCategoryId; amount: number; percent: number /* integer, half-up, sum not forced to 100 [PRD-AMEND A6] */ }
export interface DayGroup { date: DateString; heading: string; items: Transaction[] }

export type StorageStatus = 'ok' | 'unavailable' | 'corrupt';
export interface LoadResult {
  status: StorageStatus;       // 'unavailable' → in-memory mode banner; 'corrupt' → backup banner
  transactions: Transaction[]; // valid records only
  skipped: number;             // invalid records dropped (raw blob backed up when > 0)
  backupKey?: string;          // set when the raw value was copied to a corrupt-* key
}
export type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'unknown' };

export type ThemePreference = 'light' | 'dark' | 'system';
export type Route = { name: 'home' } | { name: 'list' };

export interface AppState {
  transactions: Transaction[];
  selectedMonth: YearMonth;            // resets to current month on reload
  categoryFilter: CategoryId | 'all';  // not persisted
  storageStatus: StorageStatus;
  demo: boolean;
}
export interface AppActions {
  // On { ok: false } nothing changes in memory; the form stays open with its data. In 'unavailable' mode these resolve { ok: true } (memory only).
  // updateTransaction of an id removed by another tab re-inserts it (last write wins).
  addTransaction(input: ValidInput): Promise<SaveResult>;
  updateTransaction(id: string, input: ValidInput): Promise<SaveResult>;
  deleteTransaction(id: string): Promise<SaveResult>;
  setMonth(month: YearMonth): void;
  shiftMonth(delta: -1 | 1): void;
  goToCurrentMonth(): void;
  // Callers set the filter before navigate(): home "ดูทั้งหมด" → setCategoryFilter('all') [PRD-AMEND A5]; a US-11 row → setCategoryFilter(categoryId).
  setCategoryFilter(filter: CategoryId | 'all'): void;
}

// ───────────────────────── src/domain/messages.ts ─────────────────────────
/**
 * Every user-visible Thai string used by validation, toasts, banners and empty states (exact PRD wording).
 * @stories US-01, US-02, US-04, US-05, US-07, US-08, US-10, US-12
 */
export declare const MESSAGES: {
  readonly amountRequired: 'กรุณากรอกจำนวนเงินมากกว่า 0';
  readonly amountDecimals: 'ทศนิยมได้ไม่เกิน 2 ตำแหน่ง';
  readonly amountTooLarge: 'จำนวนเงินสูงเกินไป';
  readonly categoryRequired: 'กรุณาเลือกหมวดหมู่';
  readonly dateRequired: 'กรุณาเลือกวันที่';
  readonly saved: 'บันทึกแล้ว';
  readonly deleted: 'ลบแล้ว';
  readonly deleteConfirm: 'ลบรายการนี้? ไม่สามารถกู้คืนได้';
  readonly saveFailed: 'บันทึกไม่สำเร็จ: พื้นที่เก็บข้อมูลเต็มหรือใช้ไม่ได้';
  readonly storageUnavailable: 'ไม่สามารถบันทึกข้อมูลในเครื่องได้ ข้อมูลจะหายเมื่อปิดหน้า';
  readonly storageCorrupt: 'ข้อมูลเดิมอ่านไม่ได้ ได้สำรองไว้แล้ว';
  readonly emptyApp: 'ยังไม่มีรายการ เริ่มบันทึกรายการแรกของคุณ';
  readonly emptyMonth: 'ไม่มีรายการในเดือนนี้';
  readonly emptyFilter: 'ไม่มีรายการในหมวดนี้ในเดือนนี้';
  readonly privacyNote: 'ข้อมูลเก็บในเครื่องนี้เท่านั้น การล้างข้อมูล browser จะลบรายการทั้งหมด';
};

// ───────────────────────── src/domain/categories.ts ─────────────────────────
/**
 * The fixed 14 categories in PRD §5 order (9 expense, 5 income).
 * @stories US-01, US-08, US-11
 */
export declare const CATEGORIES: readonly Category[];
/**
 * Categories of one type, in display order (form chips; filter groups "รายจ่าย"/"รายรับ").
 * @stories US-01, US-08
 */
export declare function categoriesForType(type: TxType): readonly Category[];
/**
 * Lookup by id; undefined for unknown ids.
 * @stories US-07, US-11
 */
export declare function getCategory(id: string): Category | undefined;
/**
 * True when `id` is a known category of `type` (used on type switch to clear a mismatched pick).
 * @stories US-01, US-02
 */
export declare function isCategoryOfType(id: string, type: TxType): boolean;

// ───────────────────────── src/domain/money.ts ─────────────────────────
/**
 * Parse typed baht text to satang without floating point. Trims, strips commas, accepts /^\d+(\.\d*)?$|^\.\d+$/.
 * Order [PRD-AMEND A4]: empty / other format / value <= 0 → 'required'; > 2 typed decimals → 'decimals'; > 9,999,999,999 satang → 'too_large'.
 * @stories US-02
 */
export declare function parseAmountInput(text: string): AmountResult;
/**
 * "฿1,234.50"; negative values as "−฿500.00" (U+2212). th-TH grouping, always 2 decimals.
 * @stories US-05, US-08, US-10
 */
export declare function formatBaht(satang: number): string;
/**
 * List amount with sign: income "+฿150.00", expense "−฿150.00".
 * @stories US-07
 */
export declare function formatSignedAmount(tx: Pick<Transaction, 'type' | 'amount'>): string;
/**
 * Satang to the editable form text, e.g. 15050 → "150.50", 20000 → "200" (edit-mode prefill).
 * @stories US-03
 */
export declare function satangToInputText(satang: number): string;

// ───────────────────────── src/domain/dates.ts ─────────────────────────
/**
 * Today's local calendar date (re-evaluated every time the form opens).
 * @stories US-01
 */
export declare function todayLocal(now?: Date): DateString;
/**
 * Current local month "YYYY-MM".
 * @stories US-06
 */
export declare function currentMonth(now?: Date): YearMonth;
/**
 * Month arithmetic with no lower/upper limit on navigation.
 * @stories US-06
 */
export declare function addMonths(month: YearMonth, delta: number): YearMonth;
/**
 * Month heading in Thai Buddhist Era via Intl 'th-TH-u-ca-buddhist', e.g. "ตุลาคม 2569".
 * @stories US-06
 */
export declare function formatMonthTh(month: YearMonth): string;
/**
 * Day-group heading from the entry's calendar date, th-TH weekday short, e.g. "พ. 7 ต.ค. 2569" for 2026-10-07 [PRD-AMEND A1].
 * @stories US-07
 */
export declare function formatDayHeadingTh(date: DateString): string;
/**
 * Real calendar date in 2000-01-01..2099-12-31 (out of range → "กรุณาเลือกวันที่") [PRD-AMEND A3].
 * @stories US-02
 */
export declare function isValidDateString(value: string): boolean;
/**
 * "YYYY-MM" prefix of a date.
 * @stories US-05, US-07
 */
export declare function monthOf(date: DateString): YearMonth;

// ───────────────────────── src/domain/transaction.ts ─────────────────────────
/**
 * Validate the whole form at once; reports every failing field and the first one in form order
 * amount → categoryId → date → note. Note is trimmed first, then must be max 200 code points [PRD-AMEND A7, A9].
 * @stories US-02
 */
export declare function validateDraft(draft: TransactionDraft): ValidationResult;
/**
 * Note input/paste handler. The 200-code-point limit applies to trim(raw): if it fits, raw is returned unchanged
 * (leading/trailing spaces stay while typing and never count); otherwise returns the leading whitespace + the first
 * 200 code points of trim(raw). Counter "n/200" = code points of trim(result) [PRD-AMEND A7, A9].
 * @stories US-02
 */
export declare function limitNoteInput(raw: string): string;
/**
 * UUID v4 string (lowercase, RFC 9562 version/variant bits) built from crypto.getRandomValues(new Uint8Array(16)).
 * Works outside secure contexts (plain-HTTP LAN host); never calls crypto.randomUUID [PRD-AMEND A8].
 * @stories US-01
 */
export declare function generateId(): string;
/**
 * Default draft: type expense, empty amount, no category, date today, empty note.
 * @stories US-01
 */
export declare function emptyDraft(now?: Date): TransactionDraft;
/**
 * Draft prefilled from an existing transaction (edit mode).
 * @stories US-03
 */
export declare function draftFromTransaction(tx: Transaction): TransactionDraft;
/**
 * New transaction with id = generateId(), createdAt = updatedAt = now.
 * @stories US-01
 */
export declare function createTransaction(input: ValidInput, now?: Date): Transaction;
/**
 * Same id and createdAt, new updatedAt.
 * @stories US-03
 */
export declare function applyEdit(tx: Transaction, input: ValidInput, now?: Date): Transaction;
/**
 * Structural check of one stored record (load path); invalid records are skipped.
 * @stories US-12
 */
export declare function isValidTransaction(value: unknown): value is Transaction;

// ───────────────────────── src/domain/selectors.ts ─────────────────────────
/**
 * Transactions dated inside `month`.
 * @stories US-05, US-07
 */
export declare function inMonth(txs: readonly Transaction[], month: YearMonth): Transaction[];
/**
 * Sort: date desc, then createdAt desc (shared by list and home "recent") [PRD-AMEND A5].
 * @stories US-05, US-07
 */
export declare function sortNewestFirst(txs: readonly Transaction[]): Transaction[];
/**
 * Totals of one month's transactions, integer satang; balance = income − expense, no carry-over.
 * @stories US-05, US-10
 */
export declare function summarize(monthTxs: readonly Transaction[]): MonthSummary;
/**
 * Expense categories with amount > 0, amount desc; percent = round-half-up(amount*100/total). Empty array → section hidden [PRD-AMEND A2].
 * @stories US-11
 */
export declare function expenseByCategory(monthTxs: readonly Transaction[]): CategoryShare[];
/**
 * First `limit` (default 5) of sortNewestFirst(monthTxs) [PRD-AMEND A5].
 * @stories US-05
 */
export declare function recent(monthTxs: readonly Transaction[], limit?: number): Transaction[];
/**
 * Group by date (desc) with Thai headings; items createdAt desc.
 * @stories US-07
 */
export declare function groupByDay(monthTxs: readonly Transaction[]): DayGroup[];
/**
 * Apply the category filter ('all' = no filter).
 * @stories US-08
 */
export declare function filterByCategory(txs: readonly Transaction[], filter: CategoryId | 'all'): Transaction[];
/**
 * Sum of filtered transactions for "รวม ฿x".
 * @stories US-08
 */
export declare function filteredTotal(txs: readonly Transaction[]): number;

// ───────────────────────── src/storage/storage.ts ─────────────────────────
/**
 * "expense-tracker:v1"
 * @stories US-09
 */
export declare const STORAGE_KEY: 'expense-tracker:v1';
/**
 * Backup key prefix; full key = prefix + Date.now() (ms).
 * @stories US-12
 */
export declare const CORRUPT_KEY_PREFIX: 'expense-tracker:v1:corrupt-';
/**
 * Write/remove a probe key; false when localStorage throws or is missing.
 * @stories US-12
 */
export declare function probeStorage(): boolean;
/**
 * Read + parse + validate (F6). Never throws. Unparseable or wrong shape → backup raw, status 'corrupt', empty list.
 * Some invalid records → keep valid ones, back up raw blob, status 'ok'. Unknown future version → treated as corrupt (backed up).
 * After a successful backup the main key is rewritten (empty or valid-only) so reloads do not back up again.
 * If the backup write fails the main key is left untouched and status is 'unavailable' (memory only), so raw data is never lost.
 * @stories US-09, US-12
 */
export declare function loadStore(): LoadResult;
/**
 * Serialize the complete next state and write it in one setItem call; the caller commits in-memory state only on ok.
 * In 'unavailable' mode the app keeps data in memory and does not call this.
 * @stories US-01, US-03, US-04, US-09, US-12
 */
export declare function saveStore(transactions: readonly Transaction[]): SaveResult;
/**
 * Listen for `storage` events on STORAGE_KEY from other tabs and reload (last write wins). Returns unsubscribe.
 * @stories US-09
 */
export declare function subscribeExternalChanges(onChange: (result: LoadResult) => void): () => void;

// ───────────────────────── src/storage/theme.ts ─────────────────────────
/**
 * "expense-tracker:theme"
 * @stories US-09
 * @nfr PRD §7 Theme (no dedicated story; US-09 = local persistence of a preference)
 */
export declare const THEME_KEY: 'expense-tracker:theme';
/**
 * Stored preference, default 'system'; never throws.
 * @stories US-09
 * @nfr PRD §7 Theme
 */
export declare function loadThemePreference(): ThemePreference;
/**
 * Persist preference (ignored when storage unavailable) and toggle the `dark` class on <html>.
 * @stories US-09
 * @nfr PRD §7 Theme
 */
export declare function applyThemePreference(pref: ThemePreference): void;

// ───────────────────────── src/state/AppState.tsx ─────────────────────────
/**
 * React context provider: runs loadStore() once, subscribes to other tabs, holds AppState (useReducer).
 * `?demo=1` → in-memory demo data, storage never written.
 * @stories US-05, US-06, US-08, US-09, US-12
 */
export declare function AppProvider(props: { children: unknown; now?: () => Date }): unknown;
/**
 * Read the shared state (selected month and filter are shared by home and list).
 * @stories US-05, US-06, US-07, US-08
 */
export declare function useAppState(): AppState;
/**
 * Mutations; add/update/delete persist atomically before committing in memory.
 * @stories US-01, US-03, US-04, US-05, US-06, US-08, US-11
 */
export declare function useAppActions(): AppActions;

// ───────────────────────── src/state/route.ts ─────────────────────────
/**
 * Hash routes: "#/" → home, "#/list" → list. Unknown hash → home.
 * @stories US-05, US-07
 */
export declare function useRoute(): Route;
/**
 * Change the hash route only; never reads or changes the category filter. Callers set the filter first, then navigate:
 * home "ดูทั้งหมด" → setCategoryFilter('all'); navigate({ name: 'list' }) [PRD-AMEND A5];
 * a US-11 row → setCategoryFilter(categoryId); navigate({ name: 'list' }).
 * @stories US-05, US-11
 */
export declare function navigate(route: Route): void;

// ───────────────────────── src/demo/demoData.ts ─────────────────────────
/**
 * Deterministic demo set (current month + 2 previous, every category, a negative-balance month, long/emoji notes,
 * 0.1+0.2 entries). Loaded only via `?demo=1`, never in normal use. Also used as the 5,000-row perf fixture (count param).
 * @stories US-05, US-07, US-08, US-11
 */
export declare function generateDemoTransactions(now: Date, count?: number): Transaction[];
