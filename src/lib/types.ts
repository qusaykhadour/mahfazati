export type Currency = 'SYP' | 'TRY' | 'USD' | 'EUR' | 'CNY';

/** السوق المعتد في سوريا: parallel = السوق السودا (الموازي)، official = السعر الرسمي (المصرف) */
export type RateMarket = 'parallel' | 'official';

export type AccountKind = 'cash' | 'bank' | 'wallet';

export type TxKind = 'expense' | 'income' | 'transfer';

export type CategoryKind = 'expense' | 'income';

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  currency: Currency;
  /** رصيد افتتاحي بأصغر وحدة */
  opening: number;
}

export interface Tx {
  id: string;
  kind: TxKind;
  /** المبلغ بأصغر وحدة، دائماً موجب */
  amount: number;
  currency: Currency;
  accountId: string;
  /** للتحويل فقط: الحساب المستقبل */
  toAccountId?: string;
  /** للتحويل فقط: المبلغ الواصل بأصغر وحدة بعملة الحساب المستقبل */
  toAmount?: number;
  categoryId?: string;
  note?: string;
  /** ISO date */
  date: string;
}

export type DebtDirection = 'owed' | 'owing';

export interface Debt {
  id: string;
  /** owed = لي عند الناس، owing = عليّ للناس */
  direction: DebtDirection;
  person: string;
  amount: number;
  /** المسدَّد بأصغر وحدة */
  paid: number;
  currency: Currency;
  note?: string;
  date: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  currency: Currency;
  note?: string;
}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  emoji: string;
}

/** سعر عملة واحدة مقابل الليرة: شراء = كم ليرة تعطيها لشراء وحدة منها، بيع = كم ليرة تأخذ عند بيعها */
export interface RateQuote {
  buy: number;
  sell: number;
  updatedAt?: string;
  source?: string;
  /** يدوي = المستخدم أدخله بنفسه ولا يجيبه التحديث التلقائي */
  manual?: boolean;
}

/** أسعار عملة واحدة في السوقين */
export interface CurrencyRates {
  parallel: RateQuote;
  official: RateQuote;
}

export interface Settings {
  theme: 'light' | 'dark';
  /** العملة الأساس للتجميع والتقارير — سوريا: الليرة السورية */
  baseCurrency: Currency;
  /** السوق المعتد للتحويل والتقارير */
  preferredMarket: RateMarket;
  /** جدول الأسعار: لكل عملة سعرا السوق السودا والرسمي مقابل الليرة */
  rates: Partial<Record<Currency, CurrencyRates>>;
  /** قفل التطبيق بالبصمة/الوجه مع قفل تلقائي بعد الغياب */
  lockEnabled?: boolean;
  /** إخفاء كل الأرقام (وضع العين) */
  hideAmounts?: boolean;
  /** اكتملت شاشة الترحيب الأولى */
  welcomed?: boolean;
  /** اسم المالك (اختياري، للترحيب) */
  userName?: string;
}

export interface DB {
  version: number;
  accounts: Account[];
  txs: Tx[];
  debts: Debt[];
  goals: Goal[];
  categories: Category[];
  settings: Settings;
}
