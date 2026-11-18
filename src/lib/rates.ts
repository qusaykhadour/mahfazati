import type { Currency, RateQuote } from './types';

const PAGE_URL = 'https://sp-today.com/';

/**
 * صفحة س بي توداي الرئيسية تحمل بيانات السوق السودا (الموازي) داخل حمولة React Server
 * Components: مصفوفة «rates» فيها عنصر لكل عملة بصيغة:
 *   "code":"USD" ... "cities":{"damascus":{"buy":14950,"sell":15000, ...}}
 * القيم مضروبة ×100 (بالقرش السوري). الناتج دائماً بالليرة الجديدة لكل وحدة من العملة.
 * العملات المتوفرة تلقائياً: الدولار واليورو والليرة التركية (وغيرها).
 * اليوان الصيني والسعر الرسمي (المصرف) غير متوفرين في الصفحة — يُدخلان يدوياً.
 */

export interface FetchedRates {
  quotes: Partial<Record<Currency, RateQuote>>;
  /** العملات التي وُجدت أسعارها تلقائياً */
  found: Currency[];
  source: string;
}

function decodePayload(html: string): string {
  return html.replace(/\\"/g, '"');
}

function valueFromPiastres(raw: number): number {
  return Number((raw >= 1000 ? raw / 100 : raw).toFixed(2));
}

/** يستخرج أسعار دمشق لكل عملة معروفة من النص الخام */
export function parseRatesFromHtml(html: string): Partial<Record<Currency, RateQuote>> {
  const clean = decodePayload(html);
  const quotes: Partial<Record<Currency, RateQuote>> = {};
  const wanted: Currency[] = ['USD', 'EUR', 'TRY', 'CNY'];

  const marker = clean.search(/"rates"\s*:\s*\[/);
  const region =
    marker >= 0 ? clean.slice(marker, marker + 40000) : clean.slice(0, 60000);

  for (const code of wanted) {
    const entryRegex = new RegExp(`"code"\\s*:\\s*"${code}"[\\s\\S]{0,2000}?"damascus"\\s*:\\s*\\{\\s*"buy"\\s*:\\s*(\\d+)\\s*,\\s*"sell"\\s*:\\s*(\\d+)`);
    const match = entryRegex.exec(region);
    if (!match) continue;
    const buy = valueFromPiastres(Number(match[1]));
    const sell = valueFromPiastres(Number(match[2]));
    if (buy <= 0 || sell <= 0) continue;

    const updatedMatch = /"updated_at"\s*:\s*"([^"]+)"/.exec(region);
    quotes[code] = {
      buy,
      sell,
      updatedAt: updatedMatch ? updatedMatch[1] : new Date().toISOString(),
      source: 'س بي توداي · السوق الموازي',
    };
  }

  return quotes;
}

export async function fetchRates(): Promise<FetchedRates> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(PAGE_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) throw new Error(`تعذّر الوصول إلى المصدر (HTTP ${res.status})`);
    const html = await res.text();
    const quotes = parseRatesFromHtml(html);
    const found = (Object.keys(quotes) as Currency[]).filter(
      (code) => quotes[code] && quotes[code]!.buy > 0
    );
    if (found.length === 0) throw new Error('لم أجد أسعاراً صالحة في صفحة المصدر');
    return { quotes, found, source: 'س بي توداي · السوق الموازي (دمشق)' };
  } finally {
    clearTimeout(timer);
  }
}

/** توافق خلفي: جلب الدولار فقط (استُخدم في الإصدار السابق) */
export async function fetchUsdRate(): Promise<RateQuote> {
  const result = await fetchRates();
  const quote = result.quotes.USD;
  if (!quote) throw new Error('لم أجد سعر الدولار في صفحة المصدر');
  return quote;
}
