import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { TabBar } from '../components/TabBar';
import { Btn, Card, Empty, Header, Screen, SectionTitle, useTheme } from '../components/ui';
import { formatMoney, CURRENCIES } from '../lib/money';
import { accountBalance, sumAccountsIn } from '../lib/selectors';
import { useStore } from '../lib/store';

const KIND_LABEL: Record<string, string> = {
  cash: 'نقد',
  bank: 'بنك',
  wallet: 'محفظة',
};

export default function AccountsScreen() {
  const { db, theme } = useStore();
  const router = useRouter();
  const hide = db.settings.hideAmounts === true;
  const totalSyp = sumAccountsIn(db, 'SYP');
  const totalUsd = sumAccountsIn(db, 'USD');

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Header
          title="الحسابات"
          subtitle="أرصدة محسوبة من الحركات"
          right={
            <Pressable
              onPress={() => router.push('/account-form')}
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

        <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
          <Card style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'right' }}>كل الحسابات بالليرة</Text>
            <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800', textAlign: 'right' }}>
              {formatMoney(totalSyp, 'SYP', { hidden: hide })}
            </Text>
          </Card>
          <Card style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'right' }}>بالمقابل دولار</Text>
            <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800', textAlign: 'right' }}>
              {formatMoney(totalUsd, 'USD', { hidden: hide })}
            </Text>
          </Card>
        </View>

        <SectionTitle
          right={
            <Text style={{ color: theme.muted, fontSize: 12 }}>{db.accounts.length} حساب</Text>
          }
        >
          كل الحسابات
        </SectionTitle>

        {db.accounts.length === 0 ? (
          <Card>
            <Empty emoji="💳" text="ما في حسابات" hint="أضف حساباً نقدياً أو بنكياً للبدء." />
          </Card>
        ) : (
          db.accounts.map((account) => {
            const balance = accountBalance(db, account.id);
            const txs = db.txs.filter(
              (tx) => tx.accountId === account.id || tx.toAccountId === account.id
            ).length;
            return (
              <Pressable
                key={account.id}
                onPress={() => router.push({ pathname: '/account-form', params: { id: account.id } })}
              >
                <Card style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 18 }}>
                      {account.kind === 'bank' ? '🏦' : account.kind === 'wallet' ? '📱' : '💵'}
                    </Text>
                    <Text
                      style={{ color: theme.text, fontWeight: '800', fontSize: 15.5, flex: 1, textAlign: 'right' }}
                    >
                      {account.name}
                    </Text>
                    <Text
                      style={{
                        color: balance < 0 ? theme.expense : theme.text,
                        fontWeight: '800',
                        fontSize: 15,
                      }}
                    >
                      {formatMoney(balance, account.currency, { hidden: hide })}
                    </Text>
                  </View>
                  <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>
                    {KIND_LABEL[account.kind]} · {CURRENCIES[account.currency].label} ·{' '}
                    {txs} حركة
                  </Text>
                </Card>
              </Pressable>
            );
          })
        )}

        <Btn
          label="إضافة حساب"
          icon="＋"
          variant="soft"
          onPress={() => router.push('/account-form')}
        />
      </Screen>
      <TabBar />
    </View>
  );
}
