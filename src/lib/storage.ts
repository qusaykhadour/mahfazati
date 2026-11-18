import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Account, Category, Currency, CurrencyRates, Debt, Goal, RateQuote, Settings, Tx, DB } from './types';
import { CURRENCY_ORDER } from './money';
import { decryptText, encryptText, isEncryptedPayload } from './crypt';

const KEY = 'mahfazati.db.v1';
const RESCUE_KEY = 'mahfazati.db.rescue.v1';

/** سقف المبلغ بأصغر وحدة: 10^15 = مليون مليار ليرة — يمنع الأرقام الخيالية */
export const MAX_AMOUNT_MINOR = 1_000_000_000_000_000;
/** حدود عناصر الاستيراد — حماية من ملفات ضخمة أو حقن عناصر كثيرة */
const MAX_ACCOUNTS = 200;
const MAX_TXS = 20000;
const MAX_DEBTS = 2000;
const MAX_GOALS = 200;
const MAX_CATEGORIES = 200;

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'طعام', kind: 'expense', color: '#F97316', emoji: '🍽️' },
  { id: 'cat-transport', name: 'مواصلات', kind: 'expense', color: '#0EA5E9', emoji: '🚕' },
  { id: 'cat-bills', name: 'فواتير', kind: 'expense', color: '#8B5CF6', emoji: '🧾' },
  { id: 'cat-home', name: 'منزل', kind: 'expense', color: '#14B8A6', emoji: '🏠' },
  { id: 'cat-health', name: 'صحة', kind: 'expense', color: '#EF4444', emoji: '🩺' },
  { id: 'cat-study', name: 'تعليم', kind: 'expense', color: '#6366F1', emoji: '📚' },
  { id: 'cat-shopping', name: 'تسوق', kind: 'expense', color: '#EC4899', emoji: '🛍️' },
  { id: 'cat-fun', name: 'ترفيه', kind: 'expense', color: '#F59E0B', emoji: '🎬' },
  { id: 'cat-other', name: 'أخرى', kind: 'expense', color: '#64748B', emoji: '📦' },
  { id: 'cat-salary', name: 'راتب', kind: 'income', color: '#16A34A', emoji: '💼' },
  { id: 'cat-freelance', name: 'عمل حر', kind: 'income', color: '#10B981', emoji: '🛠️' },
  { id: 'cat-gift', name: 'هدية', kind: 'income', color: '#22C55E', emoji: '🎁' },
  { id: 'cat-other-in', name: 'أخرى', kind: 'income', color: '#0D9488', emoji: '➕' },
];

export function defaultRates(): Settings['rates'] {
  return {
    SYP: {
      parallel: { buy: 1, sell: 1, source: 'أصل', manual: true },
      official: { buy: 1, sell: 1, source: 'أصل', manual: true },
    },
  };
}

export function defaultDB(): DB {
  return {
    version: 2,
    accounts: [
      { id: 'acc-cash', name: 'نقداً', kind: 'cash', currency: 'SYP', opening: 0 },
      { id: 'acc-cash-usd', name: 'نقداً دولار', kind: 'cash', currency: 'USD', opening: 0 },
    ],
    txs: [],
    debts: [],
    goals: [],
    categories: DEFAULT_CATEGORIES,
    settings: {
      theme: 'light',
      baseCurrency: 'SYP',
      preferredMarket: 'parallel',
      rates: defaultRates(),
    },
  };
}

/* ============ أدوات التحقق العميق (استيراد + تحميل) ============ */

function capAmount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const v = Math.round(value);
  if (v < 0 || v > MAX_AMOUNT_MINOR) return null;
  return v;
}

function boundedString(value: unknown, min: number, max: number): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (s.length < min || s.length > max) return null;
  return s;
}

function isValidCurrency(value: unknown): value is Currency {
  return CURRENCY_ORDER.includes(value as Currency);
}

function sanitizeAccount(raw: unknown): Account | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  const id = boundedString(a.id, 1, 64);
  const name = boundedString(a.name, 1, 120);
  const kind = a.kind === 'cash' || a.kind === 'bank' || a.kind === 'wallet' ? a.kind : null;
  const opening = capAmount(a.opening ?? 0);
  if (!id || !name || !kind || opening === null) return null;
  if (!isValidCurrency(a.currency)) return null;
  return { id, name, kind, currency: a.currency, opening };
}

function sanitizeTx(raw: unknown): Tx | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  const id = boundedString(t.id, 1, 64);
  const kind = t.kind === 'expense' || t.kind === 'income' || t.kind === 'transfer' ? t.kind : null;
  const amount = capAmount(t.amount);
  const accountId = boundedString(t.accountId, 1, 64);
  const date = boundedString(t.date, 4, 40);
  if (!id || !kind || amount === null || !accountId || !date) return null;
  if (!isValidCurrency(t.currency)) return null;
  const note = t.note == null ? undefined : boundedString(t.note, 1, 300);
  const categoryId = t.categoryId == null ? undefined : boundedString(t.categoryId, 1, 64);
  const tx: Tx = { id, kind, amount, currency: t.currency, accountId, date };
  if (note) tx.note = note;
  if (categoryId) tx.categoryId = categoryId;
  if (kind === 'transfer') {
    const toAccountId = boundedString(t.toAccountId, 1, 64);
    const toAmount = capAmount(t.toAmount);
    if (!toAccountId || toAmount === null || toAmount === 0) return null;
    if (toAccountId === accountId) return null;
    tx.toAccountId = toAccountId;
    tx.toAmount = toAmount;
  }
  if (Number.isNaN(new Date(date).getTime())) return null;
  return tx;
}

function sanitizeDebt(raw: unknown): Debt | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  const id = boundedString(d.id, 1, 64);
  const person = boundedString(d.person, 1, 120);
  const amount = capAmount(d.amount);
  const paid = capAmount(d.paid ?? 0);
  const date = boundedString(d.date, 4, 40);
  const direction = d.direction === 'owed' || d.direction === 'owing' ? d.direction : null;
  if (!id || !person || !direction || amount === null || paid === null || !date) return null;
  if (!isValidCurrency(d.currency)) return null;
  if (paid > amount) return null;
  const debt: Debt = { id, direction, person, amount, paid, currency: d.currency, date };
  const note = d.note == null ? undefined : boundedString(d.note, 1, 300);
  if (note) debt.note = note;
  return debt;
}

function sanitizeGoal(raw: unknown): Goal | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as Record<string, unknown>;
  const id = boundedString(g.id, 1, 64);
  const name = boundedString(g.name, 1, 120);
  const target = capAmount(g.target);
  const saved = capAmount(g.saved ?? 0);
  if (!id || !name || target === null || saved === null) return null;
  if (!isValidCurrency(g.currency)) return null;
  const goal: Goal = { id, name, target, saved, currency: g.currency };
  const note = g.note == null ? undefined : boundedString(g.note, 1, 300);
  if (note) goal.note = note;
  return goal;
}

function sanitizeCategory(raw: unknown): Category | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  const id = boundedString(c.id, 1, 64);
  const name = boundedString(c.name, 1, 60);
  const kind = c.kind === 'expense' || c.kind === 'income' ? c.kind : null;
  const color = boundedString(c.color, 1, 32) ?? '#0EA5E9';
  const emoji = boundedString(c.emoji, 1, 16) ?? '🏷️';
  if (!id || !name || !kind) return null;
  return { id, name, kind, color, emoji };
}

/** ترقية إعدادات النسخة ١ (rateBuy/rateSell) إلى جدول الأسعار الجديد */
function migrateSettings(rawSettings: Record<string, unknown>, base: Settings): Settings {
  const next: Settings = { ...base, ...(rawSettings as Partial<Settings>) };

  // نسخة ١: حقلان rateBuy/rateSell بسعر الدولار السودا — ننقلهما إلى جدول الأسعار
  const oldBuy = Number((rawSettings as { rateBuy?: number }).rateBuy);
  const oldSell = Number((rawSettings as { rateSell?: number }).rateSell);
  const hasOldUsd = Number.isFinite(oldBuy) && oldBuy > 0 && Number.isFinite(oldSell) && oldSell > 0;

  if (!next.rates || typeof next.rates !== 'object') next.rates = {};
  if (hasOldUsd && !next.rates.USD) {
    next.rates.USD = {
      parallel: {
        buy: Number(oldBuy.toFixed(2)),
        sell: Number(oldSell.toFixed(2)),
        source: 'ترقية من النسخة السابقة',
        manual: true,
      },
      official: { buy: 0, sell: 0, manual: true },
    };
  }

  // ضمان وجود الليرة 1/1 دائماً
  if (!next.rates.SYP) next.rates.SYP = defaultRates().SYP;

  next.baseCurrency = 'SYP';
  next.preferredMarket = next.preferredMarket === 'official' ? 'official' : 'parallel';
  next.theme = next.theme === 'dark' ? 'dark' : 'light';
  // إعدادات الأمان إجبارياً منطقية صحيحة
  next.lockEnabled = next.lockEnabled === true;
  next.hideAmounts = next.hideAmounts === true;
  next.welcomed = next.welcomed === true;
  if (typeof next.userName !== 'string' || next.userName.length > 80) next.userName = undefined;
  return next;
}

function sanitizeRates(rates: Settings['rates']): Settings['rates'] {
  const clean: Settings['rates'] = {};
  for (const code of CURRENCY_ORDER) {
    const entry = rates[code];
    if (!entry || typeof entry !== 'object') continue;
    const asQuote = (q: unknown): RateQuote | undefined => {
      if (!q || typeof q !== 'object') return undefined;
      const { buy, sell } = q as { buy?: number; sell?: number };
      const b = Number(buy);
      const s = Number(sell);
      if (!Number.isFinite(b) || !Number.isFinite(s)) return undefined;
      if (b < 0 || b > 1e9 || s < 0 || s > 1e9) return undefined;
      return { ...(q as RateQuote), buy: b, sell: s };
    };
    const parallel = asQuote((entry as CurrencyRates).parallel);
    const official = asQuote((entry as CurrencyRates).official);
    if (parallel || official) {
      clean[code] = {
        parallel: parallel ?? { buy: 0, sell: 0, manual: true },
        official: official ?? { buy: 0, sell: 0, manual: true },
      };
    }
  }
  if (!clean.SYP) clean.SYP = defaultRates().SYP;
  return clean;
}

function sanitize(raw: unknown): DB {
  const base = defaultDB();
  if (!raw || typeof raw !== 'object') return base;
  const db = raw as Partial<DB>;
  const rawSettings = (db.settings ?? {}) as Record<string, unknown>;
  const settings = migrateSettings(rawSettings, base.settings);
  settings.rates = sanitizeRates(settings.rates);
  const accounts = (Array.isArray(db.accounts) ? db.accounts : [])
    .map(sanitizeAccount)
    .filter((a): a is Account => a !== null)
    .slice(0, MAX_ACCOUNTS);
  return {
    version: 2,
    accounts: accounts.length ? accounts : base.accounts,
    txs: (Array.isArray(db.txs) ? db.txs : [])
      .map(sanitizeTx)
      .filter((t): t is Tx => t !== null)
      .slice(0, MAX_TXS),
    debts: (Array.isArray(db.debts) ? db.debts : [])
      .map(sanitizeDebt)
      .filter((d): d is Debt => d !== null)
      .slice(0, MAX_DEBTS),
    goals: (Array.isArray(db.goals) ? db.goals : [])
      .map(sanitizeGoal)
      .filter((g): g is Goal => g !== null)
      .slice(0, MAX_GOALS),
    categories: (() => {
      const cats = (Array.isArray(db.categories) ? db.categories : [])
        .map(sanitizeCategory)
        .filter((c): c is Category => c !== null)
        .slice(0, MAX_CATEGORIES);
      return cats.length ? cats : base.categories;
    })(),
    settings,
  };
}

export interface LoadResult {
  db: DB;
  /** false = البيانات المحفوظة تالفة/غير قابلة للقراءة — نمنع الحفظ فوقها تلقائياً */
  ok: boolean;
}

export async function loadDB(): Promise<LoadResult> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { db: defaultDB(), ok: true };
    let text = raw;
    if (isEncryptedPayload(raw)) {
      text = await decryptText(raw);
    }
    // غير مشفرة (نسخة قديمة) = تُقرأ كنص وتُشفَّر تلقائياً عند أول حفظ
    return { db: sanitize(JSON.parse(text)), ok: true };
  } catch {
    // حماية من الفقد: ننسخ المحفوظات التالفة لصندوق إنقاذ ولا نسمح بالحفظ فوقها
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) await AsyncStorage.setItem(RESCUE_KEY, raw);
    } catch {
      // تجاهل
    }
    return { db: defaultDB(), ok: false };
  }
}

export async function saveDB(db: DB): Promise<void> {
  // Fail-Closed: التشفير شرط للكتابة. إذا تعذّر التشفير (وضع locked مثلاً) لا نكتب شيئاً
  // حتى لا نستبدل مخزوناً مشفراً موجوداً بنص صريح أو ننزاح عن مفتاح آخر.
  const payload = await encryptText(JSON.stringify(db));
  await AsyncStorage.setItem(KEY, payload);
}

export async function clearDB(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

/** مسح شامل بوعي المستخدم: كل المخزون المشفر + الإنقاذ + النسخ الداخلية + بذرة المفتاح المحلي */
export async function purgeAll(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(KEY),
    AsyncStorage.removeItem(RESCUE_KEY),
    AsyncStorage.removeItem('mahfazati.db.backups.v1'),
    AsyncStorage.removeItem('mahfazati.db.pre-restore.v1'),
    AsyncStorage.removeItem('mahfazati.crypt.mode.v1'),
    AsyncStorage.removeItem('mahfazati.crypt.fallback.seed.v1'),
  ]).catch(() => {});
}

export function parseImportedDB(text: string): DB {
  const parsed = JSON.parse(text);
  const db = sanitize(parsed);
  const raw = parsed as DB;
  const looksLikeWallet =
    Array.isArray(raw?.accounts) || Array.isArray(raw?.txs) || Array.isArray(raw?.debts);
  if (!looksLikeWallet) throw new Error('الملف لا يحتوي بيانات صالحة');
  return db;
}
