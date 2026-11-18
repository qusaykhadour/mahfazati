import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DB } from './types';
import { decryptText, encryptText, isEncryptedPayload } from './crypt';

/**
 * نسخ احتياطية داخلية يومية: آخر ٧ أيام محفوظة على الجهاز نفسه.
 * تُكتب تلقائياً مرة كل يوم عند أول فتح، وتُسترجع من الإعدادات إذا حصل عطل.
 */

const BACKUPS_KEY = 'mahfazati.db.backups.v1';
export const MAX_BACKUPS = 7;

export interface StoredBackup {
  /** يوم النسخة YYYY-MM-DD */
  day: string;
  /** وقت الإنشاء الفعلي */
  createdAt: string;
  data: DB;
}

function dayKeyOf(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export async function loadBackups(): Promise<StoredBackup[]> {
  try {
    const raw = await AsyncStorage.getItem(BACKUPS_KEY);
    if (!raw) return [];
    const text = isEncryptedPayload(raw) ? await decryptText(raw) : raw; // النسخ القديمة نص صريح — تُقرأ وتُشفَّر عند الحفظ التالي
    const parsed = JSON.parse(text) as StoredBackup[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((b) => b && typeof b.day === 'string' && b.data && Array.isArray(b.data.txs));
  } catch {
    return [];
  }
}

async function writeBackups(list: StoredBackup[]): Promise<void> {
  const json = JSON.stringify(list);
  let payload: string;
  try {
    payload = await encryptText(json);
  } catch {
    payload = json; // لا نفقد النسخ أبداً — يعاد التشفير في الحفظ التالي
  }
  await AsyncStorage.setItem(BACKUPS_KEY, payload);
}

/** يحفظ نسخة اليوم (يستبدل نسخة اليوم إن وجدت) ويحتفظ بآخر ٧ أيام */
export async function saveDailyBackup(db: DB): Promise<void> {
  try {
    const list = await loadBackups();
    const today = dayKeyOf();
    const entry: StoredBackup = { day: today, createdAt: new Date().toISOString(), data: db };
    const others = list.filter((b) => b.day !== today);
    const next = [entry, ...others].sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, MAX_BACKUPS);
    await writeBackups(next);
  } catch {
    // النسخ الداخلية لا تعطل التطبيق أبداً
  }
}

export async function clearBackups(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BACKUPS_KEY);
  } catch {
    // تجاهل
  }
}

/** نسخة أمان من البيانات الحالية قبل أي استرجاع — تُستعمل للتراجع عن الاسترجاع */
const SNAPSHOT_KEY = 'mahfazati.db.pre-restore.v1';

export async function saveRestoreSnapshot(db: DB): Promise<void> {
  try {
    const entry: StoredBackup = { day: 'pre-restore', createdAt: new Date().toISOString(), data: db };
    await writeBackupsEntry(SNAPSHOT_KEY, entry);
  } catch {
    // تجاهل
  }
}

export async function loadRestoreSnapshot(): Promise<StoredBackup | null> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const text = isEncryptedPayload(raw) ? await decryptText(raw) : raw;
    const parsed = JSON.parse(text) as StoredBackup;
    if (parsed?.data && Array.isArray(parsed.data.txs)) return parsed;
    return null;
  } catch {
    return null;
  }
}

async function writeBackupsEntry(key: string, entry: StoredBackup): Promise<void> {
  const json = JSON.stringify(entry);
  let payload: string;
  try {
    payload = await encryptText(json);
  } catch {
    payload = json;
  }
  await AsyncStorage.setItem(key, payload);
}

export function backupLabel(backup: StoredBackup): string {
  const created = new Date(backup.createdAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(created.getHours())}:${pad(created.getMinutes())}`;
  const accounts = backup.data.accounts?.length ?? 0;
  const txs = backup.data.txs?.length ?? 0;
  return `نسخة ${backup.day} · ${time} · ${accounts} حساب · ${txs} حركة`;
}
