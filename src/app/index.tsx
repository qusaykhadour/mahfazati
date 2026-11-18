import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { TabBar } from '../components/TabBar';
import { Logo } from '../components/Logo';
import { Card, Empty, Screen, SectionTitle, Divider, useTheme, cardShadow } from '../components/ui';
import { formatMoney, fromSypMinor } from '../lib/money';
import { rateQuote } from '../lib/money';
import {
  accountName,
  categoryById,
  groupByDay,
  monthKey,
  monthTotals,
  totalWealth,
} from '../lib/selectors';
import type { Tx } from '../lib/types';
import { useStore } from '../lib/store';

function TxRow({ tx, onPress }: { tx: Tx; onPress: () => void }) {
  const theme = useTheme();
  const db = useStore().db;
  const txHidden = db.settings.hideAmounts === true;
  const category = tx.kind === 'transfer' ? undefined : categoryById(db, tx.categoryId);

  const title =
    tx.kind === 'transfer' ? 'تحويل' : (category?.name ?? (tx.kind === 'income' ? 'دخل' : 'مصروف'));
  const emoji = tx.kind === 'transfer' ? '🔁' : (category?.emoji ?? '📦');
  const accent =
    tx.kind === 'income' ? theme.income : tx.kind === 'expense' ? theme.expense : theme.transfer;
  const soft =
    tx.kind === 'income'
      ? theme.incomeSoft
      : tx.kind === 'expense'
        ? theme.expenseSoft
        : theme.primarySoft;
  const sign = tx.kind === 'income' ? '+' : tx.kind === 'expense' ? '-' : '';

  const subtitle =
    tx.kind === 'transfer'
      ? `${accountName(db, tx.accountId)} ← ${accountName(db, tx.toAccountId)}`
      : accountName(db, tx.accountId);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 11,
        paddingVertical: 9,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          backgroundColor: soft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14.5, textAlign: 'right' }}>
          {title}
        </Text>
        <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }} numberOfLines={1}>
          {subtitle}
          {tx.note ? ` · ${tx.note}` : ''}
        </Text>
      </View>
      <Text style={{ color: accent, fontWeight: '900', fontSize: 14.5 }}>
        {sign}
        {formatMoney(tx.amount, tx.currency, { hidden: txHidden })}
      </Text>
    </Pressable>
  );
}

function QuickAction({
  emoji,
  label,
  tint,
  soft,
  onPress,
}: {
  emoji: string;
  label: string;
  tint: string;
  soft: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          alignItems: 'center',
          gap: 7,
          paddingVertical: 13,
          borderRadius: 18,
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
          opacity: pressed ? 0.75 : 1,
        },
        cardShadow(theme),
      ]}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 13,
          backgroundColor: soft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 17, color: tint }}>{emoji}</Text>
      </View>
      <Text style={{ color: theme.text, fontWeight: '800', fontSize: 12.5 }}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { db, theme } = useStore();
  const router = useRouter();
  const hide = db.settings.hideAmounts === true;
  const wealth = totalWealth(db);

  // أول استعمال: توجيه لشاشة الترحيب
  React.useEffect(() => {
    if (db.settings.welcomed !== true) router.replace('/onboarding');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const totals = monthTotals(db, monthKey(new Date()));
  const groups = groupByDay([...db.txs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 80));

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 11 }}>
          <View style={{ borderRadius: 15, overflow: 'hidden' }}>
            <Logo size={42} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: theme.text, fontSize: 22, fontWeight: '900', textAlign: 'right' }}>
              محفظتي
            </Text>
            <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>
              مصاريف · ديون · مدخرات
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 17 }}>⚙️</Text>
          </Pressable>
        </View>

        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            { borderRadius: 26, padding: 20, gap: 4, overflow: 'hidden' },
            cardShadow(theme),
          ]}
        >
          <View
            style={{
              position: 'absolute',
              width: 230,
              height: 230,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.09)',
              top: -110,
              left: -70,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 200,
              height: 200,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.06)',
              bottom: -120,
              right: -40,
            }}
          />

          <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12.5, flex: 1, textAlign: 'right' }}>
              إجمالي الرصيد
            </Text>
            <View
              style={{
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.18)',
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 10.5, fontWeight: '800' }}>
                {db.accounts.length} حساب
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: '#ffffff',
              fontSize: 31,
              fontWeight: '900',
              textAlign: 'right',
              marginTop: 2,
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatMoney(wealth.syp, 'SYP', { hidden: hide })}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 14.5, textAlign: 'right' }}>
            ≈ {formatMoney(wealth.usd, 'USD', { hidden: hide })}
          </Text>

          <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 10 }}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.16)',
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 10.5, fontWeight: '700' }}>
                {`سودا: شراء ${rateQuote(db.settings, 'USD').buy || '—'} · بيع ${rateQuote(db.settings, 'USD').sell || '—'}`}
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.16)',
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 10.5, fontWeight: '700' }}>
                {`رسمي: ${rateQuote(db.settings, 'USD', 'official').buy || '—'}`}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
          <QuickAction
            emoji="➖"
            label="مصروف"
            tint={theme.expense}
            soft={theme.expenseSoft}
            onPress={() => router.push({ pathname: '/tx-new', params: { kind: 'expense' } })}
          />
          <QuickAction
            emoji="➕"
            label="دخل"
            tint={theme.income}
            soft={theme.incomeSoft}
            onPress={() => router.push({ pathname: '/tx-new', params: { kind: 'income' } })}
          />
          <QuickAction
            emoji="🔁"
            label="تحويل"
            tint={theme.transfer}
            soft={theme.primarySoft}
            onPress={() => router.push({ pathname: '/tx-new', params: { kind: 'transfer' } })}
          />
        </View>

        <Card style={{ paddingVertical: 14 }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>
                دخل الشهر
              </Text>
              <Text style={{ color: theme.income, fontWeight: '900', fontSize: 15, textAlign: 'right' }}>
                {formatMoney(totals.income, 'SYP', { hidden: hide })}
              </Text>
              <Text style={{ color: theme.income, fontWeight: '700', fontSize: 12, textAlign: 'right' }}>
                {formatMoney(fromSypMinor(totals.income, 'USD', db.settings), 'USD', { hidden: hide })}
              </Text>
            </View>
            <View style={{ width: 1, height: 52, backgroundColor: theme.border }} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>
                مصروف الشهر
              </Text>
              <Text style={{ color: theme.expense, fontWeight: '900', fontSize: 15, textAlign: 'right' }}>
                {formatMoney(totals.expense, 'SYP', { hidden: hide })}
              </Text>
              <Text style={{ color: theme.expense, fontWeight: '700', fontSize: 12, textAlign: 'right' }}>
                {formatMoney(fromSypMinor(totals.expense, 'USD', db.settings), 'USD', { hidden: hide })}
              </Text>
            </View>
          </View>
        </Card>

        <SectionTitle
          right={
            <Pressable onPress={() => router.push('/reports')}>
              <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>التقارير ‹</Text>
            </Pressable>
          }
        >
          آخر الحركات
        </SectionTitle>

        {groups.length === 0 ? (
          <Card>
            <Empty
              emoji="🧾"
              text="ما في حركات بعد"
              hint="اضغط «مصروف» أو «دخل» لتسجيل أول حركة — كل شي يُحفظ على جهازك."
            />
          </Card>
        ) : (
          groups.map((group) => (
            <Card key={group.day} style={{ paddingVertical: 8, paddingHorizontal: 14 }}>
              <Text
                style={{
                  color: theme.muted,
                  fontSize: 11.5,
                  fontWeight: '800',
                  textAlign: 'right',
                  paddingVertical: 4,
                }}
              >
                {group.label}
              </Text>
              {group.txs.map((tx, index) => (
                <View key={tx.id}>
                  {index > 0 ? <Divider /> : null}
                  <TxRow
                    tx={tx}
                    onPress={() => router.push({ pathname: '/tx-edit', params: { id: tx.id } })}
                  />
                </View>
              ))}
            </Card>
          ))
        )}

        <View style={{ alignItems: 'center', gap: 4, marginTop: 6 }}>
          <Logo size={22} withBackground={false} />
          <Text style={{ color: theme.muted, fontSize: 10.5 }}>محفظتي · بيانات محلية 100%</Text>
        </View>
      </Screen>
      <TabBar />
    </View>
  );
}
