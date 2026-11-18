import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../lib/store';

export function useTheme() {
  return useStore().theme;
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const inner = padded ? <View style={[{ padding: 18, gap: 14 }, style]}>{children}</View> : children;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{inner}</View>
      )}
    </View>
  );
}

export function cardShadow(theme: ReturnType<typeof useTheme>): ViewStyle {
  return theme.name === 'light'
    ? {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 18,
        elevation: 3,
      }
    : {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 14,
        elevation: 0,
      };
}

export function Header({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.headerRow, { marginBottom: 2 }]}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: theme.text, fontSize: 26, fontWeight: '900', textAlign: 'right' }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: theme.muted, fontSize: 12.5, textAlign: 'right' }}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function BackBar({ title, onBack }: { title: string; onBack: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.headerRow, { marginBottom: 6 }]}>
      <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900', textAlign: 'right', flex: 1 }}>
        {title}
      </Text>
      <Pressable
        onPress={onBack}
        hitSlop={12}
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
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>›</Text>
      </Pressable>
    </View>
  );
}

export function Card({
  children,
  style,
  tone,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'primary';
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        cardShadow(theme),
        {
          backgroundColor: tone === 'primary' ? theme.primary : theme.card,
          borderColor: tone === 'primary' ? theme.primary : theme.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.headerRow, { marginTop: 8, marginBottom: -2 }]}>
      <Text style={{ color: theme.text, fontWeight: '900', fontSize: 16.5, textAlign: 'right', flex: 1 }}>
        {children}
      </Text>
      {right}
    </View>
  );
}

type BtnVariant = 'primary' | 'soft' | 'ghost' | 'danger';

export function Btn({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
  small,
}: {
  label: string;
  onPress: () => void;
  variant?: BtnVariant;
  icon?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const theme = useTheme();
  const bg =
    variant === 'primary'
      ? theme.primary
      : variant === 'soft'
        ? theme.card
        : variant === 'danger'
          ? theme.expenseSoft
          : 'transparent';
  const fg =
    variant === 'primary'
      ? theme.onPrimary
      : variant === 'danger'
        ? theme.expense
        : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        small && { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12 },
        variant === 'primary' && cardShadow(theme),
        {
          backgroundColor: bg,
          borderColor: variant === 'soft' ? theme.border : bg,
          opacity: disabled ? 0.45 : pressed ? 0.78 : 1,
        },
        style,
      ]}
    >
      {icon ? <Text style={{ color: fg, fontSize: small ? 14 : 15 }}>{icon}</Text> : null}
      <Text
        style={{
          color: fg,
          fontWeight: '800',
          fontSize: small ? 13 : 15,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  style,
  inputStyle,
  ...props
}: TextInputProps & { label?: string; style?: StyleProp<ViewStyle>; inputStyle?: StyleProp<TextStyle> }) {
  const theme = useTheme();
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <Text style={{ color: theme.muted, fontSize: 12.5, textAlign: 'right' }}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={theme.muted}
        {...props}
        style={[
          {
            backgroundColor: theme.cardAlt,
            borderColor: theme.border,
            color: theme.text,
            borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15.5,
            textAlign: 'right',
            writingDirection: 'rtl',
          },
          inputStyle,
        ]}
      />
    </View>
  );
}

export interface Option<T extends string> {
  value: T;
  label: string;
  emoji?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        backgroundColor: theme.cardAlt,
        borderRadius: 15,
        padding: 4,
        gap: 4,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              {
                flex: 1,
                paddingVertical: 9,
                borderRadius: 11,
                backgroundColor: active ? theme.card : 'transparent',
                alignItems: 'center',
              },
              active && cardShadow(theme),
            ]}
          >
            <Text
              style={{
                color: active ? theme.text : theme.muted,
                fontWeight: active ? '800' : '600',
                fontSize: 13.5,
              }}
            >
              {option.emoji ? `${option.emoji} ` : ''}
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  color?: string;
}) {
  const theme = useTheme();
  const accent = color ?? theme.primary;
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 9,
        paddingHorizontal: 13,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? accent : theme.border,
        backgroundColor: active ? accent + '1F' : theme.card,
      }}
    >
      <Text style={{ color: active ? accent : theme.muted, fontWeight: '700', fontSize: 12.5 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Empty({ emoji, text, hint }: { emoji: string; text: string; hint?: string }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 26, gap: 7 }}>
      <View
        style={{
          width: 58,
          height: 58,
          borderRadius: 20,
          backgroundColor: theme.cardAlt,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 2,
        }}
      >
        <Text style={{ fontSize: 26 }}>{emoji}</Text>
      </View>
      <Text style={{ color: theme.text, fontWeight: '800', textAlign: 'center', fontSize: 15 }}>
        {text}
      </Text>
      {hint ? (
        <Text style={{ color: theme.muted, fontSize: 12.5, textAlign: 'center', lineHeight: 19 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View
      style={{
        height: 9,
        borderRadius: 999,
        backgroundColor: theme.cardAlt,
        overflow: 'hidden',
        flexDirection: 'row-reverse',
      }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          backgroundColor: color ?? theme.primary,
          borderRadius: 999,
        }}
      />
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.border }} />;
}

export function Tag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: bg,
      }}
    >
      <Text style={{ color, fontSize: 10.5, fontWeight: '800' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16 },
  btn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
});
