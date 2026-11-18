import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BackBar, Btn, Card, Field, ProgressBar, Screen, Segmented, useTheme } from '../components/ui';
import { amountToInput, CURRENCIES, CURRENCY_ORDER, formatMoney, parseAmount, percent } from '../lib/money';
import { useStore } from '../lib/store';
import type { Currency, DebtDirection } from '../lib/types';

export default function DebtFormScreen() {
  const { db, addDebt, updateDebt, removeDebt } = useStore();
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; direction?: string }>();
  const existing = db.debts.find((d) => d.id === params.id);

  const [direction, setDirection] = useState<DebtDirection>(
    existing?.direction ?? (params.direction === 'owing' ? 'owing' : 'owed')
  );
  const [person, setPerson] = useState(existing?.person ?? '');
  const [amount, setAmount] = useState(existing ? amountToInput(existing.amount, existing.currency) : '');
  const [paid, setPaid] = useState(existing ? amountToInput(existing.paid, existing.currency) : '');
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? 'SYP');
  const [note, setNote] = useState(existing?.note ?? '');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const totalMinor = parseAmount(amount, currency);
  const paidMinor = parseAmount(paid, currency);

  const save = () => {
    setError('');
    if (!person.trim()) {
      setError('اكتب اسم الشخص');
      return;
    }
    if (totalMinor <= 0) {
      setError('أدخل مبلغ الدين');
      return;
    }
    if (paidMinor > totalMinor) {
      setError('المسدَّد أكبر من مبلغ الدين');
      return;
    }
    const payload = {
      direction,
      person: person.trim(),
      amount: totalMinor,
      paid: paidMinor,
      currency,
      note: note.trim() || undefined,
    };
    if (existing) updateDebt(existing.id, payload);
    else addDebt({ ...payload, date: new Date().toISOString() });
    router.back();
  };

  return (
    <Screen>
      <BackBar title={existing ? 'تعديل الدين' : 'دين جديد'} onBack={() => router.back()} />

      <Card style={{ gap: 12 }}>
        <Segmented
          value={direction}
          onChange={setDirection}
          options={[
            { value: 'owed', label: 'لي عند الناس' },
            { value: 'owing', label: 'عليّ للناس' },
          ]}
        />
        <Field label="الشخص" value={person} onChangeText={setPerson} placeholder="اسم الشخص" />
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
          label={`المبلغ (${CURRENCIES[currency].symbol})`}
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="decimal-pad"
          inputStyle={{ fontSize: 20, fontWeight: '800' }}
        />
        <Field
          label={`المسدَّد (${CURRENCIES[currency].symbol}) — للتسديد الجزئي`}
          value={paid}
          onChangeText={setPaid}
          placeholder="0"
          keyboardType="decimal-pad"
        />
        <Field label="ملاحظة — اختياري" value={note} onChangeText={setNote} placeholder="مثال: سلفة شهر" />
      </Card>

      {totalMinor > 0 ? (
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.muted, fontSize: 12 }}>المتبقّي</Text>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15 }}>
              {formatMoney(Math.max(0, totalMinor - paidMinor), currency)}
            </Text>
          </View>
          <ProgressBar
            value={totalMinor > 0 ? Math.min(1, paidMinor / totalMinor) : 0}
            color={direction === 'owed' ? theme.income : theme.expense}
          />
          <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>
            {percent(paidMinor, totalMinor)}% مسدَّد
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

      <Btn label={existing ? 'حفظ التعديلات' : 'إضافة الدين'} onPress={save} />

      {existing ? (
        confirmDelete ? (
          <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
            <Btn
              label="تأكيد الحذف"
              variant="danger"
              style={{ flex: 1 }}
              onPress={() => {
                removeDebt(existing.id);
                router.back();
              }}
            />
            <Btn label="إلغاء" variant="soft" style={{ flex: 1 }} onPress={() => setConfirmDelete(false)} />
          </View>
        ) : (
          <Btn label="حذف الدين" variant="ghost" onPress={() => setConfirmDelete(true)} />
        )
      ) : null}
    </Screen>
  );
}
