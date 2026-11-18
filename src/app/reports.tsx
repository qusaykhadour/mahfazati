import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { TabBar } from '../components/TabBar';
import { PieChart } from '../components/PieChart';
import { Card, Empty, Header, Screen, SectionTitle, useTheme } from '../components/ui';
import { formatMoney, percent } from '../lib/money';import {
  categoryBreakdown,
  monthKey,
  monthLabel,
  monthTotals,
  shiftMonth,
} from '../lib/selectors';
import { useStore } from '../lib/store';

export default function ReportsScreen() {
  const { db, theme } = useStore();
  const [month, setMonth] = useState(monthKey(new Date()));
  const hide = db.settings.hideAmounts === true;

  const totals = monthTotals(db, month);
  const slices = useMemo(() => categoryBreakdown(db, 'expense', month), [db, month]);
  const incomeSlices = useMemo(() => categoryBreakdown(db, 'income', month), [db, month]);

  const income = totals.income;
  const expense = totals.expense;
  const net = income - expense;

  const chartSlices = slices.slice(0, 8).map((slice) => ({ value: slice.total, color: slice.color }));
  const hasData = slices.length > 0;

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Header title="التقارير" subtitle={monthLabel(month)} />

        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={() => setMonth(shiftMonth(month, 1))}
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>›</Text>
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15 }}>{monthLabel(month)}</Text>
            <Text style={{ color: theme.muted, fontSize: 11 }}>اضغط الأسهم لتغيير الشهر</Text>
          </View>
          <Pressable
            onPress={() => setMonth(shiftMonth(month, -1))}
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>‹</Text>
          </Pressable>
        </View>

        <Text
          style={{ color: theme.muted, fontSize: 12, textAlign: 'right', paddingHorizontal: 4 }}
        >
          كل الأرقام بالليرة السورية (العملة الأساس) حسب سعر السوق المعتد — تُحسب كل العملات معاً.
        </Text>

        <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
          <Card style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>دخل</Text>
            <Text style={{ color: theme.income, fontWeight: '800', fontSize: 14, textAlign: 'right' }}>
              {formatMoney(income, 'SYP', { hidden: hide })}
            </Text>
          </Card>
          <Card style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>مصروف</Text>
            <Text style={{ color: theme.expense, fontWeight: '800', fontSize: 14, textAlign: 'right' }}>
              {formatMoney(expense, 'SYP', { hidden: hide })}
            </Text>
          </Card>
          <Card style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>الصافي</Text>
            <Text
              style={{
                color: net >= 0 ? theme.income : theme.expense,
                fontWeight: '800',
                fontSize: 14,
                textAlign: 'right',
              }}
            >
              {formatMoney(net, 'SYP', { hidden: hide })}
            </Text>
          </Card>
        </View>

        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 18 }}>
          {hasData ? (
            <>
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <PieChart slices={chartSlices} />
                <View style={{ position: 'absolute', alignItems: 'center' }}>
                  <Text style={{ color: theme.muted, fontSize: 11 }}>مجموع المصروف</Text>
                  <Text style={{ color: theme.text, fontWeight: '900', fontSize: 15 }}>
                    {formatMoney(expense, 'SYP', { hidden: hide })}
                  </Text>
                </View>
              </View>
              <Text style={{ color: theme.muted, fontSize: 11.5 }}>
                توزيع المصروف على {slices.length} تصنيف
              </Text>
            </>
          ) : (
            <Empty emoji="📊" text="ما في مصاريف هذا الشهر" hint="سجّل حركة وستظهر التقارير." />
          )}
        </Card>

        {hasData ? (
          <>
            <SectionTitle>حسب التصنيف</SectionTitle>
            <Card style={{ gap: 10 }}>
              {slices.map((slice) => (
                <View key={slice.categoryId} style={{ gap: 5 }}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 15 }}>{slice.emoji}</Text>
                    <Text style={{ color: theme.text, fontSize: 13.5, fontWeight: '700', flex: 1, textAlign: 'right' }}>
                      {slice.name}
                    </Text>
                    <Text style={{ color: theme.muted, fontSize: 12 }}>
                      {Math.round(slice.share * 100)}%
                    </Text>
                    <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>
                      {formatMoney(slice.total, 'SYP', { hidden: hide })}
                    </Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 999, backgroundColor: theme.cardAlt, flexDirection: 'row-reverse' }}>
                    <View
                      style={{
                        width: `${Math.max(2, percent(slice.total, expense))}%`,
                        backgroundColor: slice.color,
                        borderRadius: 999,
                      }}
                    />
                  </View>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {incomeSlices.length > 0 ? (
          <>
            <SectionTitle>مصادر الدخل</SectionTitle>
            <Card style={{ gap: 8 }}>
              {incomeSlices.map((slice) => (
                <View
                  key={slice.categoryId}
                  style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}
                >
                  <Text style={{ fontSize: 15 }}>{slice.emoji}</Text>
                  <Text style={{ color: theme.text, fontSize: 13.5, flex: 1, textAlign: 'right' }}>
                    {slice.name}
                  </Text>
                  <Text style={{ color: theme.income, fontSize: 13, fontWeight: '800' }}>
                    {formatMoney(slice.total, 'SYP', { hidden: hide })}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}
      </Screen>
      <TabBar />
    </View>
  );
}
