import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Btn, Card, Field, Screen, useTheme } from '../components/ui';
import { Logo } from '../components/Logo';
import { useStore } from '../lib/store';

/** شاشة الترحيب الأولى — تظهر مرة واحدة فقط (٣ خطوات سريعة) */
export default function OnboardingScreen() {
  const { db, updateSettings } = useStore();
  const theme = useTheme();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(db.settings.userName ?? '');

  const finish = () => {
    updateSettings({ welcomed: true, userName: name.trim() || undefined });
    router.replace('/');
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 22 }}>
        <Logo size={74} />
        <Text style={{ color: theme.text, fontSize: 26, fontWeight: '900', textAlign: 'center' }}>
          {step === 0 ? 'أهلاً بمحفظتك 👋' : step === 1 ? 'شو نناديك؟' : 'جاهزين للانطلاق 🚀'}
        </Text>
      </View>

      {step === 0 ? (
        <Card style={{ gap: 10 }}>
          <Text style={{ color: theme.text, fontSize: 14.5, textAlign: 'right', lineHeight: 24 }}>
            مصاريفك وديونك ومدخراتك — بمكان واحد، على جهازك أنت فقط.
          </Text>
          <Text style={{ color: theme.muted, fontSize: 12.5, textAlign: 'right', lineHeight: 22 }}>
            • حسابات بأي عملة: ليرة سورية، دولار، يورو، تركية، يوان{'\n'}
            • أسعار صرف حية من السوق السودا{'\n'}
            • ديون ومدخرات وتقارير شهرية{'\n'}
            • نسخ احتياطية تلقائية وبيانات ما تغادر جهازك
          </Text>
          <Btn label="التالي ‹" onPress={() => setStep(1)} />
        </Card>
      ) : null}

      {step === 1 ? (
        <Card style={{ gap: 10 }}>
          <Field
            label="اسمك — اختياري"
            value={name}
            onChangeText={setName}
            placeholder="مثال: أبو أحمد"
          />
          <Text style={{ color: theme.muted, fontSize: 11.5, textAlign: 'right' }}>
            بسمّيك بيه بشاشة الترحيب لاحقاً. تقدر تتركه فاضي.
          </Text>
          <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
            <Btn label="رجوع" variant="soft" style={{ flex: 1 }} onPress={() => setStep(0)} />
            <Btn label="التالي ‹" style={{ flex: 1 }} onPress={() => setStep(2)} />
          </View>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card style={{ gap: 10 }}>
          <Text style={{ color: theme.text, fontSize: 14.5, textAlign: 'right', lineHeight: 24 }}>
            أول خطوة بعد الدخول: من تبويب «الحسابات» أضف حساباتك
            (نقداً، بنك، محفظة إلكترونية) بعملاتها.
          </Text>
          <Text style={{ color: theme.muted, fontSize: 12.5, textAlign: 'right' }}>
            وبعدها سجّل أول حركة من أزرار المصروف والدخل بالرئيسية.
          </Text>
          <Btn label="يلا نبدأ 💰" onPress={finish} />
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row-reverse', justifyContent: 'center', gap: 6, paddingVertical: 10 }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              width: i === step ? 22 : 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: i === step ? theme.primary : theme.cardAlt,
            }}
          />
        ))}
      </View>

      <Text style={{ color: theme.muted, fontSize: 10.5, textAlign: 'center' }}>
        محفظتي · بياناتك محلية ١٠٠٪ · لا حساب ولا تسجيل
      </Text>
    </Screen>
  );
}
