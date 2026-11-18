import React from 'react';
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
  useTheme,
} from '../components/ui';
import { formatMoney, fromSypMinor, percent, toSypMinor } from '../lib/money';
import { useStore } from '../lib/store';

export default function SavingsScreen() {
  const { db, theme } = useStore();
  const router = useRouter();
  const hide = db.settings.hideAmounts === true;

  const totalSyp = db.goals.reduce((s, g) => s + toSypMinor(g.saved, g.currency, db.settings), 0);
  const totalUsd = fromSypMinor(totalSyp, 'USD', db.settings);
  const targetSyp = db.goals.reduce((s, g) => s + toSypMinor(g.target, g.currency, db.settings), 0);
  const targetUsd = fromSypMinor(targetSyp, 'USD', db.settings);

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Header
          title="المدخرات"
          subtitle="أهداف ادخار مع تقدّم واضح"
          right={
            <Pressable
              onPress={() => router.push('/goal-form')}
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

        <Card tone="primary" style={{ gap: 6 }}>
          <Text style={{ color: theme.onPrimary, opacity: 0.82, fontSize: 12.5, textAlign: 'right' }}>
            مجموع المدخر
          </Text>
          <Text style={{ color: theme.onPrimary, fontSize: 25, fontWeight: '900', textAlign: 'right' }}>
            {formatMoney(totalSyp, 'SYP', { hidden: hide })}
          </Text>
          <Text style={{ color: theme.onPrimary, opacity: 0.9, fontSize: 15, fontWeight: '700', textAlign: 'right' }}>
            {formatMoney(totalUsd, 'USD', { hidden: hide })}
          </Text>
          <Text style={{ color: theme.onPrimary, opacity: 0.72, fontSize: 11.5, textAlign: 'right', marginTop: 2 }}>
            من هدف {formatMoney(targetSyp, 'SYP')} + {formatMoney(targetUsd, 'USD')}
          </Text>
        </Card>

        <SectionTitle>{`${db.goals.length} هدف`}</SectionTitle>

        {db.goals.length === 0 ? (
          <Card>
            <Empty
              emoji="🎯"
              text="ما في أهداف ادخار"
              hint="حدّد هدفاً (موبايل جديد، سفر...) وتابع نسبة الإنجاز."
            />
          </Card>
        ) : (
          db.goals.map((goal) => {
            const ratio = goal.target > 0 ? Math.min(1, goal.saved / goal.target) : 0;
            const done = goal.target > 0 && goal.saved >= goal.target;
            return (
              <Pressable
                key={goal.id}
                onPress={() => router.push({ pathname: '/goal-form', params: { id: goal.id } })}
              >
                <Card style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 18 }}>{done ? '🏆' : '🎯'}</Text>
                    <Text
                      style={{ color: theme.text, fontWeight: '800', fontSize: 15.5, flex: 1, textAlign: 'right' }}
                    >
                      {goal.name}
                    </Text>
                    <Text style={{ color: done ? theme.income : theme.primary, fontWeight: '800', fontSize: 14 }}>
                      {percent(goal.saved, goal.target)}%
                    </Text>                  </View>
                  <ProgressBar value={ratio} color={done ? theme.income : theme.primary} />
                  <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.text, fontSize: 12.5, fontWeight: '700' }}>
                      {formatMoney(goal.saved, goal.currency, { hidden: hide })}
                    </Text>
                    <Text style={{ color: theme.muted, fontSize: 12 }}>
                      الهدف {formatMoney(goal.target, goal.currency, { hidden: hide })}
                    </Text>
                  </View>
                  {goal.note ? (
                    <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>
                      {goal.note}
                    </Text>
                  ) : null}
                </Card>
              </Pressable>
            );
          })
        )}

        <Btn label="إضافة هدف" icon="＋" variant="soft" onPress={() => router.push('/goal-form')} />
      </Screen>
      <TabBar />
    </View>
  );
}
