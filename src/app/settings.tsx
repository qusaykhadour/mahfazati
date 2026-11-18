import React, { useEffect, useState } from 'react';
import { Share, Text, View } from 'react-native';
import { TabBar } from '../components/TabBar';
import {
  Btn,
  Card,
  Divider,
  Field,
  Header,
  Screen,
  SectionTitle,
  Segmented,
  useTheme,
} from '../components/ui';
import { CURRENCIES, rateQuote, MAX_RATE } from '../lib/money';
import { backupLabel, loadBackups, saveRestoreSnapshot, loadRestoreSnapshot, type StoredBackup } from '../lib/backups';
import { checkBiometric, type BiometricStatus } from '../lib/security';
import { fetchRates, type FetchedRates } from '../lib/rates';
import { useStore } from '../lib/store';
import type { Currency, RateQuote } from '../lib/types';

/** العملات القابلة للتعديل (الليرة ثابتة ١/١) */
const EDITABLE: Currency[] = ['USD', 'EUR', 'TRY', 'CNY'];

function formatDate(iso?: string): string {
  if (!iso) return 'لم يُحدَّث بعد';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} · ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function SettingsScreen() {
  const {
    db,
    theme,
    setTheme,
    updateSettings,
    addCategory,
    removeCategory,
    importFromText,
    resetAll,
    exportText,
    replaceDB,
  } = useStore();

  const [busy, setBusy] = useState(false);
  const [rateMsg, setRateMsg] = useState('');

  // حالة التعديل اليدوي لعملة واحدة
  const [editing, setEditing] = useState<Currency | null>(null);
  const [editParallelBuy, setEditParallelBuy] = useState('');
  const [editParallelSell, setEditParallelSell] = useState('');
  const [editOfficialBuy, setEditOfficialBuy] = useState('');
  const [editOfficialSell, setEditOfficialSell] = useState('');

  const [catName, setCatName] = useState('');
  const [catEmoji, setCatEmoji] = useState('🏷️');
  const [catKind, setCatKind] = useState<'expense' | 'income'>('expense');
  const [catMsg, setCatMsg] = useState('');

  const [backup, setBackup] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  // النسخ الداخلية اليومية
  const [backups, setBackups] = useState<StoredBackup[]>([]);
  const [restoreArmed, setRestoreArmed] = useState<string | null>(null);
  const [preRestore, setPreRestore] = useState<StoredBackup | null>(null);
  const [biometric, setBiometric] = useState<BiometricStatus>({
    available: false,
    enrolled: false,
    label: 'بصمة إصبعك',
  });
  const [securityMsg, setSecurityMsg] = useState('');

  useEffect(() => {
    checkBiometric().then(setBiometric);
  }, []);

  useEffect(() => {
    loadBackups().then(setBackups);
    loadRestoreSnapshot().then((snap) => setPreRestore(snap));
  }, []);

  const shareExport = async () => {
    const payload = exportText();
    try {
      const result = await Share.share({
        message: `نسخة محفظتي الاحتياطية:\n\n${payload}`,
        title: 'نسخة محفظتي الاحتياطية',
      });
      if (result.action === Share.sharedAction) {
        setBackupMsg('تمت المشاركة — احفظ النسخة بمكان آمن ✅');
      } else if (result.action === Share.dismissedAction) {
        setBackupMsg('ألغيت المشاركة — النسخة موجودة بالحقل تحت إن حبيت تنسخها يدوياً.');
      }
    } catch {
      setBackupMsg('تعذّرت المشاركة المباشرة — استخدم الحقل تحت للنسخ اليدوي.');
    }
  };

  const restoreBackup = async (target: StoredBackup) => {
    // نسخة أمان من الوضع الحالي قبل الاستبدال — تسمح بالتراجع عن الاسترجاع
    await saveRestoreSnapshot(db);
    replaceDB(target.data);
    loadBackups().then(setBackups);
    setRestoreArmed(null);
    setBackupMsg(`تم استرجاع ${backupLabel(target)} ✅`);
    loadRestoreSnapshot().then((snap) => setPreRestore(snap));
  };

  const undoRestore = () => {
    if (!preRestore) return;
    replaceDB(preRestore.data);
    setBackupMsg('تم التراجع عن الاسترجاع الأخير ✅');
    setPreRestore(null);
  };

  const refreshRates = async () => {
    setBusy(true);
    setRateMsg('');
    try {
      const result: FetchedRates = await fetchRates();
      const nextRates = { ...db.settings.rates };
      for (const code of result.found) {
        const quote = result.quotes[code];
        if (!quote) continue;
        const previous = nextRates[code];
        nextRates[code] = {
          parallel: quote,
          official: previous?.official ?? { buy: 0, sell: 0, manual: true },
        };
      }
      updateSettings({ rates: nextRates });
      const summary = result.found
        .map((code) => `${CURRENCIES[code].short} ${result.quotes[code]?.buy}`)
        .filter(Boolean)
        .join(' · ');
      setRateMsg(`تم تحديث ${result.found.length} عملة من ${result.source}: ${summary}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'خطأ غير معروف';
      setRateMsg(`تعذّر الجلب التلقائي (${message}). استخدم التعديل اليدوي — الأسعار المحفوظة بقيت كما هي.`);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (code: Currency) => {
    const parallel = rateQuote(db.settings, code, 'parallel');
    const official = rateQuote(db.settings, code, 'official');
    setEditing(code);
    setEditParallelBuy(parallel.buy ? String(parallel.buy) : '');
    setEditParallelSell(parallel.sell ? String(parallel.sell) : '');
    setEditOfficialBuy(official.buy ? String(official.buy) : '');
    setEditOfficialSell(official.sell ? String(official.sell) : '');
  };

  const saveManual = () => {
    if (!editing) return;
    const parse = (text: string): number => {
      const value = Number(text.replace(',', '.'));
      if (!Number.isFinite(value) || value < 0) return -1;
      if (value > MAX_RATE) return -1;
      return Number(value.toFixed(2));
    };
    const pBuy = parse(editParallelBuy);
    const pSell = parse(editParallelSell);
    const oBuy = parse(editOfficialBuy);
    const oSell = parse(editOfficialSell);
    if (pBuy < 0 || pSell < 0 || oBuy < 0 || oSell < 0) {
      setRateMsg('أدخل أرقاماً صحيحة (صفر أو أكبر)');
      return;
    }
    if ((pBuy > 0) !== (pSell > 0)) {
      setRateMsg('سعر السوق: أدخل شراء وبيع معاً أو اتركهما فارغين');
      return;
    }
    if ((oBuy > 0) !== (oSell > 0)) {
      setRateMsg('السعر الرسمي: أدخل شراء وبيع معاً أو اتركهما فارغين');
      return;
    }
    const asQuote = (buy: number, sell: number, prev?: RateQuote): RateQuote => ({
      buy,
      sell,
      manual: true,
      updatedAt: new Date().toISOString(),
      source: prev?.source ?? 'إدخال يدوي',
    });
    const prev = db.settings.rates[editing];
    const nextRates = {
      ...db.settings.rates,
      [editing]: {
        parallel: pBuy > 0 ? asQuote(pBuy, pSell, prev?.parallel) : prev?.parallel ?? { buy: 0, sell: 0, manual: true },
        official: oBuy > 0 ? asQuote(oBuy, oSell, prev?.official) : prev?.official ?? { buy: 0, sell: 0, manual: true },
      },
    };
    updateSettings({ rates: nextRates });
    setRateMsg(`تم حفظ أسعار ${CURRENCIES[editing].label} يدوياً`);
    setEditing(null);
  };

  const submitCategory = () => {
    if (!catName.trim()) {
      setCatMsg('اكتب اسم التصنيف');
      return;
    }
    addCategory({
      name: catName.trim(),
      kind: catKind,
      emoji: catEmoji.trim() || '🏷️',
      color: catKind === 'income' ? '#16A34A' : '#0EA5E9',
    });
    setCatName('');
    setCatEmoji('🏷️');
    setCatMsg('تمت الإضافة');
  };

  const runImport = () => {
    try {
      importFromText(backup);
      setBackupMsg('تم الاستيراد بنجاح ✅ (النسخ القديمة تترقى تلقائياً)');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ملف غير صالح';
      setBackupMsg(`فشل الاستيراد: ${message}`);
    }
  };

  const expenseCats = db.categories.filter((c) => c.kind === 'expense');
  const incomeCats = db.categories.filter((c) => c.kind === 'income');
  const usdParallel = rateQuote(db.settings, 'USD');
  const stale =
    usdParallel.updatedAt &&
    Date.now() - new Date(usdParallel.updatedAt).getTime() > 24 * 60 * 60 * 1000;

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Header title="الإعدادات" subtitle="كل شي محلي على جهازك" />

        <SectionTitle>المظهر</SectionTitle>
        <Card style={{ gap: 10 }}>
          <Segmented
            value={db.settings.theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: 'فاتح', emoji: '☀️' },
              { value: 'dark', label: 'داكن', emoji: '🌙' },
            ]}
          />
          <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>
            الثيم يتغيّر فوراً ويُحفظ مع بياناتك.
          </Text>
        </Card>

        <SectionTitle>أسعار الصرف (ليرة سورية لكل وحدة)</SectionTitle>
        <Card style={{ gap: 12 }}>
          <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>
            السعر المعتد: <Text style={{ fontWeight: '800', color: theme.text }}>السوق السودا (الموازي)</Text>.
            السعر الرسمي (المصرف) يُعرض للمقارنة. الليرة نفسها ثابتة ١/١.
          </Text>

          <Btn
            label={busy ? 'جاري الجلب...' : 'تحديث تلقائي من س بي توداي (سوق دمشق)'}
            icon="🔄"
            variant="soft"
            disabled={busy}
            onPress={refreshRates}
          />
          {stale ? (
            <Text style={{ color: theme.expense, fontSize: 11.5, textAlign: 'right' }}>
              ⚠️ آخر تحديث للأسعار أقدم من يوم — حدّثها أو أدخلها يدوياً.
            </Text>
          ) : null}

          {EDITABLE.map((code) => {
            const parallel = rateQuote(db.settings, code, 'parallel');
            const official = rateQuote(db.settings, code, 'official');
            const isEditing = editing === code;
            return (
              <View
                key={code}
                style={{
                  gap: 8,
                  padding: 10,
                  borderRadius: 14,
                  backgroundColor: theme.cardAlt,
                  borderWidth: 1,
                  borderColor: isEditing ? theme.primary : theme.border,
                }}
              >
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
                  <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14, flex: 1, textAlign: 'right' }}>
                    {CURRENCIES[code].flag ?? ''} {CURRENCIES[code].label}
                  </Text>
                  {isEditing ? (
                    <Text onPress={() => setEditing(null)} style={{ color: theme.primary, fontWeight: '800' }}>
                      إلغاء
                    </Text>
                  ) : (
                    <Text onPress={() => startEdit(code)} style={{ color: theme.primary, fontWeight: '800', fontSize: 12 }}>
                      تعديل يدوي ✏️
                    </Text>
                  )}
                </View>

                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.muted, fontSize: 11.5 }}>
                    سودا: {parallel.buy ? `شراء ${parallel.buy} · بيع ${parallel.sell}` : 'غير متوفر'}
                  </Text>
                  <Text style={{ color: theme.muted, fontSize: 10.5 }}>{formatDate(parallel.updatedAt)}</Text>
                </View>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.muted, fontSize: 11.5 }}>
                    رسمي: {official.buy ? `شراء ${official.buy} · بيع ${official.sell}` : 'غير مُدخل'}
                  </Text>
                  <Text style={{ color: theme.muted, fontSize: 10.5 }}>{formatDate(official.updatedAt)}</Text>
                </View>

                {isEditing ? (
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <Text style={{ color: theme.muted, fontSize: 11, textAlign: 'right' }}>
                      اترك السوق فارغاً إذا أردت بقاء آخر سعر تلقائي.
                    </Text>
                    <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                      <Field
                        label="سودا · شراء"
                        value={editParallelBuy}
                        onChangeText={setEditParallelBuy}
                        keyboardType="decimal-pad"
                        style={{ flex: 1 }}
                      />
                      <Field
                        label="سودا · بيع"
                        value={editParallelSell}
                        onChangeText={setEditParallelSell}
                        keyboardType="decimal-pad"
                        style={{ flex: 1 }}
                      />
                    </View>
                    <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                      <Field
                        label="رسمي · شراء"
                        value={editOfficialBuy}
                        onChangeText={setEditOfficialBuy}
                        keyboardType="decimal-pad"
                        style={{ flex: 1 }}
                      />
                      <Field
                        label="رسمي · بيع"
                        value={editOfficialSell}
                        onChangeText={setEditOfficialSell}
                        keyboardType="decimal-pad"
                        style={{ flex: 1 }}
                      />
                    </View>
                    <Btn label="حفظ الأسعار اليدوية" onPress={saveManual} />
                  </View>
                ) : null}
              </View>
            );
          })}

          {rateMsg ? (
            <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>{rateMsg}</Text>
          ) : null}
        </Card>

        <SectionTitle>الأمان</SectionTitle>
        <Card style={{ gap: 10 }}>
          <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'right' }}>قفل التطبيق</Text>
          <Segmented
            value={biometric.enrolled ? String(db.settings.lockEnabled === true) : 'off'}
            onChange={(value) => {
              if (!biometric.available) {
                setSecurityMsg('جهازك ما يوفر قياس حيوي أو غير مفعّل بإعدادات النظام.');
                return;
              }
              if (!biometric.enrolled) {
                setSecurityMsg(`فعّل ${biometric.label} من إعدادات النظام أولاً وثبت عيّنة.`);
                return;
              }
              updateSettings({ lockEnabled: value === 'true' });
              setSecurityMsg(
                value === 'true'
                  ? `القفل مفعّل — الفتح ب${biometric.label}، وقفل تلقائي بعد غياب ربع ساعة.`
                  : 'القفل معطّل.'
              );
            }}
            options={
              biometric.enrolled
                ? [
                    { value: 'false', label: 'بلا قفل', emoji: '🔓' },
                    { value: 'true', label: `قفل ب${biometric.label}`, emoji: '🔒' },
                  ]
                : [{ value: 'off', label: 'غير متوفر بالجهاز', emoji: '⚠️' }]
            }
          />

          <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'right' }}>إخفاء الأرقام</Text>
          <Segmented
            value={String(db.settings.hideAmounts === true)}
            onChange={(value) => updateSettings({ hideAmounts: value === 'true' })}
            options={[
              { value: 'false', label: 'ظاهرة', emoji: '👁️' },
              { value: 'true', label: 'مخفية', emoji: '🙈' },
            ]}
          />
          {securityMsg ? (
            <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>{securityMsg}</Text>
          ) : null}
        </Card>

        <SectionTitle>التصنيفات</SectionTitle>
        <Card style={{ gap: 10 }}>
          <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'right' }}>
            مصاريف ({expenseCats.length})
          </Text>
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 }}>
            {expenseCats.map((category) => (
              <View
                key={category.id}
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  backgroundColor: theme.cardAlt,
                }}
              >
                <Text style={{ color: theme.text, fontSize: 12.5 }}>
                  {category.emoji} {category.name}
                </Text>
                <Text
                  onPress={() => removeCategory(category.id)}
                  style={{ color: theme.expense, fontSize: 13, fontWeight: '900' }}
                >
                  ×
                </Text>
              </View>
            ))}
          </View>

          <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'right' }}>
            دخل ({incomeCats.length})
          </Text>
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 }}>
            {incomeCats.map((category) => (
              <View
                key={category.id}
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  backgroundColor: theme.cardAlt,
                }}
              >
                <Text style={{ color: theme.text, fontSize: 12.5 }}>
                  {category.emoji} {category.name}
                </Text>
                <Text
                  onPress={() => removeCategory(category.id)}
                  style={{ color: theme.expense, fontSize: 13, fontWeight: '900' }}
                >
                  ×
                </Text>
              </View>
            ))}
          </View>

          <Segmented
            value={catKind}
            onChange={setCatKind}
            options={[
              { value: 'expense', label: 'مصروف' },
              { value: 'income', label: 'دخل' },
            ]}
          />
          <Field label="اسم تصنيف جديد" value={catName} onChangeText={setCatName} placeholder="مثال: قهوة" />
          <Field label="إيموجي" value={catEmoji} onChangeText={setCatEmoji} placeholder="☕" />
          <Btn label="إضافة التصنيف" variant="soft" onPress={submitCategory} />
          {catMsg ? (
            <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>{catMsg}</Text>
          ) : null}
        </Card>

        <SectionTitle>النسخ الاحتياطي</SectionTitle>
        <Card style={{ gap: 10 }}>
          <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>
            شارك نسخة كاملة (كل حساباتك وحركاتك وأسعارك) على واتساب أو تلغرام أو احفظها بأي مكان،
            أو انسخها يدوياً من الحقل، أو الصق نسخة قديمة واستوردها.
          </Text>
          <Btn label="مشاركة النسخة الاحتياطية" icon="📤" variant="soft" onPress={shareExport} />
          <Field
            value={backup}
            onChangeText={setBackup}
            placeholder='{"version":2,...}'
            multiline
            numberOfLines={5}
            inputStyle={{ minHeight: 110, textAlign: 'left', writingDirection: 'ltr' }}
          />
          <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
            <Btn
              label="توليد نسخة للحقل"
              icon="⬇️"
              variant="soft"
              style={{ flex: 1 }}
              onPress={() => {
                setBackup(exportText());
                setBackupMsg('تم توليد نسخة JSON بالحقل — انسخها واحفظها');
              }}
            />
            <Btn label="استيراد" icon="⬆️" style={{ flex: 1 }} onPress={runImport} />
          </View>
          {backupMsg ? (
            <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>{backupMsg}</Text>
          ) : null}
        </Card>

        <SectionTitle>النسخ الداخلية (آخر ٧ أيام)</SectionTitle>
        <Card style={{ gap: 8 }}>
          <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>
            التطبيق يحفظ يومياً نسخة تلقائية على جهازك — استرجع أي يوم إذا حصل عطل.
          </Text>
          {backups.length === 0 ? (
            <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'right' }}>
              ما في نسخ داخلية بعد — تتولد تلقائياً مع الاستعمال اليومي.
            </Text>
          ) : (
            backups.map((item, index) => (
              <View key={item.day}>
                {index > 0 ? <Divider /> : null}
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                  <Text style={{ color: theme.text, fontSize: 12.5, flex: 1, textAlign: 'right' }}>
                    {backupLabel(item)}
                  </Text>
                  {restoreArmed === item.day ? (
                    <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
                      <Text
                        onPress={() => restoreBackup(item)}
                        style={{ color: theme.expense, fontWeight: '900', fontSize: 12.5 }}
                      >
                        تأكيد الاسترجاع
                      </Text>
                      <Text
                        onPress={() => setRestoreArmed(null)}
                        style={{ color: theme.muted, fontWeight: '800', fontSize: 12.5 }}
                      >
                        إلغاء
                      </Text>
                    </View>
                  ) : (
                    <Text
                      onPress={() => setRestoreArmed(item.day)}
                      style={{ color: theme.primary, fontWeight: '800', fontSize: 12.5 }}
                    >
                      استرجاع
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
          {preRestore ? (
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingTop: 4 }}>
              <Text style={{ color: theme.muted, fontSize: 11.5, flex: 1, textAlign: 'right' }}>
                في نسخة أمان من وضعك الحالي قبل آخر استرجاع.
              </Text>
              <Text
                onPress={undoRestore}
                style={{ color: theme.primary, fontWeight: '800', fontSize: 12.5 }}
              >
                تراجع عن الاسترجاع
              </Text>
            </View>
          ) : null}
        </Card>

        <SectionTitle>منطقة الخطر</SectionTitle>
        <Card style={{ gap: 10 }}>
          {confirmReset ? (
            <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
              <Btn
                label="تأكيد المسح"
                variant="danger"
                style={{ flex: 1 }}
                onPress={async () => {
                  await resetAll();
                  setConfirmReset(false);
                  setBackupMsg('تم مسح البيانات وإعادة الإعدادات الافتراضية');
                }}
              />
              <Btn label="إلغاء" variant="soft" style={{ flex: 1 }} onPress={() => setConfirmReset(false)} />
            </View>
          ) : (
            <Btn label="مسح كل البيانات" variant="ghost" onPress={() => setConfirmReset(true)} />
          )}
          <Text style={{ color: theme.muted, fontSize: 11, textAlign: 'right' }}>
            محفظتي · الإصدار 2.0.0 · بياناتك لا تغادر جهازك
          </Text>
        </Card>
      </Screen>
      <TabBar />
    </View>
  );
}
