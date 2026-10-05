# Allergy Guard v0.7.7

- إصلاح خطأ `no PRNG` عند تجهيز النسخة الاحتياطية على Android.
- استخدام `expo-crypto` ومولّد الأرقام العشوائية الأصلي للنظام بدل `tweetnacl.randomBytes`.
- تطبيق الإصلاح على مساري التشفير في `email-backup.ts` و`backup-crypto.ts`.
- الإبقاء على زر الإرسال الأزرق ومسار MailComposer مع Share Sheet fallback.
- إضافة فحص CI يمنع رجوع استخدام TweetNaCl PRNG مستقبلًا.
