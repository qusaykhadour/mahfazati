import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { TabBar } from '../components/TabBar';
import {
  Btn,
  Card,
  Empty,
  Header,
  ProgressBar,
  Screen,
  SectionTitle,
  Segmented,
  useTheme,
} from '../components/ui';
import { formatMoney, fromSypMinor, percent, toSypMinor } from '../lib/money';
import { debtRemaining } from '../lib/selectors';
import type { DebtDirection } from '../lib/types';
import { useStore } from '../lib/store';

export default function DebtsScreen() {
  const { db, theme } = useStore();
  const router = useRouter();
  const [direction, setDirection] = useState<DebtDirection>('owed');
  const hide = db.settings.hideAmounts === true;

  const list = db.debts.filter((debt) => debt.direction === direction);
  const totalSyp = list.reduce(
    (sum, debt) =>
      sum + toSypMinor(debtRemaining(debt.paid, debt.amount), debt.currency, db.settings),
    0
  );
  const totalUsd = fromSypMinor(totalSyp, 'USD', db.settings);

  const isOwed = direction === 'owed';
  const accent = isOwed ? theme.income : theme.expense;

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Header
          title="الديون"
          subtitle="لي عند الناس وعليّ للناس"
          right={
            <Pressable
              onPress={() =>
                router.push({ pathname: '/debt-form', params: { direction } })
              }
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                backgroundColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: theme.onPrimary, fontSize: 20, fontWeight: '800' }}>+</Text>
            </Pressable>
          }
        />

        <Segmented
          value={direction}
          onChange={setDirection}
          options={[
            { value: 'owed', label: 'لي' },
            { value: 'owing', label: 'عليّ' },
          ]}
        />

        <Card style={{ gap: 6 }}>
          <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'right' }}>
            إجمالي المتبقّي {isOwed ? 'لي' : 'عليّ'} — كل العملات بالليرة
          </Text>
          <Text style={{ color: accent, fontSize: 24, fontWeight: '900', textAlign: 'right' }}>
            {formatMoney(totalSyp, 'SYP', { hidden: hide })}
          </Text>
          <Text style={{ color: accent, fontSize: 16, fontWeight: '800', textAlign: 'right' }}>
            {formatMoney(totalUsd, 'USD', { hidden: hide })}
          </Text>
        </Card>

        <SectionTitle>{`${list.length} شخص`}</SectionTitle>

        {list.length === 0 ? (
          <Card>
            <Empty
              emoji="🤝"
              text={isOwed ? 'ما في ديون لك' : 'ما في ديون عليك'}
              hint="اضغط + لتسجيل دين جديد، والتسديد الجزئي متاح."
            />
          </Card>
        ) : (
          list.map((debt) => {
            const remaining = debtRemaining(debt.paid, debt.amount);
            const settled = remaining === 0;
            return (
              <Pressable
                key={debt.id}
                onPress={() => router.push({ pathname: '/debt-form', params: { id: debt.id } })}
              >
                <Card style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 18 }}>{isOwed ? '📥' : '📤'}</Text>
                    <Text
                      style={{ color: theme.text, fontWeight: '800', fontSize: 15.5, flex: 1, textAlign: 'right' }}
                    >
                      {debt.person}
                    </Text>
                    <Text
                      style={{
                        color: settled ? theme.muted : accent,
                        fontWeight: '800',
                        fontSize: 15,
                        textDecorationLine: settled ? 'line-through' : 'none',
                      }}
                    >
                      {formatMoney(remaining, debt.currency, { hidden: hide })}
                    </Text>
                  </View>
                  {debt.note ? (
                    <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'right' }}>
                      {debt.note}
                    </Text>
                  ) : null}
                  <ProgressBar value={percent(debt.paid, debt.amount) / 100} color={accent} />
                  <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>
                    مسدَّد {formatMoney(debt.paid, debt.currency, { hidden: hide })} من{' '}
                    {formatMoney(debt.amount, debt.currency, { hidden: hide })}
                    {settled ? ' · مكتمل ✅' : ''}
                  </Text>
                </Card>
              </Pressable>
            );
          })
        )}

        <Btn
          label={isOwed ? 'دين لي' : 'دين عليّ'}
          icon="＋"
          variant="soft"
          onPress={() => router.push({ pathname: '/debt-form', params: { direction } })}
        />
      </Screen>
      <TabBar />
    </View>
  );
}
