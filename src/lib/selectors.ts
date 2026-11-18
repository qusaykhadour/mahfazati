import type { Account, Category, Currency, DB, Tx } from './types';
import { fromSypMinor, toSypMinor } from './money';

export function accountById(db: DB, id?: string): Account | undefined {
  return db.accounts.find((a) => a.id === id);
}

export function accountName(db: DB, id?: string): string {
  return accountById(db, id)?.name ?? '—';
}

export function categoryById(db: DB, id?: string): Category | undefined {
  return db.categories.find((c) => c.id === id);
}

/** رصيد الحساب: افتتاحي + دخل − مصروف + التحويلات */
export function accountBalance(db: DB, accountId: string): number {
  let balance = accountById(db, accountId)?.opening ?? 0;
  for (const tx of db.txs) {
    if (tx.kind === 'income' && tx.accountId === accountId) balance += tx.amount;
    else if (tx.kind === 'expense' && tx.accountId === accountId) balance -= tx.amount;
    else if (tx.kind === 'transfer') {
      if (tx.accountId === accountId) balance -= tx.amount;
      if (tx.toAccountId === accountId) balance += tx.toAmount ?? 0;
    }
  }
  return balance;
}

/** مجموع كل الحسابات محوّلاً إلى عملة واحدة (بالسوق المعتد) */
export function sumAccountsIn(db: DB, currency: Currency): number {
  const syp = db.accounts.reduce(
    (sum, a) => sum + toSypMinor(accountBalance(db, a.id), a.currency, db.settings),
    0
  );
  return fromSypMinor(syp, currency, db.settings);
}

/** إجمالي الثروة: كل العملات محوّلة للليرة، وما يعادلها بالدولار */
export function totalWealth(db: DB): { syp: number; usd: number } {
  const syp = db.accounts.reduce(
    (sum, a) => sum + toSypMinor(accountBalance(db, a.id), a.currency, db.settings),
    0
  );
  const usd = fromSypMinor(syp, 'USD', db.settings);
  return { syp, usd };
}

export function monthKey(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function inMonth(date: string | Date, key: string): boolean {
  return monthKey(date) === key;
}

export interface MonthTotals {
  /** كل العملات محوّلة للليرة (العملة الأساس) */
  income: number;
  expense: number;
}

export function monthTotals(db: DB, key: string): MonthTotals {
  let income = 0;
  let expense = 0;
  for (const tx of db.txs) {
    if (!inMonth(tx.date, key)) continue;
    if (tx.kind === 'income') income += toSypMinor(tx.amount, tx.currency, db.settings);
    else if (tx.kind === 'expense') expense += toSypMinor(tx.amount, tx.currency, db.settings);
  }
  return { income, expense };
}

export interface DayGroup {
  day: string;
  label: string;
  txs: Tx[];
}

const AR_MONTHS = [
  'كانون الثاني',
  'شباط',
  'آذار',
  'نيسان',
  'أيار',
  'حزيران',
  'تموز',
  'آب',
  'أيلول',
  'تشرين الأول',
  'تشرين الثاني',
  'كانون الأول',
];

const AR_WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function dayKey(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function dayLabel(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(d) === dayKey(today)) return 'اليوم';
  if (dayKey(d) === dayKey(yesterday)) return 'أمس';
  return `${AR_WEEKDAYS[d.getDay()]} ${d.getDate()} ${AR_MONTHS[d.getMonth()]}`;
}

export function groupByDay(txs: Tx[]): DayGroup[] {
  const map = new Map<string, Tx[]>();
  for (const tx of txs) {
    const key = dayKey(tx.date);
    const list = map.get(key);
    if (list) list.push(tx);
    else map.set(key, [tx]);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, group]) => ({
      day,
      label: dayLabel(group[0].date),
      txs: group.sort((a, b) => (a.date < b.date ? 1 : -1)),
    }));
}

export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return `${AR_MONTHS[(month ?? 1) - 1]} ${year}`;
}

export function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split('-').map(Number);
  const d = new Date(year, (month ?? 1) - 1 + delta, 1);
  return monthKey(d);
}

export interface CategorySlice {
  categoryId: string;
  name: string;
  color: string;
  emoji: string;
  total: number;
  share: number;
}

/** توزيع فئة على الشهر — كل العملات محوّلة للليرة (العملة الأساس) */
export function categoryBreakdown(db: DB, kind: 'expense' | 'income', month: string): CategorySlice[] {
  const sums = new Map<string, number>();
  let total = 0;
  for (const tx of db.txs) {
    if (tx.kind !== kind || !inMonth(tx.date, month)) continue;
    const id = tx.categoryId ?? 'cat-other';
    const syp = toSypMinor(tx.amount, tx.currency, db.settings);
    sums.set(id, (sums.get(id) ?? 0) + syp);
    total += syp;
  }
  return [...sums.entries()]
    .map(([categoryId, sum]) => {
      const category = categoryById(db, categoryId);
      return {
        categoryId,
        name: category?.name ?? 'أخرى',
        color: category?.color ?? '#64748B',
        emoji: category?.emoji ?? '📦',
        total: sum,
        share: total > 0 ? sum / total : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function debtRemaining(paid: number, amount: number): number {
  return Math.max(0, amount - paid);
}

export function todayISO(): string {
  return new Date().toISOString();
}
