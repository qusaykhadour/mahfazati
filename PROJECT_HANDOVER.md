# 📦 PROJECT_HANDOVER · مرجع تسليم المشروع الدائم

> آخر تحديث: 2026-11-18 · الإصدار v2.0.0 (versionCode 2) · مستودع: https://github.com/qusaykhadour/mahfazati
> هذا الملف هو المرجع الدائم لأي مطوّر أو وكيل ذكاء صناعي يعمل على المشروع مستقبلاً.

---

## 1. نظرة عامة

**محفظتي (Mahfazati)** — تطبيق أندرويد لإدارة المال الشخصي، Offline-first بالكامل، عربي RTL، يعمل محلياً بلا خوادم وبلا إنترنت (إلا لجلب أسعار الصرف عند الطلب).

- **Stack:** React Native 0.88 · Expo SDK 58 · expo-router · TypeScript · Hermes · New Architecture (Fabric)
- **Package:** `com.mahfazati.app` · minSdk 24 · targetSdk 36 · compileSdk 37
- **البيانات:** AsyncStorage (SQLite داخلي) مشفّرة بالكامل — انظر القسم 3.

## 2. هيكلية المشروع (`src/`)

```
src/
├── app/            # شاشات expo-router (ملف = مسار)
│   ├── index.tsx        # الرئيسية: إجمالي الرصيد + أزرار سريعة
│   ├── onboarding.tsx   # شاشة الترحيب (3 صفحات، علم welcomed)
│   ├── accounts.tsx / account-form.tsx
│   ├── debts.tsx / debt-form.tsx      # owed = لي عند الناس، owing = عليّ للناس
│   ├── savings.tsx / goal-form.tsx    # أهداف ادخار
│   ├── reports.tsx                    # تقارير شهرية + رسوم دائرية
│   ├── tx-new.tsx / tx-edit.tsx       # حركة جديدة/تعديل (TxForm)
│   └── settings.tsx                   # أسعار الصرف، الأمان، التصنيفات، النسخ، الخطر
├── components/     # LockGate (بوابة البصمة) · TabBar · TxForm · PieChart · ui.tsx (مكتبة واجهة)
└── lib/            # المنطق الصرفي
    ├── types.ts     # كل الأنواع: Account/Tx/Debt/Goal/Settings/DB
    ├── money.ts     # مبالغ بأصغر وحدة (عدد صحيح)، 5 عملات، تحويل عبر SYP، حدود قصوى
    ├── storage.ts   # تحميل/حفظ DB + تحقق عميق من الاستيراد + purgeAll + LoadResult.ok
    ├── crypt.ts     # ⭐ التشفير المزدوج (القسم 3)
    ├── backups.ts   # نسخ داخلية يومية (7 أيام) + نسخة أمان قبل الاسترجاع
    ├── rates.ts     # جلب أسعار sp-today (سوق دمشق الموازي) + تحليل HTML
    ├── security.ts  # Biometric (bصمة/وجه) + قفل تلقائي بعد 15 دقيقة
    ├── store.tsx    # StoreProvider: كل العمليات addTx/updateAccount/... + منع الحفظ فوق بيانات تالفة
    └── selectors.ts / theme.ts
```

**قاعدة ذهبية:** كل المبالغ مخزنة **بأصغر وحدة عدد صحيح** (SYP بلا فاصلة، دولار بالقرش) — لا تُدخل floats في DB أبداً. `parseAmount` يقبل الأرقام العربية/الفارسية ويسقف عند 10^15.

## 3. نظام التشفير المزدوج ⭐ (حماية خدعة شاومي)

**المشكلة التي حُلّت:** على هواتف Xiaomi (MIUI/HyperOS) يعمل `expo-secure-store`/Keystore بنجاح داخل الجلسة ثم **يفقد القدرة على القراءة بعد إعادة تشغيل العملية** — مفتاح Keystore يختفي عملياً.

**الحل ثلاثي الأوضاع (`src/lib/crypt.ts`):**

| الوضع | التفعيل | المفتاح |
|---|---|---|
| `secure` | SecureStore يعمل (معظم الأجهزة) | عشوائي 32B في Android Keystore، محفوظ بـ `WHEN_UNLOCKED_THIS_DEVICE_ONLY` |
| `fallback` | فشل SecureStore في القراءة/الكتابة | PBKDF2-HMAC-SHA256 (1000 دورة) من بذرة عشوائية 32B مخزنة في AsyncStorage — ثابت لا يضيع |
| `locked` | يوجد مخزون مشفر بلا مفتاح | **Fail-Closed:** ممنوع توليد مفتاح جديد أو أي كتابة — قراءة فقط حتى مسح واعٍ |

**بطاقة الاسترجاع المزدوجة (نقطة الحفاظ على البيانات):**
- `saveDB` يكتب **نسختين**: المخزون الرئيسي `mahfazati.db.v1` (بالمفتاح النشط) + بطاقة استرجاع `mahfazati.db.recovery.v1` (دائماً بالمفتاح المحلي المشتق).
- عند إعادة تشغيل شاومي: فك الرئيسي يفشل → يفك بطاقة الاسترجاع → `demoteToFallback()` (انتقال هادئ ونهائي) → البيانات كاملة بلا ضياع.
- صيغة التشفير: `mahfazati.enc.v1:<iv-hex>:<mac-hex>:<cipher-hex>` — AES-256-CTR + HMAC-SHA256 (encrypt-then-MAC، كل التمثيلات hex).
- `purgeAll` يمسح كل شيء: الرئيسي + الإنقاذ + بطاقة الاسترجاع + النسخ الداخلية + لقطة الأمان + العلامة + البذرة.
- **ممنوع** إعادة إدخال بديل نص صريح عند فشل التشفير (أُزيل عمداً — Fail-Closed).

**مفاتيح AsyncStorage (لا تنسَ):** `mahfazati.db.v1` · `mahfazati.db.recovery.v1` · `mahfazati.db.backups.v1` · `mahfazati.db.pre-restore.v1` · `mahfazati.db.rescue.v1` · `mahfazati.crypt.mode.v1` · `mahfazati.crypt.fallback.seed.v1` · مفتاح SecureStore: `mahfazati.db.key.v1`

## 4. إعدادات الأمان (Android)

- **`android:allowBackup="false"`** — لا نسخ سحابي ولا adb backup (بيانات مالية).
- **`FLAG_SECURE`** في `MainActivity.onCreate` — منع لقطات الشاشة وصور التطبيقات الأخيرة (تم تعطيله مؤقتاً مرة للتصوير وأعيد تفعيله — **لا تحذفه أبداً**).
- **الصلاحيات النهائية:** INTERNET + VIBRATE + البصمة فقط. صلاحيات التخزين القادمة من expo-file-system محجوبة بـ `tools:node="remove"` في `AndroidManifest.xml` الرئيسي — لا تُزل هذه الحجبات.
- `SYSTEM_ALERT_WINDOW` و`usesCleartextTraffic` موجودتان فقط في manifests نسخة debug — عادي.
- التحقق العميق من الاستيراد: `storage.ts` يفحص كل حقل في كل كيان (سقف 10^15، حدود نصوص وأعداد) ويُسقِط غير الصالح.
- `npm audit`: كل الثغرات في أدوات البناء (metro/expo-cli) — لا تصل للـ APK. لا تُحدّث المكتبات دون داعٍ (استقرار التوافق).

## 5. مسار التوقيع (لا يُرفع أبداً — مستثنى في .gitignore)

```
signing/
├── mahfazati.keystore    # PKCS12 · RSA 2048 · SHA384withRSA · صالح حتى 2054 · Alias: mahfazati
└── keystore.properties   # storeFile/storePassword/keyAlias/keyPassword
```
- `android/app/build.gradle` يقرأ `../signing/keystore.properties` تلقائياً.
- 🔴 **مقدّس:** لا يُعدَّل ولا يُحذف ولا يُرفع. فقدانه = فقدان تحديثات Play إلى الأبد.
- `.gitignore` يمنع: `signing/`, `*.keystore`, `*.jks`, `keystore.properties`, `local.properties`, `.env*`, `*.apk`, `build/`, `.cxx/`, `*.log` — لا تخففها.

## 6. أوامر البناء الدقيقة

```bash
# نسخة APK مصغّرة (arm64-v8a + armeabi-v7a — مضبوطة في android/gradle.properties)
cd /d/mz/android && ./gradlew assembleRelease
# الناتج: android/app/build/outputs/apk/release/app-release.apk  (~42MB)

# نسخة Google Play (AAB)
cd /d/mz/android && ./gradlew bundleRelease
# الناتج: android/app/build/outputs/bundle/release/app-release.aab
```

- إصدار جديد: ارفع `versionCode` +1 وحدّث `versionName` في **build.gradle** و`app.json` معاً.
- مجلد بناء CMake staging خارجي: `D:/a` (مضبوط في build.gradle لتجنب حد 260 حرفاً) — يمكن مسحه بين البناءات بأمان.
- بيئة ويندوز: `JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8"` قبل gradlew.
- تثبيت سريع للتجربة: `adb install -r <apk>` — على شاومي سيفعّل وضع `fallback` تلقائياً بلا تدخل.

## 7. الاختبار الآلي

- مهارة محفوظة عالمياً: `C:\Users\qusay\.agents\skills\maestro-quick-test\SKILL.md`
- Flow: `D:/mz/maestro/flow.yaml` — نقاط نسبية (point) + تحقق إنجليزي/رقمي فقط (مشكلة ترميز CP1252 مع العربية).
- قبل التشغيل: `adb shell am force-stop com.mahfazati.app` — الـ flow يستخدم `launchApp` + شرط `notVisible` لاجتياز الترحيب.

## 8. ⭐ أفكار التحديثات المستقبلية المقترحة

| الأولوية | الفكرة | ملاحظات تنفيذ |
|---|---|---|
| 🔥 عالية | **تصدير تقارير PDF** | expo-print (HTML→PDF) — طباعة جدول التقارير الشهري؛ بلا مكتبات native جديدة |
| 🔥 عالية | **تنبيهات دورية للديون** | expo-notifications (local only) — جدولة تذكير بتاريخ الاستحقاق؛ offline كلياً |
| 🟡 متوسطة | **ويدجت الشاشة الرئيسية** | WidgetKit غير مجزٍ على أندرويد — الأنسب: react-native-android-widget أو الترحيل لـ KMP لاحقاً؛ ابدأ بويدجت رصيد واحد للتحديث |
| 🟡 متوسطة | **دعم Google Play (AAB)** | `bundleRelease` جاهز + نصوص المتجر وسياسة الخصوصية وData safety محضّرة في مهام سابقة؛ الحساب الشخصي الجديد يحتاج 12 مختبراً × 14 يوماً |
| 🟡 متوسطة | **قفل PIN احتياطي** | LockGate حالياً بصمة/وجه + device fallback؛ أضف PIN مخزن مشفراً كخيار ثانٍ |
| 🟢 منخفضة | **تصدير النسخة بكلمة مرور** | تشفير ملف التصدير AES بمفتاح مشتق من كلمة مرور (PBKDF2 موجود جاهز في crypt.ts) |
| 🟢 منخفضة | **تكرار تلقائي للأسعار بالخلفية** | expo-background-task + fetch أسعار يومياً |
| 🟢 منخفضة | **iOS** | معظم الكود جاهز؛ راجع secure-store keychainAccessible وأعد بناء الشاشة |

## 9. ما لا يجوز مساؤه في التنظيف

`signing/` · `src/` · `docs/` · `node_modules/` · `android/app/src/` · `assets/` · `maestro/` — كل الباقي قابل لإعادة البناء.

## 10. حالة الإغلاق النهائية (2026-11-18)

- ✅ كود مرفوع على GitHub: `4ab6008` (main) — بلا أي أسرار
- ✅ APK محمي نهائي في `D:/deepai code projects/mobile app/Mahfazati-2.0.0.apk` و`D:/mz/Mahfazati-2.0.0.apk`
- ✅ مهارات عامة محفوظة: `android-mobile-build` · `maestro-quick-test` · `mobile-app-security` · `qa-checklist`
- ⚠️ APK لم يُرفع بعد في Releases على GitHub — خطوة متبقية يدوية من المتصفح
