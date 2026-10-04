import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const MONTHS_AR = [
  "كانون الثاني",
  "شباط",
  "آذار",
  "نيسان",
  "أيار",
  "حزيران",
  "تموز",
  "آب",
  "أيلول",
  "تشرين الأول",
  "تشرين الثاني",
  "كانون الأول",
];

const WEEKDAYS_AR = ["أحد", "اثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];

function atNoon(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function parseIsoDate(value?: string) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day, 12, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatArabicDate(value?: string) {
  const date = parseIsoDate(value);
  if (!date) return value?.trim() || "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
  helperText?: string;
};

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "اختر التاريخ",
  maximumDate,
  minimumDate,
  helperText,
}: DatePickerFieldProps) {
  const [visible, setVisible] = useState(false);
  const initialDate = parseIsoDate(value) ?? atNoon(new Date());
  const [cursor, setCursor] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1, 12),
  );

  useEffect(() => {
    if (!visible) return;
    const selected = parseIsoDate(value) ?? atNoon(new Date());
    setCursor(new Date(selected.getFullYear(), selected.getMonth(), 1, 12));
  }, [visible, value]);

  const selectedDate = parseIsoDate(value);
  const max = maximumDate ? atNoon(maximumDate) : null;
  const min = minimumDate ? atNoon(minimumDate) : null;

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstWeekday = new Date(year, month, 1, 12).getDay();
    const count = new Date(year, month + 1, 0, 12).getDate();
    const previousCount = new Date(year, month, 0, 12).getDate();

    return Array.from({ length: 42 }, (_, index) => {
      const dayOffset = index - firstWeekday + 1;
      let date: Date;
      let outside = false;
      if (dayOffset <= 0) {
        date = new Date(year, month - 1, previousCount + dayOffset, 12);
        outside = true;
      } else if (dayOffset > count) {
        date = new Date(year, month + 1, dayOffset - count, 12);
        outside = true;
      } else {
        date = new Date(year, month, dayOffset, 12);
      }
      const normalized = atNoon(date);
      const disabled = Boolean((max && normalized > max) || (min && normalized < min));
      const selected = selectedDate
        ? toIsoDate(normalized) === toIsoDate(selectedDate)
        : false;
      const today = toIsoDate(normalized) === toIsoDate(atNoon(new Date()));
      return { date: normalized, outside, disabled, selected, today };
    });
  }, [cursor, max?.getTime(), min?.getTime(), selectedDate?.getTime()]);

  const canGoNext = useMemo(() => {
    if (!max) return true;
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12);
    const maxMonth = new Date(max.getFullYear(), max.getMonth(), 1, 12);
    return nextMonth <= maxMonth;
  }, [cursor, max?.getTime()]);

  const canGoPrevious = useMemo(() => {
    if (!min) return true;
    const previousMonth = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1, 12);
    const minMonth = new Date(min.getFullYear(), min.getMonth(), 1, 12);
    return previousMonth >= minMonth;
  }, [cursor, min?.getTime()]);

  const shiftYear = (amount: number) => {
    let target = new Date(
      cursor.getFullYear() + amount,
      cursor.getMonth(),
      1,
      12,
    );
    if (max) {
      const maxMonth = new Date(max.getFullYear(), max.getMonth(), 1, 12);
      if (target > maxMonth) target = maxMonth;
    }
    if (min) {
      const minMonth = new Date(min.getFullYear(), min.getMonth(), 1, 12);
      if (target < minMonth) target = minMonth;
    }
    setCursor(target);
  };

  const selectDate = (date: Date) => {
    onChange(toIsoDate(date));
    setVisible(false);
  };

  const jumpToToday = () => {
    const today = atNoon(new Date());
    if ((max && today > max) || (min && today < min)) return;
    selectDate(today);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}، ${value ? formatArabicDate(value) : "لم يتم اختيار تاريخ"}`}
        onPress={() => setVisible(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Text style={styles.calendarIcon}>📅</Text>
        <View style={styles.triggerTextWrap}>
          <Text style={[styles.value, !value && styles.placeholder]}>
            {value ? formatArabicDate(value) : placeholder}
          </Text>
          <Text style={styles.tapHint}>اضغط لاختيار التاريخ من التقويم</Text>
        </View>
      </Pressable>
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => setVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="إغلاق التقويم"
                hitSlop={10}
              >
                <Text style={styles.close}>×</Text>
              </Pressable>
              <View style={styles.headerTextWrap}>
                <Text style={styles.modalTitle}>{label}</Text>
                <Text style={styles.selectedText}>
                  {value ? `المحدد: ${formatArabicDate(value)}` : "اختر يومًا من التقويم"}
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <View style={styles.yearNav}>
                <Pressable onPress={() => shiftYear(-10)} style={styles.yearButton}>
                  <Text style={styles.yearButtonText}>−10 سنوات</Text>
                </Pressable>
                <Pressable onPress={() => shiftYear(-1)} style={styles.yearButton}>
                  <Text style={styles.yearButtonText}>− سنة</Text>
                </Pressable>
                <View style={styles.currentYearPill}>
                  <Text style={styles.currentYearText}>{cursor.getFullYear()}</Text>
                </View>
                <Pressable onPress={() => shiftYear(1)} style={styles.yearButton}>
                  <Text style={styles.yearButtonText}>+ سنة</Text>
                </Pressable>
                <Pressable onPress={() => shiftYear(10)} style={styles.yearButton}>
                  <Text style={styles.yearButtonText}>+10 سنوات</Text>
                </Pressable>
              </View>

              <View style={styles.monthNav}>
                <Pressable
                  disabled={!canGoPrevious}
                  onPress={() =>
                    setCursor(
                      new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1, 12),
                    )
                  }
                  style={[styles.navButton, !canGoPrevious && styles.disabled]}
                >
                  <Text style={styles.navButtonText}>الشهر السابق</Text>
                </Pressable>
                <View style={styles.monthTitleWrap}>
                  <Text style={styles.monthTitle}>{MONTHS_AR[cursor.getMonth()]}</Text>
                  <Text style={styles.yearTitle}>{cursor.getFullYear()}</Text>
                </View>
                <Pressable
                  disabled={!canGoNext}
                  onPress={() =>
                    setCursor(
                      new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12),
                    )
                  }
                  style={[styles.navButton, !canGoNext && styles.disabled]}
                >
                  <Text style={styles.navButtonText}>الشهر التالي</Text>
                </Pressable>
              </View>

              <View style={styles.weekRow}>
                {WEEKDAYS_AR.map((day) => (
                  <View key={day} style={styles.weekCell}>
                    <Text style={styles.weekText}>{day}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {days.map((item, index) => (
                  <Pressable
                    key={`${toIsoDate(item.date)}-${index}`}
                    disabled={item.disabled}
                    onPress={() => selectDate(item.date)}
                    accessibilityRole="button"
                    accessibilityLabel={`اختيار ${formatArabicDate(toIsoDate(item.date))}`}
                    style={({ pressed }) => [
                      styles.dayCell,
                      item.selected && styles.daySelected,
                      item.today && !item.selected && styles.dayToday,
                      item.disabled && styles.dayDisabled,
                      pressed && !item.disabled && styles.dayPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        item.outside && styles.dayOutsideText,
                        item.selected && styles.daySelectedText,
                        item.disabled && styles.dayDisabledText,
                      ]}
                    >
                      {item.date.getDate()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.footerActions}>
                <Pressable onPress={jumpToToday} style={styles.todayButton}>
                  <Text style={styles.todayButtonText}>اليوم</Text>
                </Pressable>
                {value ? (
                  <Pressable
                    onPress={() => {
                      onChange("");
                      setVisible(false);
                    }}
                    style={styles.clearButton}
                  >
                    <Text style={styles.clearButtonText}>مسح التاريخ</Text>
                  </Pressable>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 12 },
  label: {
    color: "#173A57",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 9,
    marginBottom: 7,
  },
  trigger: {
    minHeight: 64,
    borderRadius: 14,
    backgroundColor: "#F8FBFC",
    borderWidth: 1,
    borderColor: "#D8E5EA",
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pressed: { opacity: 0.76 },
  calendarIcon: { fontSize: 26 },
  triggerTextWrap: { flex: 1 },
  value: {
    color: "#173A57",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "right",
  },
  placeholder: { color: "#7D8E99", fontWeight: "700" },
  tapHint: {
    color: "#607484",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
    marginTop: 2,
  },
  helper: {
    color: "#607484",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "right",
    marginTop: 5,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8, 28, 42, 0.58)",
    justifyContent: "center",
    padding: 18,
  },
  sheet: {
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#D8E5EA",
    gap: 12,
  },
  headerTextWrap: { flex: 1 },
  close: { color: "#607484", fontSize: 36, lineHeight: 38 },
  modalTitle: {
    color: "#173A57",
    fontSize: 21,
    fontWeight: "900",
    textAlign: "right",
  },
  selectedText: {
    color: "#607484",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
    marginTop: 2,
  },
  modalContent: { padding: 16, paddingBottom: 20 },
  yearNav: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  yearButton: {
    minHeight: 38,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: "#F1F6F8",
    borderWidth: 1,
    borderColor: "#D8E5EA",
    alignItems: "center",
    justifyContent: "center",
  },
  yearButtonText: { color: "#173A57", fontSize: 11, fontWeight: "900" },
  currentYearPill: {
    minHeight: 38,
    minWidth: 64,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#173A57",
    alignItems: "center",
    justifyContent: "center",
  },
  currentYearText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 14,
  },
  navButton: {
    minHeight: 44,
    minWidth: 88,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#E8F6F7",
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonText: {
    color: "#087E8B",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  disabled: { opacity: 0.35 },
  monthTitleWrap: { alignItems: "center", flex: 1 },
  monthTitle: { color: "#173A57", fontSize: 18, fontWeight: "900" },
  yearTitle: { color: "#607484", fontSize: 15, fontWeight: "800", marginTop: 2 },
  weekRow: { flexDirection: "row-reverse", marginBottom: 6 },
  weekCell: { width: "14.2857%", alignItems: "center" },
  weekText: { color: "#607484", fontSize: 11, fontWeight: "900" },
  daysGrid: { flexDirection: "row-reverse", flexWrap: "wrap" },
  dayCell: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayText: { color: "#173A57", fontSize: 15, fontWeight: "800" },
  dayOutsideText: { color: "#A8B6BF" },
  daySelected: { backgroundColor: "#087E8B" },
  daySelectedText: { color: "#FFFFFF", fontWeight: "900" },
  dayToday: { borderColor: "#087E8B", backgroundColor: "#E8F6F7" },
  dayDisabled: { opacity: 0.25 },
  dayDisabledText: { color: "#A8B6BF" },
  dayPressed: { backgroundColor: "#EDF4FC" },
  footerActions: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#D8E5EA",
  },
  todayButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: "#087E8B",
    alignItems: "center",
    justifyContent: "center",
  },
  todayButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  clearButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: "#FFF0F2",
    alignItems: "center",
    justifyContent: "center",
  },
  clearButtonText: { color: "#B63A49", fontSize: 16, fontWeight: "900" },
});
