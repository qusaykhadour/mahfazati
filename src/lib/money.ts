import type { Currency, RateMarket, RateQuote, Settings } from './types';

export const CURRENCIES: Record<
  Currency,
  { decimals: number; symbol: string; label: string; short: string; flag: string }
> = {
  SYP: { decimals: 0, symbol: 'ل.س', label: 'ليرة سورية', short: 'ل.س', flag: '🇸🇾' },
  TRY: { decimals: 2, symbol: '₺', label: 'ليرة تركية', short: 'ل.ت', flag: '🇹🇷' },
  USD: { decimals: 2, symbol: '$', label: 'دولار أمريكي', short: '$', flag: '🇺🇸' },
  EUR: { decimals: 2, symbol: '€', label: 'يورو', short: '€', flag: '🇪🇺' },
  CNY: { decimals: 2, symbol: '¥', label: 'يوان صيني', short: '¥', flag: '🇨🇳' },
};

export const CURRENCY_ORDER: Currency[] = ['SYP', 'USD', 'EUR', 'TRY', 'CNY'];

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** يحوّل الأرقام العربية/الفارسية والفاصلة العربية إلى صيغة يقرأها Number */
export function normalizeDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/٫/g, '.')
    .replace(/٬/g, '')
    .replace(/,/g, '')
    .replace(/\s|\u00a0/g, '')
    .trim();
}

export function minorFactor(currency: Currency): number {
  return Math.pow(10, CURRENCIES[currency].decimals);
}

export function numberToMinor(value: number, currency: Currency): number {
  return Math.round(value * minorFactor(currency));
}

export function minorToNumber(minor: number, currency: Currency): number {
  return minor / minorFactor(currency);
}

/** سقف المبلغ بأصغر وحدة (مليون مليار) — يمنع الأرقام الخيالية دون كسر الاستعمال العادي */
const MAX_AMOUNT_MINOR = 1_000_000_000_000_000;

/** سقف سعر الصرف اليدوي (ليرة لكل وحدة) */
export const MAX_RATE = 1_000_000_000;

/** يقرأ مبلغ مكتوب بيد المستخدم ويحوّله لأصغر وحدة (عدد صحيح، مقيّد بسقف أعلى) */
export function parseAmount(input: string, currency: Currency): number {
  const normalized = normalizeDigits(input);
  if (!normalized || normalized === '.' || normalized === '-') return 0;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return 0;
  const minor = numberToMinor(value, currency);
  if (minor <= 0) return minor; // السالب يُقرأ كأنه سالب — النماذج ترفضه
  return Math.min(minor, MAX_AMOUNT_MINOR);
}

/** نص مناسب لحقل إدخال (بدون فواصل آلاف) */
export function amountToInput(minor: number, currency: Currency): string {
  if (!minor) return '';
  const factor = minorFactor(currency);
  const value = minor / factor;
  return String(Number(value.toFixed(CURRENCIES[currency].decimals)));
}

export function formatMoney(
  minor: number,
  currency: Currency,
  opts?: { sign?: boolean; hidden?: boolean }
): string {
  if (opts?.hidden) return '••••';
  const { decimals, symbol } = CURRENCIES[currency];
  const value = minor / Math.pow(10, decimals);
  const body = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const negative = value < 0;
  const prefix = negative ? '-' : opts?.sign ? '+' : '';
  return `${prefix}${body} ${symbol}`;
}

/** مبلغ بدون رمز العملة — للاستخدام داخل جملة */
export function formatNumber(minor: number, currency: Currency): string {
  const { decimals } = CURRENCIES[currency];
  return (minor / Math.pow(10, decimals)).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

/** سعر عملة مقابل الليرة — الليرة نفسها سعرها 1/1 دائماً */
export function rateQuote(settings: Settings, currency: Currency, market?: RateMarket): RateQuote {
  if (currency === 'SYP') return { buy: 1, sell: 1, source: 'أصل' };
  const preferred = market ?? settings.preferredMarket;
  const entry = settings.rates[currency];
  const quote = entry?.[preferred];
  const fallback = entry?.parallel ?? entry?.official;
  if (quote && quote.buy > 0 && quote.sell > 0) return quote;
  if (fallback && fallback.buy > 0 && fallback.sell > 0) return fallback;
  // لا سعر معروف بعد — نتعامل كأن العملة تساوي ربع دولار تقديراً آمناً من التعطيل؟ لا: نرجع صفراً ونترك الشاشات تخفي
  return { buy: 0, sell: 0, source: 'غير متوفر' };
}

/** كم ليرة (أصغر وحدة) تساوي مبلغاً بأي عملة — حسب السوق المعتد */
export function toSypMinor(
  amountMinor: number,
  currency: Currency,
  settings: Settings,
  market?: RateMarket
): number {
  if (currency === 'SYP') return amountMinor;
  const quote = rateQuote(settings, currency, market);
  if (!quote.buy) return 0;
  const value = amountMinor / minorFactor(currency);
  return Math.round(value * quote.buy);
}

/** كم يساوي مبلغ ليري (أصغر وحدة) بعملة أخرى — حسب السوق المعتد */
export function fromSypMinor(
  sypMinor: number,
  currency: Currency,
  settings: Settings,
  market?: RateMarket
): number {
  if (currency === 'SYP') return sypMinor;
  const quote = rateQuote(settings, currency, market);
  if (!quote.buy) return 0;
  const value = sypMinor / quote.buy;
  return Math.round(value * minorFactor(currency));
}

/** تحويل مباشر بين أي عملتين عبر الليرة (العملة الأساس) */
export function convertMinor(
  amountMinor: number,
  from: Currency,
  to: Currency,
  settings: Settings,
  market?: RateMarket
): number {
  if (from === to) return amountMinor;
  return fromSypMinor(toSypMinor(amountMinor, from, settings, market), to, settings, market);
}
