import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { AllergyRecord, Profile, RecordKind } from "./allergy-store";

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const labelFor = (kind: RecordKind) => {
  switch (kind) {
    case "medicine-allergy":
      return "حساسية دوائية";
    case "food-allergy":
      return "حساسية غذائية";
    case "other-allergy":
      return "حساسية أخرى";
    case "medicine":
      return "دواء / علاج";
    case "medicine-tolerated":
      return "دواء متحمّل";
    case "chronic-condition":
      return "مرض مزمن";
    case "surgery":
      return "عملية سابقة";
    case "medical-note":
      return "ملاحظة طبية";
  }
};

function recordRow(record: AllergyRecord) {
  const date = new Date(record.date);
  const displayDate = Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("ar");

  return `
    <tr>
      <td>${escapeHtml(labelFor(record.kind))}</td>
      <td><strong>${escapeHtml(record.name)}</strong></td>
      <td>${escapeHtml(record.activeIngredient || "—")}</td>
      <td>${escapeHtml(record.purpose || "—")}</td>
      <td>${escapeHtml(record.dosage || "—")}</td>
      <td>${escapeHtml(record.frequency || "—")}</td>
      <td>${escapeHtml(record.symptoms || "—")}</td>
      <td>${escapeHtml(record.severity || "—")}</td>
      <td>${escapeHtml(record.notes || "—")}</td>
      <td>${escapeHtml(record.eventDate || displayDate)}</td>
    </tr>`;
}

export function buildRecordsPdfHtml(profile: Profile, records: AllergyRecord[]) {
  const generatedAt = new Date().toLocaleString("ar");
  const rows = records.length
    ? records.map(recordRow).join("")
    : '<tr><td colspan="10" class="empty">لا توجد سجلات محفوظة.</td></tr>';

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { margin: 28px; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Tahoma, sans-serif; color: #17324D; direction: rtl; }
    h1 { margin: 0 0 4px; font-size: 26px; }
    .subtitle { color: #087E8B; font-size: 13px; margin-bottom: 18px; }
    .profile { border: 1px solid #D7E5E8; border-radius: 10px; padding: 12px; margin-bottom: 16px; }
    .profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; }
    .label { color: #637787; font-size: 11px; }
    .value { font-weight: bold; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #EAF6F7; color: #087E8B; padding: 8px 5px; border: 1px solid #D7E5E8; }
    td { padding: 8px 5px; border: 1px solid #D7E5E8; vertical-align: top; }
    .empty { text-align: center; color: #637787; padding: 20px; }
    .footer { margin-top: 16px; color: #637787; font-size: 9px; line-height: 1.6; }
  </style>
</head>
<body>
  <h1>حارس الحساسية — السجل الصحي</h1>
  <div class="subtitle">نسخة PDF من السجلات المحفوظة على الجهاز</div>

  <div class="profile">
    <div class="profile-grid">
      <div><div class="label">الاسم</div><div class="value">${escapeHtml(profile.fullName || "غير مسجل")}</div></div>
      <div><div class="label">الهاتف</div><div class="value">${escapeHtml(profile.phone || "غير مسجل")}</div></div>
      <div><div class="label">فصيلة الدم</div><div class="value">${escapeHtml(profile.bloodType || "غير مسجلة")}</div></div>
      <div><div class="label">جهة اتصال الطوارئ</div><div class="value">${escapeHtml(profile.emergencyContact || "غير مسجلة")}</div></div>
      <div><div class="label">الطبيب / المنشأة</div><div class="value">${escapeHtml(profile.doctor || "غير مسجل")}</div></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>النوع</th>
        <th>الاسم</th>
        <th>المادة الفعالة</th>
        <th>الاستخدام / الوصف</th>
        <th>الجرعة</th>
        <th>التكرار</th>
        <th>الأعراض</th>
        <th>الشدة</th>
        <th>ملاحظات</th>
        <th>التاريخ</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    تم إنشاء الملف: ${escapeHtml(generatedAt)}<br />
    هذا السجل لتنظيم المعلومات الشخصية ولا يُعد تشخيصًا أو وصفة طبية.
  </div>
</body>
</html>`;
}

export async function exportRecordsPdf(profile: Profile, records: AllergyRecord[]) {
  if (Platform.OS === "web") {
    await Print.printAsync({ html: buildRecordsPdfHtml(profile, records) });
    return;
  }

  const result = await Print.printToFileAsync({
    html: buildRecordsPdfHtml(profile, records),
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("المشاركة غير متاحة على هذا الجهاز.");
  }

  await Sharing.shareAsync(result.uri, {
    mimeType: "application/pdf",
    dialogTitle: "مشاركة سجل حارس الحساسية PDF",
    UTI: "com.adobe.pdf",
  });
}
