import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BackBar, Btn, Card, Field, ProgressBar, Screen, Segmented, useTheme } from '../components/ui';
import { amountToInput, CURRENCIES, CURRENCY_ORDER, formatMoney, percent, parseAmount } from '../lib/money';
import { useStore } from '../lib/store';
import type { Currency } from '../lib/types';

export default function GoalFormScreen() {
  const { db, addGoal, updateGoal, removeGoal } = useStore();
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = db.goals.find((g) => g.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [target, setTarget] = useState(existing ? amountToInput(existing.target, existing.currency) : '');
  const [saved, setSaved] = useState(existing ? amountToInput(existing.saved, existing.currency) : '');
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? 'SYP');
  const [note, setNote] = useState(existing?.note ?? '');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const targetMinor = parseAmount(target, currency);
  const savedMinor = parseAmount(saved, currency);

  const save = () => {
    setError('');
    if (!name.trim()) {
      setError('اكتب اسماً للهدف');
      return;
    }
    if (targetMinor <= 0) {
      setError('أدخل مبلغ الهدف');
      return;
    }
    const payload = {
      name: name.trim(),
      target: targetMinor,
      saved: savedMinor,
      currency,
      note: note.trim() || undefined,
    };
    if (existing) updateGoal(existing.id, payload);
    else addGoal(payload);
    router.back();
  };

  return (
    <Screen>
      <BackBar title={existing ? 'تعديل الهدف' : 'هدف ادخار جديد'} onBack={() => router.back()} />

      <Card style={{ gap: 12 }}>
        <Field label="اسم الهدف" value={name} onChangeText={setName} placeholder="موبايل جديد، سفر..." />
        <Text style={{ color: theme.muted, fontSize: 12.5, textAlign: 'right' }}>العملة</Text>
        <Segmented
          value={currency}
          onChange={setCurrency}
          options={CURRENCY_ORDER.map((code) => ({
            value: code,
            label: CURRENCIES[code].short,
          }))}
        />
        <Field
          label={`المبلغ المطلوب (${CURRENCIES[currency].symbol})`}
          value={target}
          onChangeText={setTarget}
          placeholder="0"
          keyboardType="decimal-pad"
          inputStyle={{ fontSize: 20, fontWeight: '800' }}
        />
        <Field
          label={`المُحصّل حتى الآن (${CURRENCIES[currency].symbol})`}
          value={saved}
          onChangeText={setSaved}
          placeholder="0"
          keyboardType="decimal-pad"
        />
        <Field label="ملاحظة — اختياري" value={note} onChangeText={setNote} placeholder="ملاحظة قصيرة" />
      </Card>

      {targetMinor > 0 ? (
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.muted, fontSize: 12 }}>التقدّم</Text>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15 }}>
              {formatMoney(savedMinor, currency)} / {formatMoney(targetMinor, currency)}
            </Text>
          </View>
          <ProgressBar value={targetMinor > 0 ? Math.min(1, savedMinor / targetMinor) : 0} />
          <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>
            {percent(savedMinor, targetMinor)}% · المتبقّي{' '}
            {formatMoney(Math.max(0, targetMinor - savedMinor), currency)}
          </Text>
        </Card>
      ) : null}

      {error ? (
        <Card style={{ backgroundColor: theme.expenseSoft, borderColor: theme.expense }}>
          <Text style={{ color: theme.expense, fontSize: 13, textAlign: 'right', fontWeight: '700' }}>
            {error}
          </Text>
        </Card>
      ) : null}

      <Btn label={existing ? 'حفظ التعديلات' : 'إضافة الهدف'} onPress={save} />

      {existing ? (
        confirmDelete ? (
          <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
            <Btn
              label="تأكيد الحذف"
              variant="danger"
              style={{ flex: 1 }}
              onPress={() => {
                removeGoal(existing.id);
                router.back();
              }}
            />
            <Btn label="إلغاء" variant="soft" style={{ flex: 1 }} onPress={() => setConfirmDelete(false)} />
          </View>
        ) : (
          <Btn label="حذف الهدف" variant="ghost" onPress={() => setConfirmDelete(true)} />
        )
      ) : null}
    </Screen>
  );
}
