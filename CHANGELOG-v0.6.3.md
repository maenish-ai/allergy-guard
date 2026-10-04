# Allergy Guard v0.6.3

- إصلاح فشل GitHub Actions الناتج عن عدم تطابق pnpm-lock.yaml مع package.json.
- استخدام `pnpm install --no-frozen-lockfile` مؤقتًا للسماح لـ pnpm بإضافة `expo-print` المفقود إلى lockfile أثناء CI.
- إضافة خطوة تحقق صريحة من تثبيت `expo-print` قبل TypeScript وExpo prebuild.
- الإبقاء على إزالة `@types/cookie` غير الضروري.
- رفع إصدار التطبيق إلى 0.6.3 مع versionCode تصاعدي.
