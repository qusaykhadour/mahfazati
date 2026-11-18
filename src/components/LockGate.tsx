import React, { useEffect, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { Btn, useTheme } from './ui';
import { Logo } from './Logo';
import { AUTO_LOCK_MS, authenticate, checkBiometric } from '../lib/security';
import { useStore } from '../lib/store';

/**
 * بوابة القفل: تغمّد التطبيق كاملاً عند التفعيل، وعند العودة بعد غياب ربع ساعة.
 * تُستخدم فقط عندما يكون القفل مفعّلاً بالإعدادات. فشل القفل لا يلمس البيانات أبداً.
 */
export function LockGate({ children }: { children: React.ReactNode }) {
  const { db } = useStore();
  const theme = useTheme();
  const enabled = db.settings.lockEnabled === true;

  const [locked, setLocked] = useState(false);
  const [label, setLabel] = useState('بصمة إصبعك');
  const [checking, setChecking] = useState(false);
  const [failedOnce, setFailedOnce] = useState(false);
  const lastAway = useRef<number | null>(null);
  const wasEnabled = useRef(false);

  useEffect(() => {
    checkBiometric().then((status) => setLabel(status.label));
  }, []);

  // تفعيل القفل من الإعدادات = قفل فوري للتجربة والتأكيد
  useEffect(() => {
    if (enabled && !wasEnabled.current) setLocked(true);
    wasEnabled.current = enabled;
  }, [enabled]);

  // القفل التلقائي بعد الغياب
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const away = lastAway.current;
        lastAway.current = null;
        if (enabled && away != null && Date.now() - away > AUTO_LOCK_MS) setLocked(true);
      } else {
        lastAway.current = Date.now();
      }
    });
    return () => sub.remove();
  }, [enabled]);

  // محاولة فتح تلقائية عند ظهور البوابة
  useEffect(() => {
    if (!locked) return;
    let alive = true;
    (async () => {
      setChecking(true);
      const ok = await authenticate(`افتح محفظتك ب${label}`);
      if (!alive) return;
      setChecking(false);
      if (ok) setLocked(false);
      else setFailedOnce(true);
    })();
    return () => {
      alive = false;
    };
  }, [locked, label]);

  if (!enabled || !locked) return <>{children}</>;

  const retry = async () => {
    setChecking(true);
    const ok = await authenticate(`افتح محفظتك ب${label}`);
    setChecking(false);
    if (ok) {
      setFailedOnce(false);
      setLocked(false);
    } else {
      setFailedOnce(true);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 28,
      }}
    >
      <Logo size={64} />
      <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
        محفظتي مقفلة 🔒
      </Text>
      <Text style={{ color: theme.muted, fontSize: 13, textAlign: 'center' }}>
        {checking
          ? `بانتظار ${label}...`
          : failedOnce
            ? `ما تم الفتح ب${label} — جرب من جديد.`
            : `افتح ب${label} حتى تشوف حساباتك.`}
      </Text>
      {!checking ? <Btn label={`فتح ب${label}`} icon="🔐" onPress={retry} /> : null}
      <Text style={{ color: theme.muted, fontSize: 10.5, textAlign: 'center' }}>
        بياناتك محلية وما بتتأثر بالقفل.
      </Text>
    </View>
  );
}
