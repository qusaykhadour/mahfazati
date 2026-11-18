import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../lib/store';

const ITEMS = [
  { route: '/', label: 'الرئيسية', emoji: '🏠' },
  { route: '/accounts', label: 'الحسابات', emoji: '💳' },
  { route: '/debts', label: 'الديون', emoji: '🤝' },
  { route: '/savings', label: 'المدخرات', emoji: '🎯' },
  { route: '/reports', label: 'التقارير', emoji: '📊' },
  { route: '/settings', label: 'الإعدادات', emoji: '⚙️' },
] as const;

export function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const theme = useStore().theme;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: Math.max(insets.bottom, 10),
        paddingTop: 9,
        paddingHorizontal: 6,
        backgroundColor: theme.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        borderColor: theme.border,
        flexDirection: 'row-reverse',
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 1,
        shadowRadius: 16,
        elevation: 12,
      }}
    >
      {ITEMS.map((item) => {
        const active = pathname === item.route;
        return (
          <Pressable
            key={item.route}
            onPress={() => router.replace(item.route)}
            style={{ flex: 1, alignItems: 'center', gap: 3 }}
          >
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: active ? theme.primarySoft : 'transparent',
              }}
            >
              <Text style={{ fontSize: 17, opacity: active ? 1 : 0.55 }}>{item.emoji}</Text>
            </View>
            <Text
              style={{
                fontSize: 10.5,
                color: active ? theme.primary : theme.muted,
                fontWeight: active ? '900' : '500',
              }}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
