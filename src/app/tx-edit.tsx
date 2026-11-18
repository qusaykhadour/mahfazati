import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TxForm } from '../components/TxForm';
import { BackBar, Btn, Card, Empty, Screen } from '../components/ui';
import { useStore } from '../lib/store';

export default function TxEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { db } = useStore();
  const router = useRouter();
  const tx = db.txs.find((item) => item.id === id);

  if (!tx) {
    return (
      <Screen>
        <BackBar title="تعديل الحركة" onBack={() => router.back()} />
        <Card>
          <Empty emoji="🔍" text="الحركة غير موجودة" hint="ربما انحذفت." />
        </Card>
        <Btn label="رجوع" variant="soft" onPress={() => router.back()} />
      </Screen>
    );
  }

  return <TxForm initial={tx} />;
}
