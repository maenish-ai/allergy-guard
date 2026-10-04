import { useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

// Saturday-first, matching the reference calendar layout.
const WEEKDAYS_AR = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];

const COLORS = {
  navy: "#173F6A",
  teal: "#18A395",
  tealSoft: "#E9F7F5",
  line: "#DDE4E8",
  muted: "#8E99A3",
  text: "#1F2933",
  surface: "#FFFFFF",
  soft: "#F3F6F8",
  danger: "#B64A57",
};

function atNoon(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
    0,
  );
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
  const insets = useSafeAreaInsets();
  const systemBottomClearance = Platform.OS === "android" ? Math.max(insets.bottom, 48) : Math.max(insets.bottom, 12);
  const [visible, setVisible] = useState(false);
  const [yearToolsVisible, setYearToolsVisible] = useState(false);

  const max = maximumDate ? atNoon(maximumDate) : null;
  const min = minimumDate ? atNoon(minimumDate) : null;

  const clampDate = (date: Date) => {
    let target = atNoon(date);
    if (max && target > max) target = max;
    if (min && target < min) target = min;
    return target;
  };

  const selectedDate = parseIsoDate(value);
  const defaultDate = clampDate(selectedDate ?? new Date());
  const [pendingDate, setPendingDate] = useState<Date>(defaultDate);
  const [cursor, setCursor] = useState(
    new Date(defaultDate.getFullYear(), defaultDate.getMonth(), 1, 12),
  );

  useEffect(() => {
    if (!visible) return;
    const next = clampDate(parseIsoDate(value) ?? new Date());
    setPendingDate(next);
    setCursor(new Date(next.getFullYear(), next.getMonth(), 1, 12));
    setYearToolsVisible(false);
  }, [visible, value, max?.getTime(), min?.getTime()]);

  const clampMonth = (date: Date) => {
    let target = new Date(date.getFullYear(), date.getMonth(), 1, 12);
    if (max) {
      const maxMonth = new Date(max.getFullYear(), max.getMonth(), 1, 12);
      if (target > maxMonth) target = maxMonth;
    }
    if (min) {
      const minMonth = new Date(min.getFullYear(), min.getMonth(), 1, 12);
      if (target < minMonth) target = minMonth;
    }
    return target;
  };

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    // JS: Sun=0 ... Sat=6. Convert to Saturday-first index.
    const firstWeekday = (new Date(year, month, 1, 12).getDay() + 1) % 7;
    const count = new Date(year, month + 1, 0, 12).getDate();

    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstWeekday + 1;
      if (day < 1 || day > count) {
        return { key: `blank-${index}`, date: null as Date | null, disabled: true, selected: false, today: false };
      }

      const date = atNoon(new Date(year, month, day, 12));
      const disabled = Boolean((max && date > max) || (min && date < min));
      const selected = toIsoDate(date) === toIsoDate(pendingDate);
      const today = toIsoDate(date) === toIsoDate(atNoon(new Date()));
      return { key: toIsoDate(date), date, disabled, selected, today };
    });
  }, [cursor, pendingDate, max?.getTime(), min?.getTime()]);

  const canGoPrevious = useMemo(() => {
    if (!min) return true;
    const previousMonth = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1, 12);
    const minMonth = new Date(min.getFullYear(), min.getMonth(), 1, 12);
    return previousMonth >= minMonth;
  }, [cursor, min?.getTime()]);

  const canGoNext = useMemo(() => {
    if (!max) return true;
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12);
    const maxMonth = new Date(max.getFullYear(), max.getMonth(), 1, 12);
    return nextMonth <= maxMonth;
  }, [cursor, max?.getTime()]);

  const chooseDay = (date: Date) => {
    if ((max && date > max) || (min && date < min)) return;
    const normalized = atNoon(date);
    setPendingDate(normalized);
    onChange(toIsoDate(normalized));
  };

  const chooseToday = () => {
    const today = clampDate(new Date());
    setPendingDate(today);
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1, 12));
    onChange(toIsoDate(today));
  };

  const shiftYear = (amount: number) => {
    const next = clampMonth(
      new Date(cursor.getFullYear() + amount, cursor.getMonth(), 1, 12),
    );
    setCursor(next);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}، ${value || "لم يتم اختيار تاريخ"}`}
        onPress={() => setVisible(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Text style={styles.triggerHint}>اختيار من التقويم</Text>
        <View style={styles.dateValueWrap}>
          <Text style={[styles.dateValue, !value && styles.placeholder]}>
            {value || placeholder}
          </Text>
          <View style={styles.miniCalendarIcon}>
            <View style={styles.miniCalendarInner} />
          </View>
        </View>
      </Pressable>

      <View style={styles.helperRow}>
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="مسح التاريخ"
            onPress={() => onChange("")}
            hitSlop={8}
          >
            <Text style={styles.clearText}>مسح التاريخ</Text>
          </Pressable>
        ) : (
          <View />
        )}
        {helperText ? <Text style={styles.helper}>{helperText}</Text> : <View />}
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={[styles.backdrop, { paddingBottom: systemBottomClearance, paddingTop: 12 }]}>
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => setVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="إغلاق التقويم"
                hitSlop={10}
              >
                <Text style={styles.closeText}>إغلاق</Text>
              </Pressable>
              <Text style={styles.modalTitle}>اختيار التاريخ</Text>
              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.content}>
              <View style={styles.monthNav}>
                <Pressable
                  disabled={!canGoPrevious}
                  onPress={() =>
                    setCursor(
                      clampMonth(
                        new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1, 12),
                      ),
                    )
                  }
                  style={[styles.navButton, !canGoPrevious && styles.disabled]}
                  accessibilityLabel="الشهر السابق"
                >
                  <Text style={styles.navText}>›</Text>
                </Pressable>

                <Pressable
                  onPress={() => setYearToolsVisible((current) => !current)}
                  style={styles.monthTitleButton}
                  accessibilityRole="button"
                  accessibilityLabel="تغيير السنة"
                >
                  <Text style={styles.monthTitle}>
                    {MONTHS_AR[cursor.getMonth()]} <Text style={styles.monthYear}>{cursor.getFullYear()}</Text>
                  </Text>
                </Pressable>

                <Pressable
                  disabled={!canGoNext}
                  onPress={() =>
                    setCursor(
                      clampMonth(
                        new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12),
                      ),
                    )
                  }
                  style={[styles.navButton, !canGoNext && styles.disabled]}
                  accessibilityLabel="الشهر التالي"
                >
                  <Text style={styles.navText}>‹</Text>
                </Pressable>
              </View>

              {yearToolsVisible ? (
                <View style={styles.yearTools}>
                  <Pressable onPress={() => shiftYear(-10)} style={styles.yearToolButton}>
                    <Text style={styles.yearToolText}>−10</Text>
                  </Pressable>
                  <Pressable onPress={() => shiftYear(-1)} style={styles.yearToolButton}>
                    <Text style={styles.yearToolText}>−1</Text>
                  </Pressable>
                  <View style={styles.yearPill}>
                    <Text style={styles.yearPillText}>{cursor.getFullYear()}</Text>
                  </View>
                  <Pressable onPress={() => shiftYear(1)} style={styles.yearToolButton}>
                    <Text style={styles.yearToolText}>+1</Text>
                  </Pressable>
                  <Pressable onPress={() => shiftYear(10)} style={styles.yearToolButton}>
                    <Text style={styles.yearToolText}>+10</Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.weekRow}>
                {WEEKDAYS_AR.map((day) => (
                  <View key={day} style={styles.weekCell}>
                    <Text style={styles.weekText}>{day}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {days.map((item) => (
                  <View key={item.key} style={styles.daySlot}>
                    {item.date ? (
                      <Pressable
                        disabled={item.disabled}
                        onPress={() => chooseDay(item.date as Date)}
                        accessibilityRole="button"
                        accessibilityLabel={`اختيار ${toIsoDate(item.date)}`}
                        style={({ pressed }) => [
                          styles.dayButton,
                          item.selected && styles.daySelected,
                          item.today && !item.selected && styles.dayToday,
                          item.disabled && styles.dayDisabled,
                          pressed && !item.disabled && styles.dayPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            item.selected && styles.daySelectedText,
                            item.disabled && styles.dayDisabledText,
                          ]}
                        >
                          {item.date.getDate()}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>

              <Pressable
                onPress={chooseToday}
                style={({ pressed }) => [styles.todayButton, pressed && styles.todayPressed]}
                accessibilityRole="button"
                accessibilityLabel="اختيار تاريخ اليوم"
              >
                <Text style={styles.todayButtonText}>اليوم</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 12 },
  label: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right",
    marginBottom: 8,
  },
  trigger: {
    minHeight: 76,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  pressed: { opacity: 0.82 },
  triggerHint: {
    color: "#9AA4AD",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "left",
  },
  dateValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    flexShrink: 1,
  },
  dateValue: {
    color: "#111820",
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  placeholder: {
    color: COLORS.muted,
    fontSize: 17,
    fontWeight: "700",
  },
  miniCalendarIcon: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  miniCalendarInner: {
    width: 8,
    height: 8,
    backgroundColor: COLORS.teal,
  },
  helperRow: {
    minHeight: 22,
    marginTop: 5,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  helper: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "right",
    flex: 1,
  },
  clearText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: "800",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20, 35, 52, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 34,
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderRadius: 32,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  modalHeader: {
    minHeight: 88,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeText: {
    color: COLORS.teal,
    fontSize: 16,
    fontWeight: "900",
  },
  modalTitle: {
    color: "#141A20",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  headerSpacer: { width: 44 },
  content: {
    paddingHorizontal: 28,
    paddingBottom: 28,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 26,
  },
  navButton: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: COLORS.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  navText: {
    color: COLORS.navy,
    fontSize: 31,
    fontWeight: "500",
    lineHeight: 34,
  },
  disabled: { opacity: 0.3 },
  monthTitleButton: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    color: "#1E2935",
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  monthYear: {
    color: COLORS.navy,
    fontWeight: "900",
  },
  yearTools: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: -12,
    marginBottom: 18,
  },
  yearToolButton: {
    minWidth: 44,
    minHeight: 38,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: COLORS.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  yearToolText: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: "900",
  },
  yearPill: {
    minWidth: 72,
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  yearPillText: {
    color: COLORS.surface,
    fontSize: 13,
    fontWeight: "900",
  },
  weekRow: {
    flexDirection: "row-reverse",
    marginBottom: 8,
  },
  weekCell: {
    width: "14.2857%",
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  weekText: {
    color: "#64717C",
    fontSize: 13,
    fontWeight: "700",
  },
  daysGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
  },
  daySlot: {
    width: "14.2857%",
    height: 47,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  dayButton: {
    width: "100%",
    height: 42,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    color: "#27313A",
    fontSize: 16,
    fontWeight: "500",
  },
  daySelected: {
    backgroundColor: COLORS.teal,
  },
  daySelectedText: {
    color: COLORS.surface,
    fontWeight: "900",
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: COLORS.teal,
  },
  dayDisabled: { opacity: 0.25 },
  dayDisabledText: { color: "#9DA8B0" },
  dayPressed: { backgroundColor: COLORS.tealSoft },
  todayButton: {
    minHeight: 68,
    borderRadius: 20,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 34,
  },
  todayPressed: { opacity: 0.88 },
  todayButtonText: {
    color: COLORS.surface,
    fontSize: 19,
    fontWeight: "900",
  },
});
