import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { defaultDB, loadDB, saveDB, clearDB, parseImportedDB } from './storage';
import { saveDailyBackup } from './backups';
import { themeOf, type Theme } from './theme';
import type { Account, Category, DB, Debt, Goal, Settings, Tx } from './types';
import { todayISO } from './selectors';

export function newId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

interface StoreValue {
  db: DB;
  ready: boolean;
  theme: Theme;
  setTheme: (theme: 'light' | 'dark') => void;
  addTx: (input: Omit<Tx, 'id'>) => void;
  updateTx: (id: string, patch: Partial<Tx>) => void;
  removeTx: (id: string) => void;
  addAccount: (input: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  removeAccount: (id: string) => void;
  addDebt: (input: Omit<Debt, 'id'>) => void;
  updateDebt: (id: string, patch: Partial<Debt>) => void;
  removeDebt: (id: string) => void;
  addGoal: (input: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  addCategory: (input: Omit<Category, 'id'>) => void;
  removeCategory: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceDB: (next: DB) => void;
  importFromText: (text: string) => void;
  resetAll: () => Promise<void>;
  exportText: () => string;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(defaultDB);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    loadDB().then(({ db: loaded, ok }) => {
      if (!alive) return;
      setDb(loaded);
      setReady(ok);
      // نسخة احتياطية داخلية يومية (آخر ٧ أيام) — صامتة ولا تعطل التطبيق
      if (ok) saveDailyBackup(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);

  // الحفظ فقط بعد تحميل ناجح — لا نكتب فوق بيانات تالفة/غير قابلة للفك
  useEffect(() => {
    if (!ready) return;
    saveDB(db).catch(() => {});
  }, [db, ready]);

  const value = useMemo<StoreValue>(() => {
    const patch = (fn: (current: DB) => DB) => setDb((current) => fn(current));

    return {
      db,
      ready,
      theme: themeOf(db.settings.theme),
      setTheme: (theme) =>
        patch((current) => ({ ...current, settings: { ...current.settings, theme } })),

      addTx: (input) =>
        patch((current) => ({ ...current, txs: [{ ...input, id: newId('tx') }, ...current.txs] })),
      updateTx: (id, next) =>
        patch((current) => ({
          ...current,
          txs: current.txs.map((tx) => (tx.id === id ? { ...tx, ...next } : tx)),
        })),
      removeTx: (id) =>
        patch((current) => ({ ...current, txs: current.txs.filter((tx) => tx.id !== id) })),

      addAccount: (input) =>
        patch((current) => ({
          ...current,
          accounts: [...current.accounts, { ...input, id: newId('acc') }],
        })),
      updateAccount: (id, next) =>
        patch((current) => ({
          ...current,
          accounts: current.accounts.map((a) => (a.id === id ? { ...a, ...next } : a)),
        })),
      removeAccount: (id) =>
        patch((current) => ({
          ...current,
          accounts: current.accounts.filter((a) => a.id !== id),
          txs: current.txs.filter((tx) => tx.accountId !== id && tx.toAccountId !== id),
        })),

      addDebt: (input) =>
        patch((current) => ({
          ...current,
          debts: [{ ...input, id: newId('debt') }, ...current.debts],
        })),
      updateDebt: (id, next) =>
        patch((current) => ({
          ...current,
          debts: current.debts.map((d) => (d.id === id ? { ...d, ...next } : d)),
        })),
      removeDebt: (id) =>
        patch((current) => ({ ...current, debts: current.debts.filter((d) => d.id !== id) })),

      addGoal: (input) =>
        patch((current) => ({
          ...current,
          goals: [{ ...input, id: newId('goal') }, ...current.goals],
        })),
      updateGoal: (id, next) =>
        patch((current) => ({
          ...current,
          goals: current.goals.map((g) => (g.id === id ? { ...g, ...next } : g)),
        })),
      removeGoal: (id) =>
        patch((current) => ({ ...current, goals: current.goals.filter((g) => g.id !== id) })),

      addCategory: (input) =>
        patch((current) => ({
          ...current,
          categories: [...current.categories, { ...input, id: newId('cat') }],
        })),
      removeCategory: (id) =>
        patch((current) => ({
          ...current,
          categories: current.categories.filter((c) => c.id !== id),
          txs: current.txs.map((tx) =>
            tx.categoryId === id ? { ...tx, categoryId: undefined } : tx
          ),
        })),

      updateSettings: (next) =>
        patch((current) => ({ ...current, settings: { ...current.settings, ...next } })),

      replaceDB: (next) => setDb({ ...next, version: 2 }),

      importFromText: (text) => setDb(parseImportedDB(text)),

      resetAll: async () => {
        await clearDB();
        setDb(defaultDB());
      },

      exportText: () => JSON.stringify(db, null, 2),
    };
  }, [db, ready]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}

export function nowISO(): string {
  return todayISO();
}
