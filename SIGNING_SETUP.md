# إعداد توقيع Android للتحديثات المستقرة

لكي يتم تثبيت الإصدار الجديد فوق الإصدار القديم بدون حذف التطبيق أو فقدان البيانات، يجب أن تبقى هذه الأمور ثابتة:

1. `android.package` يبقى `com.mkassis37.allergyguard`.
2. كل إصدار جديد يملك `versionCode` أعلى.
3. جميع إصدارات الإنتاج تستخدم **نفس مفتاح التوقيع**.

## GitHub Actions Secrets المطلوبة

أضف في GitHub: Settings → Secrets and variables → Actions:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

`ANDROID_KEYSTORE_BASE64` هو ملف keystore محول إلى Base64. لا ترفع ملف keystore نفسه إلى مستودع عام ولا تحفظ كلمات المرور داخل الكود.

## Play Store

ارفع ملف `allergy-guard-play-store.aab` إلى Google Play واستخدم Play App Signing. بعد أول إصدار منشور، حافظ على نفس إعدادات التوقيع ولا تغير package name.

## ملاحظة مهمة عن النسخ القديمة

إذا كانت النسخة المثبتة حاليًا موقعة بمفتاح مختلف عن مفتاح الإنتاج الجديد، أندرويد لن يسمح بالتحديث فوقها. هذه حالة انتقالية لمرة واحدة فقط. بعد تثبيت أول نسخة موقعة بالمفتاح الدائم، كل الإصدارات اللاحقة ستتحدث فوقها وتحافظ على البيانات طالما استُخدم نفس المفتاح.
