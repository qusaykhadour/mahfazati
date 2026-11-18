import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import aesjs from 'aes-js';

/**
 * تشفير البيانات الحساسة (AES-256-CTR + HMAC-SHA256) قبل حفظها في AsyncStorage.
 *
 * استراتيجية المفتاح — ثلاثة أوضاع (حصيلة اختبار عملي على شاومي MIUI/HyperOS):
 *  1) secure   : المفتاح العشوائي في Android Keystore عبر expo-secure-store (الأنسب أمنياً).
 *  2) fallback : أجهزة يتعطل فيها SecureStore عند إعادة التشغيل (مثل شاومي) — نستخدم مفتاحاً
 *                محلياً ثابتاً مشتقاً PBKDF2-HMAC-SHA256 من بذرة عشوائية مخزنة داخل التطبيق،
 *                فيبقى المفتاح ثابتاً ولا تضيع البيانات أبداً عند إعادة التشغيل.
 *  3) locked   : Fail-Closed — يوجد مخزون مشفر لكن مفتاحه غير متوفر. يُمنع منعاً باتاً
 *                توليد مفتاح جديد أو الكتابة فوق البيانات؛ يعمل التطبيق للقراءة فقط
 *                حتى يستورد المستخدم نسخته الاحتياطية أو يمسح البيانات بوعي.
 *
 * الصيغة: mahfazati.enc.v1:<iv-hex>:<mac-hex>:<cipher-hex>
 */

const KEY_NAME = 'mahfazati.db.key.v1';
const PREFIX = 'mahfazati.enc.v1:';
/** علامة الوضع في AsyncStorage (تخزين موثوق على كل الأجهزة) */
const MODE_MARKER = 'mahfazati.crypt.mode.v1';
/** بذرة المفتاح المحلي (عشوائية، داخل التطبيق) */
const FALLBACK_SEED = 'mahfazati.crypt.fallback.seed.v1';
/** ملح ثابت للتشتقاق */
const PEPPER = 'mahfazati::local-key::v1';
/** دورات PBKDF2 — متوازنة: كل دورة استدعاء أصلي عبر الجسر */
const PBKDF2_ROUNDS = 1000;

type Mode = 'secure' | 'fallback' | 'locked';
interface KeyState {
  mode: Mode;
  enc: Uint8Array;
  mac: Uint8Array;
}

/* ---------- أدوات hex صغيرة (بديل Buffer غير المتوفر في Hermes) ---------- */

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  if (clean.length % 2 !== 0) throw new Error('hex غير صالح');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

function xorHex(a: string, b: string): string {
  let out = '';
  for (let i = 0; i < a.length; i += 2) {
    out += (parseInt(a.substr(i, 2), 16) ^ parseInt(b.substr(i, 2), 16))
      .toString(16)
      .padStart(2, '0');
  }
  return out;
}

/* ---------- تجزئة و HMAC و PBKDF2 (كل التمثيلات hex) ---------- */

async function sha256Hex(data: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
}

/** HMAC-SHA256 بمفتاح bytes على رسالة hex — HMAC قياسي (ipad/opad 64 بايت) */
async function hmacSha256Hex(keyBytes: Uint8Array, messageHex: string): Promise<string> {
  let keyHex = toHex(keyBytes);
  while (keyHex.length < 128) keyHex += '0';
  if (keyHex.length > 128) keyHex = keyHex.slice(0, 128);
  let ipad = '';
  let opad = '';
  for (let i = 0; i < 128; i += 2) {
    const k = parseInt(keyHex.substr(i, 2), 16);
    ipad += (k ^ 0x36).toString(16).padStart(2, '0');
    opad += (k ^ 0x5c).toString(16).padStart(2, '0');
  }
  const inner = await sha256Hex(ipad + messageHex);
  return sha256Hex(opad + inner);
}

/** PBKDF2-HMAC-SHA256: password و salt و الناتج كلها hex */
async function pbkdf2Hex(
  passwordHex: string,
  saltHex: string,
  rounds: number,
  dkLenBytes: number
): Promise<string> {
  const pw = fromHex(passwordHex);
  let acc = '';
  for (let block = 1; acc.length < dkLenBytes * 2; block++) {
    const intHex = block.toString(16).padStart(8, '0');
    let u = await hmacSha256Hex(pw, saltHex + intHex);
    let t = u;
    for (let i = 1; i < rounds; i++) {
      u = await hmacSha256Hex(pw, u);
      t = xorHex(t, u);
    }
    acc += t;
  }
  return acc.slice(0, dkLenBytes * 2);
}

/* ---------- إدارة الأوضاع ---------- */

let resolvedKeys: KeyState | null = null;
let resolving: Promise<KeyState> | null = null;

async function buildState(masterHex: string, mode: Exclude<Mode, 'locked'>): Promise<KeyState> {
  const encHex = await sha256Hex(masterHex + ':enc');
  const macHex = await sha256Hex(masterHex + ':mac');
  return { mode, enc: fromHex(encHex), mac: fromHex(macHex) };
}

async function readSecureKey(): Promise<string | null> {
  try {
    const hex = await SecureStore.getItemAsync(KEY_NAME);
    if (hex && /^[0-9a-fA-F]{64}$/.test(hex)) return hex.toLowerCase();
    return null;
  } catch {
    return null; // SecureStore معطل (مثل شاومي) — لا نرمي خطأً
  }
}

async function writeSecureKey(hex: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(KEY_NAME, hex, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    // تحقق فعلي من القراءة — بعض الأجهزة "تكتب" ولا تقرأ بعد إعادة التشغيل
    const back = await readSecureKey();
    return back === hex;
  } catch {
    return false;
  }
}

async function hasEncryptedBlob(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem('mahfazati.db.v1');
    return !!raw && isEncryptedPayload(raw);
  } catch {
    return false;
  }
}

function strToHex(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    out += s.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return out;
}

async function getFallbackKeyHex(): Promise<string | null> {
  try {
    let seed = await AsyncStorage.getItem(FALLBACK_SEED);
    if (!seed || !/^[0-9a-f]{64}$/.test(seed)) {
      seed = toHex(await Crypto.getRandomBytesAsync(32));
      await AsyncStorage.setItem(FALLBACK_SEED, seed);
    }
    // مفتاح محلي ثابت: PBKDF2-HMAC-SHA256(البذرة، ملح ثابت للتطبيق)
    return pbkdf2Hex(seed, strToHex(PEPPER), PBKDF2_ROUNDS, 32);
  } catch {
    return null; // لا يمكن ضمان ثبات البذرة — لا نختار fallback
  }
}

async function resolve(): Promise<KeyState> {
  const marker = await AsyncStorage.getItem(MODE_MARKER);

  // ١) وضع محفوظ صريح
  if (marker === 'fallback') {
    const hex = await getFallbackKeyHex();
    if (hex) return buildState(hex, 'fallback');
    return { mode: 'locked', enc: new Uint8Array(0), mac: new Uint8Array(0) };
  }
  if (marker === 'secure') {
    const hex = await readSecureKey();
    if (hex) return buildState(hex, 'secure');
    // العلامة secure لكن القراءة فشلت: Fail-Closed إن وُجد مخزون مشفر
    if (await hasEncryptedBlob()) {
      return { mode: 'locked', enc: new Uint8Array(0), mac: new Uint8Array(0) };
    }
    // لا مخزون — العلامة قديمة: نعيد التأسيس كأنها بداية
    await AsyncStorage.removeItem(MODE_MARKER);
  }

  // ٢) لا علامة: نقرر
  const hex = await readSecureKey();
  if (hex) {
    await AsyncStorage.setItem(MODE_MARKER, 'secure').catch(() => {});
    return buildState(hex, 'secure');
  }

  // Fail-Closed: مخزون مشفر موجود بلا مفتاح — يُمنع توليد مفتاح جديد فوقه
  if (await hasEncryptedBlob()) {
    return { mode: 'locked', enc: new Uint8Array(0), mac: new Uint8Array(0) };
  }

  // ٣) بداية نظيفة: نحاول SecureStore أولاً
  const fresh = toHex(await Crypto.getRandomBytesAsync(32));
  if (await writeSecureKey(fresh)) {
    await AsyncStorage.setItem(MODE_MARKER, 'secure').catch(() => {});
    return buildState(fresh, 'secure');
  }

  // ٤) SecureStore لا يثبت (شاومي...) — مفتاح محلي مشتق ثابت داخل التطبيق
  const local = await getFallbackKeyHex();
  if (local) {
    await AsyncStorage.setItem(MODE_MARKER, 'fallback').catch(() => {});
    return buildState(local, 'fallback');
  }

  return { mode: 'locked', enc: new Uint8Array(0), mac: new Uint8Array(0) };
}

async function loadDerivedKeys(): Promise<KeyState> {
  if (resolvedKeys) return resolvedKeys;
  if (!resolving) {
    resolving = resolve().then((state) => {
      resolvedKeys = state;
      resolving = null;
      return state;
    });
  }
  return resolving;
}

/** true = يوجد مخزون مشفر لا يمكن قراءته — الوضع للقراءة فقط بلا كتابة */
export async function isCryptoLocked(): Promise<boolean> {
  return (await loadDerivedKeys()).mode === 'locked';
}

/* ---------- تشفير/فك التشفير ---------- */

export function isEncryptedPayload(raw: string): boolean {
  return typeof raw === 'string' && raw.startsWith(PREFIX);
}

/** يشفّر نصاً (JSON عادة) ويرجع حمولة موقعة ببادئة الصيغة — يرمي خطأً في وضع locked */
export async function encryptText(text: string): Promise<string> {
  const state = await loadDerivedKeys();
  if (state.mode === 'locked') throw new Error('crypto-locked: مفتاح فك المخزون غير متوفر');
  const iv = await Crypto.getRandomBytesAsync(16);
  const dataBytes = aesjs.utils.utf8.toBytes(text);
  const ctr = new aesjs.ModeOfOperation.ctr(state.enc, new aesjs.Counter(iv));
  const cipher = ctr.encrypt(dataBytes);
  const ivHex = toHex(iv);
  const ctHex = toHex(cipher);
  const mac = await hmacSha256Hex(state.mac, ivHex + ':' + ctHex);
  return `${PREFIX}${ivHex}:${mac}:${ctHex}`;
}

/** يفك تشفير حمولة محفوظة — يرمي خطأً عند فشل الـ MAC (عبث أو تلف أو مفتاح آخر) */
export async function decryptText(payload: string): Promise<string> {
  if (!isEncryptedPayload(payload)) throw new Error('حمولة غير مشفرة');
  const parts = payload.slice(PREFIX.length).split(':');
  if (parts.length !== 3) throw new Error('صيغة مشفرة غير صالحة');
  const [ivHex, macHex, ctHex] = parts;
  if (!/^[0-9a-f]{32}$/.test(ivHex) || !/^[0-9a-f]{64}$/.test(macHex)) {
    throw new Error('صيغة مشفرة غير صالحة');
  }
  const state = await loadDerivedKeys();
  if (state.mode === 'locked') throw new Error('crypto-locked: مفتاح فك المخزون غير متوفر');
  const expected = await hmacSha256Hex(state.mac, ivHex + ':' + ctHex);
  if (expected !== macHex) throw new Error('فشل التحقق من سلامة البيانات (MAC)');
  const ctr = new aesjs.ModeOfOperation.ctr(state.enc, new aesjs.Counter(fromHex(ivHex)));
  return aesjs.utils.utf8.fromBytes(ctr.decrypt(fromHex(ctHex)));
}
