import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BackBar, Btn, Card, Chip, Empty, Field, Screen, Segmented, useTheme } from './ui';
import { amountToInput, CURRENCIES, convertMinor, formatMoney, parseAmount } from '../lib/money';
import { useStore } from '../lib/store';
import type { Tx, TxKind } from '../lib/types';

const KIND_OPTIONS: { value: TxKind; label: string; emoji: string }[] = [
  { value: 'expense', label: 'مصروف', emoji: '➖' },
  { value: 'income', label: 'دخل', emoji: '➕' },
  { value: 'transfer', label: 'تحويل', emoji: '🔁' },
];

export function TxForm({ initial, defaultKind = 'expense' }: { initial?: Tx; defaultKind?: TxKind }) {
  const { db, addTx, updateTx, removeTx } = useStore();
  const theme = useTheme();
  const router = useRouter();

  const [kind, setKind] = useState<TxKind>(initial?.kind ?? defaultKind);
  const [amount, setAmount] = useState(initial ? amountToInput(initial.amount, initial.currency) : '');
  const [accountId, setAccountId] = useState(initial?.accountId ?? db.accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(initial?.toAccountId ?? '');
  const [toAmount, setToAmount] = useState(() => {
    if (initial?.toAmount == null) return '';
    const target = db.accounts.find((a) => a.id === initial.toAccountId);
    return amountToInput(initial.toAmount, target?.currency ?? initial.currency);
  });
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const account = db.accounts.find((a) => a.id === accountId);
  const currency = account?.currency ?? 'SYP';
  const targetAccount = db.accounts.find((a) => a.id === toAccountId);
  const targetCurrency = targetAccount?.currency ?? currency;

  const categoryKind = kind === 'income' ? 'income' : 'expense';
  const categories = db.categories.filter((c) => c.kind === categoryKind);
  const activeCategoryId = categories.some((c) => c.id === categoryId)
    ? categoryId
    : (categories[0]?.id ?? '');

  const amountMinor = parseAmount(amount, currency);

  const autoReceived = useMemo(() => {
    if (currency === targetCurrency) return amountMinor;
    return convertMinor(amountMinor, currency, targetCurrency, db.settings);
  }, [amountMinor, currency, targetCurrency, db.settings]);

  const receivedMinor = toAmount ? parseAmount(toAmount, targetCurrency) : autoReceived;

  const onSave = () => {
    setError('');
    if (!account) {
      setError('أضف حساباً أولاً من شاشة الحسابات');
      return;
    }
    if (amountMinor <= 0) {
      setError('أدخل مبلغاً أكبر من صفر');
      return;
    }

    const base = {
      kind,
      amount: amountMinor,
      currency,
      accountId: account.id,
      note: note.trim() || undefined,
      date: initial?.date ?? new Date().toISOString(),
    };

    if (kind === 'transfer') {
      if (!targetAccount || targetAccount.id === account.id) {
        setError('اختر حساباً مختلفاً للحساب المستقبل');
        return;
      }
      if (receivedMinor <= 0) {
        setError('مبلغ التحويل الواصل غير صالح');
        return;
      }
      const payload = {
        ...base,
        toAccountId: targetAccount.id,
        toAmount: receivedMinor,
        categoryId: undefined,
      };
      if (initial) updateTx(initial.id, payload);
      else addTx(payload);
    } else {
      const payload = {
        ...base,
        toAccountId: undefined,
        toAmount: undefined,
        categoryId: activeCategoryId || undefined,
      };
      if (initial) updateTx(initial.id, payload);
      else addTx(payload);
    }

    router.back();
  };

  if (db.accounts.length === 0) {
    return (
      <Screen>
        <BackBar title="حركة جديدة" onBack={() => router.back()} />
        <Card>
          <Empty emoji="💳" text="لازم حساب أولاً" hint="كل حركة تُسجّل على حساب." />
        </Card>
        <Btn label="إضافة حساب" onPress={() => router.replace('/account-form')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <BackBar title={initial ? 'تعديل الحركة' : 'حركة جديدة'} onBack={() => router.back()} />

      <Segmented value={kind} onChange={setKind} options={KIND_OPTIONS} />

      <Card style={{ gap: 12 }}>
        <Field
          label={`المبلغ (${CURRENCIES[currency].symbol})`}
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="decimal-pad"
          inputStyle={{ fontSize: 26, fontWeight: '800', paddingVertical: 14 }}
        />
        {amountMinor > 0 ? (
          <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'right' }}>
            {formatMoney(amountMinor, currency)}
          </Text>
        ) : null}

        <Text style={{ color: theme.muted, fontSize: 12.5, textAlign: 'right' }}>
          {kind === 'transfer' ? 'من حساب' : 'الحساب'}
        </Text>
        <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
          {db.accounts.map((item) => (
            <Chip
              key={item.id}
              label={`${item.name} · ${CURRENCIES[item.currency].symbol}`}
              active={item.id === accountId}
              onPress={() => setAccountId(item.id)}
            />
          ))}
        </View>

        {kind === 'transfer' ? (
          <>
            <Text style={{ color: theme.muted, fontSize: 12.5, textAlign: 'right' }}>إلى حساب</Text>
            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
              {db.accounts
                .filter((item) => item.id !== accountId)
                .map((item) => (
                  <Chip
                    key={item.id}
                    label={`${item.name} · ${CURRENCIES[item.currency].symbol}`}
                    active={item.id === toAccountId}
                    onPress={() => {
                      setToAccountId(item.id);
                      setToAmount('');
                    }}
                  />
                ))}
            </View>

            <Field
              label={`المبلغ الواصل (${CURRENCIES[targetCurrency].symbol}) — اختياري`}
              value={toAmount}
              onChangeText={setToAmount}
              placeholder={autoReceived > 0 ? amountToInput(autoReceived, targetCurrency) : '0'}
              keyboardType="decimal-pad"
            />
            <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>
              {targetAccount
                ? `سيُضاف للحساب المستقبل: ${formatMoney(receivedMinor, targetCurrency)} · حسبة تلقائية بسعر السوق المعتد`
                : 'اختر الحساب المستقبل'}
            </Text>
          </>
        ) : (
          <>
            <Text style={{ color: theme.muted, fontSize: 12.5, textAlign: 'right' }}>التصنيف</Text>
            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
              {categories.map((category) => (
                <Chip
                  key={category.id}
                  label={`${category.emoji} ${category.name}`}
                  active={category.id === activeCategoryId}
                  color={category.color}
                  onPress={() => setCategoryId(category.id)}
                />
              ))}
            </View>
          </>
        )}

        <Field label="ملاحظة — اختياري" value={note} onChangeText={setNote} placeholder="مثال: خضرة السوق" />
      </Card>

      {initial ? (
        <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>
          بتاريخ {new Date(initial.date).toLocaleDateString('ar-SY')}
        </Text>
      ) : null}

      {error ? (
        <Card style={{ backgroundColor: theme.expenseSoft, borderColor: theme.expense }}>
          <Text style={{ color: theme.expense, fontSize: 13, textAlign: 'right', fontWeight: '700' }}>
            {error}
          </Text>
        </Card>
      ) : null}

      <Btn label={initial ? 'حفظ التعديلات' : 'حفظ الحركة'} onPress={onSave} />

      {initial ? (
        confirmDelete ? (
          <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
            <Btn
              label="تأكيد الحذف"
              variant="danger"
              style={{ flex: 1 }}
              onPress={() => {
                removeTx(initial.id);
                router.back();
              }}
            />
            <Btn label="إلغاء" variant="soft" style={{ flex: 1 }} onPress={() => setConfirmDelete(false)} />
          </View>
        ) : (
          <Btn label="حذف الحركة" variant="ghost" onPress={() => setConfirmDelete(true)} />
        )
      ) : null}
    </Screen>
  );
}
