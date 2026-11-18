import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BackBar,
  Btn,
  Card,
  Field,
  Screen,
  Segmented,
  useTheme,
} from '../components/ui';
import { amountToInput, CURRENCIES, CURRENCY_ORDER, formatMoney, parseAmount } from '../lib/money';
import { accountBalance } from '../lib/selectors';
import { useStore } from '../lib/store';
import type { AccountKind, Currency } from '../lib/types';

export default function AccountFormScreen() {
  const { db, addAccount, updateAccount, removeAccount } = useStore();
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = db.accounts.find((a) => a.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [kind, setKind] = useState<AccountKind>(existing?.kind ?? 'cash');
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? 'SYP');
  const [opening, setOpening] = useState(
    existing ? amountToInput(existing.opening, existing.currency) : ''
  );
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const usedByTxs = existing
    ? db.txs.some((tx) => tx.accountId === existing.id || tx.toAccountId === existing.id)
    : false;

  const save = () => {
    setError('');
    if (!name.trim()) {
      setError('اكتب اسماً للحساب');
      return;
    }
    const openingMinor = parseAmount(opening, currency);
    if (existing) {
      updateAccount(existing.id, {
        name: name.trim(),
        kind,
        currency: usedByTxs ? existing.currency : currency,
        opening: openingMinor,
      });
    } else {
      addAccount({ name: name.trim(), kind, currency, opening: openingMinor });
    }
    router.back();
  };

  return (
    <Screen>
      <BackBar title={existing ? 'تعديل الحساب' : 'حساب جديد'} onBack={() => router.back()} />

      <Card style={{ gap: 12 }}>
        <Field label="اسم الحساب" value={name} onChangeText={setName} placeholder="نقداً، بنك، محفظة..." />

        <Text style={{ color: theme.muted, fontSize: 12.5, textAlign: 'right' }}>نوع الحساب</Text>
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: 'cash', label: 'نقد', emoji: '💵' },
            { value: 'bank', label: 'بنك', emoji: '🏦' },
            { value: 'wallet', label: 'محفظة', emoji: '📱' },
          ]}
        />

        <Text style={{ color: theme.muted, fontSize: 12.5, textAlign: 'right' }}>العملة</Text>
        {usedByTxs ? (
          <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>
            العملة مقفولة لأن الحساب عليه حركات ({CURRENCIES[currency].label}).
          </Text>
        ) : (
          <Segmented
            value={currency}
            onChange={setCurrency}
            options={CURRENCY_ORDER.map((code) => ({
              value: code,
              label: CURRENCIES[code].label,
            }))}
          />
        )}

        <Field
          label={`الرصيد الافتتاحي (${CURRENCIES[currency].symbol})`}
          value={opening}
          onChangeText={setOpening}
          placeholder="0"
          keyboardType="decimal-pad"
        />
        <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>
          الرصيد الافتتاحي يُضاف فوق مجموع الحركات.
        </Text>
      </Card>

      {existing ? (
        <Card style={{ gap: 4 }}>
          <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'right' }}>الرصيد الحالي</Text>
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900', textAlign: 'right' }}>
            {formatMoney(accountBalance(db, existing.id), existing.currency)}
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

      <Btn label={existing ? 'حفظ التعديلات' : 'إضافة الحساب'} onPress={save} />

      {existing ? (
        confirmDelete ? (
          <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
            <Btn
              label="تأكيد الحذف"
              variant="danger"
              style={{ flex: 1 }}
              onPress={() => {
                removeAccount(existing.id);
                router.back();
              }}
            />
            <Btn label="إلغاء" variant="soft" style={{ flex: 1 }} onPress={() => setConfirmDelete(false)} />
          </View>
        ) : (
          <Btn
            label={usedByTxs ? 'حذف الحساب وحركاته' : 'حذف الحساب'}
            variant="ghost"
            onPress={() => setConfirmDelete(true)}
          />
        )
      ) : null}
    </Screen>
  );
}
