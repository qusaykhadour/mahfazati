import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import aesjs from 'aes-js';

/**
 * تشفير البيانات الحساسة (AES-256-CTR) قبل حفظها في AsyncStorage،
 * مع مفتاح عشوائي يُولَّد مرة واحدة ويُخزَّن في Android Keystore عبر expo-secure-store.
 * سلامة البيانات محمية بـ HMAC-SHA256 (encrypt-then-MAC) — أي عبث بالمحفوظات يُكتشف.
 * الصيغة: mahfazati.enc.v1:<iv-hex>:<mac-hex>:<cipher-hex>
 */

const KEY_NAME = 'mahfazati.db.key.v1';
const PREFIX = 'mahfazati.enc.v1:';

/* ---------- أدوات hex/base64 صغيرة (بديل Buffer غير المتوفر في Hermes) ---------- */

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

/* ---------- المفتاح: يُولَّد مرة واحدة ويُحفظ في Keystore ---------- */

let cachedKey: Uint8Array | null = null;
let cachedEnc: Uint8Array | null = null;
let cachedMac: Uint8Array | null = null;

async function sha256Hex(data: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
}

/** HMAC-SHA256 بمفتاح bytes على رسالة hex (كل الأطراف بنفس التمثيل hex) */
async function hmacSha256Hex(keyBytes: Uint8Array, messageHex: string): Promise<string> {
  let keyHex = toHex(keyBytes);
  // نمدد المفتاح إلى 64 بايت (128 خانة hex)
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

interface DerivedKeys {
  enc: Uint8Array;
  mac: Uint8Array;
}

async function loadDerivedKeys(): Promise<DerivedKeys> {
  if (cachedEnc && cachedMac) return { enc: cachedEnc, mac: cachedMac };
  let hex = await SecureStore.getItemAsync(KEY_NAME);
  if (!hex) {
    const bytes = await Crypto.getRandomBytesAsync(32);
    hex = toHex(bytes);
    await SecureStore.setItemAsync(KEY_NAME, hex, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error('مفتاح التشفير تالف');
  cachedKey = fromHex(hex);
  // اشتقاق مفتاحي التشفير والـ MAC من المفتاح الأم
  const encHex = await sha256Hex(hex + ':enc');
  const macHex = await sha256Hex(hex + ':mac');
  cachedEnc = fromHex(encHex);
  cachedMac = fromHex(macHex);
  return { enc: cachedEnc, mac: cachedMac };
}

/* ---------- تشفير/فك التشفير ---------- */

export function isEncryptedPayload(raw: string): boolean {
  return typeof raw === 'string' && raw.startsWith(PREFIX);
}

/** يشفّر نصاً (JSON عادة) ويرجع حمولة موقعة ببادئة الصيغة */
export async function encryptText(text: string): Promise<string> {
  const { enc: encKey, mac: macKey } = await loadDerivedKeys();
  const iv = await Crypto.getRandomBytesAsync(16);
  const dataBytes = aesjs.utils.utf8.toBytes(text);
  const ctr = new aesjs.ModeOfOperation.ctr(encKey, new aesjs.Counter(iv));
  const cipher = ctr.encrypt(dataBytes);
  const ivHex = toHex(iv);
  const ctHex = toHex(cipher);
  const mac = await hmacSha256Hex(macKey, ivHex + ':' + ctHex);
  return `${PREFIX}${ivHex}:${mac}:${ctHex}`;
}

/** يفك تشفير حمولة محفوظة — يرمي خطأً عند فشل الـ MAC (عبث أو تلف) */
export async function decryptText(payload: string): Promise<string> {
  if (!isEncryptedPayload(payload)) throw new Error('حمولة غير مشفرة');
  const rest = payload.slice(PREFIX.length);
  const parts = rest.split(':');
  if (parts.length !== 3) throw new Error('صيغة مشفرة غير صالحة');
  const [ivHex, macHex, ctHex] = parts;
  if (!/^[0-9a-f]{32}$/.test(ivHex) || !/^[0-9a-f]{64}$/.test(macHex)) {
    throw new Error('صيغة مشفرة غير صالحة');
  }
  const { enc: encKey, mac: macKey } = await loadDerivedKeys();
  const expected = await hmacSha256Hex(macKey, ivHex + ':' + ctHex);
  if (expected !== macHex) throw new Error('فشل التحقق من سلامة البيانات (MAC)');
  const ctr = new aesjs.ModeOfOperation.ctr(encKey, new aesjs.Counter(fromHex(ivHex)));
  const plain = ctr.decrypt(fromHex(ctHex));
  return aesjs.utils.utf8.fromBytes(plain);
}
