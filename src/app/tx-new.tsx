import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { TxForm } from '../components/TxForm';
import type { TxKind } from '../lib/types';

export default function TxNewScreen() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind: TxKind =
    params.kind === 'income' || params.kind === 'transfer' ? params.kind : 'expense';
  return <TxForm defaultKind={kind} />;
}
