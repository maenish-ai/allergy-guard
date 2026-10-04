import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
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
  const [visible, setVisible] = useState(false);
  const initialDate = parseIsoDate(value) ?? atNoon(new Date());
  const [cursor, setCursor] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1, 12),
  );
  const [pendingDate, setPendingDate] = useState<Date | null>(
    parseIsoDate(value),
  );

  const max = maximumDate ? atNoon(maximumDate) : null;
  const min = minimumDate ? atNoon(minimumDate) : null;

  useEffect(() => {
    if (!visible) return;
    const selected = parseIsoDate(value) ?? atNoon(new Date());
    const safeSelected = max && selected > max ? max : min && selected < min ? min : selected;
    setPendingDate(parseIsoDate(value) ?? safeSelected);
    setCursor(
      new Date(safeSelected.getFullYear(), safeSelected.getMonth(), 1, 12),
    );
  }, [visible, value, max?.getTime(), min?.getTime()]);

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
      const disabled = Boolean(
        (max && normalized > max) || (min && normalized < min),
      );
      const selected = pendingDate
        ? toIsoDate(normalized) === toIsoDate(pendingDate)
        : false;
      const today = toIsoDate(normalized) === toIsoDate(atNoon(new Date()));

      return { date: normalized, outside, disabled, selected, today };
    });
  }, [cursor, max?.getTime(), min?.getTime(), pendingDate?.getTime()]);

  const canGoNext = useMemo(() => {
    if (!max) return true;
    const nextMonth = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      1,
      12,
    );
    const maxMonth = new Date(max.getFullYear(), max.getMonth(), 1, 12);
    return nextMonth <= maxMonth;
  }, [cursor, max?.getTime()]);

  const canGoPrevious = useMemo(() => {
    if (!min) return true;
    const previousMonth = new Date(
      cursor.getFullYear(),
      cursor.getMonth() - 1,
      1,
      12,
    );
    const minMonth = new Date(min.getFullYear(), min.getMonth(), 1, 12);
    return previousMonth >= minMonth;
  }, [cursor, min?.getTime()]);

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

  const shiftYear = (amount: number) => {
    setCursor(
      clampMonth(
        new Date(cursor.getFullYear() + amount, cursor.getMonth(), 1, 12),
      ),
    );
  };

  const chooseDay = (date: Date) => {
    if ((max && date > max) || (min && date < min)) return;
    setPendingDate(date);
    if (
      date.getMonth() !== cursor.getMonth() ||
      date.getFullYear() !== cursor.getFullYear()
    ) {
      setCursor(new Date(date.getFullYear(), date.getMonth(), 1, 12));
    }
  };

  const jumpToToday = () => {
    const today = atNoon(new Date());
    if ((max && today > max) || (min && today < min)) return;
    setPendingDate(today);
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1, 12));
  };

  const confirm = () => {
    if (!pendingDate) return;
    onChange(toIsoDate(pendingDate));
    setVisible(false);
  };

  const cancel = () => {
    setPendingDate(parseIsoDate(value));
    setVisible(false);
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
        <View style={styles.triggerTextWrap}>
          <Text style={[styles.value, !value && styles.placeholder]}>
            {value ? formatArabicDate(value) : placeholder}
          </Text>
          <Text style={styles.tapHint}>
            {value
              ? "اضغط لتغيير التاريخ"
              : "اضغط لفتح التقويم واختيار التاريخ"}
          </Text>
        </View>
        <View style={styles.calendarBadge}>
          <Text style={styles.calendarIcon}>📅</Text>
        </View>
      </Pressable>
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={cancel}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={cancel}
                accessibilityRole="button"
                accessibilityLabel="إغلاق التقويم"
                hitSlop={10}
                style={styles.closeButton}
              >
                <Text style={styles.close}>×</Text>
              </Pressable>
              <View style={styles.headerTextWrap}>
                <Text style={styles.modalTitle}>{label}</Text>
                <Text style={styles.selectedText}>
                  {pendingDate
                    ? `التاريخ المختار: ${formatArabicDate(toIsoDate(pendingDate))}`
                    : "اختر يومًا من التقويم"}
                </Text>
              </View>
            </View>

            <View style={styles.content}>
              <View style={styles.monthNav}>
                <Pressable
                  disabled={!canGoPrevious}
                  onPress={() =>
                    setCursor(
                      clampMonth(
                        new Date(
                          cursor.getFullYear(),
                          cursor.getMonth() - 1,
                          1,
                          12,
                        ),
                      ),
                    )
                  }
                  style={[styles.navArrow, !canGoPrevious && styles.disabled]}
                  accessibilityLabel="الشهر السابق"
                >
                  <Text style={styles.navArrowText}>‹</Text>
                </Pressable>

                <View style={styles.monthTitleWrap}>
                  <Text style={styles.monthTitle}>
                    {MONTHS_AR[cursor.getMonth()]}
                  </Text>
                  <Text style={styles.yearTitle}>{cursor.getFullYear()}</Text>
                </View>

                <Pressable
                  disabled={!canGoNext}
                  onPress={() =>
                    setCursor(
                      clampMonth(
                        new Date(
                          cursor.getFullYear(),
                          cursor.getMonth() + 1,
                          1,
                          12,
                        ),
                      ),
                    )
                  }
                  style={[styles.navArrow, !canGoNext && styles.disabled]}
                  accessibilityLabel="الشهر التالي"
                >
                  <Text style={styles.navArrowText}>›</Text>
                </Pressable>
              </View>

              <View style={styles.yearTools}>
                <Pressable onPress={() => shiftYear(-10)} style={styles.yearTool}>
                  <Text style={styles.yearToolText}>−10</Text>
                </Pressable>
                <Pressable onPress={() => shiftYear(-1)} style={styles.yearTool}>
                  <Text style={styles.yearToolText}>−1</Text>
                </Pressable>
                <Pressable onPress={jumpToToday} style={styles.todayChip}>
                  <Text style={styles.todayChipText}>اليوم</Text>
                </Pressable>
                <Pressable onPress={() => shiftYear(1)} style={styles.yearTool}>
                  <Text style={styles.yearToolText}>+1</Text>
                </Pressable>
                <Pressable onPress={() => shiftYear(10)} style={styles.yearTool}>
                  <Text style={styles.yearToolText}>+10</Text>
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
                    onPress={() => chooseDay(item.date)}
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
                <Pressable onPress={cancel} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>إلغاء</Text>
                </Pressable>

                {value ? (
                  <Pressable
                    onPress={() => {
                      onChange("");
                      setPendingDate(null);
                      setVisible(false);
                    }}
                    style={styles.clearButton}
                  >
                    <Text style={styles.clearButtonText}>مسح</Text>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={confirm}
                  disabled={!pendingDate}
                  style={[
                    styles.confirmButton,
                    !pendingDate && styles.disabled,
                  ]}
                >
                  <Text style={styles.confirmButtonText}>اختيار التاريخ</Text>
                </Pressable>
              </View>
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
    color: "#173A57",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 9,
    marginBottom: 7,
  },
  trigger: {
    minHeight: 74,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8E5EA",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    shadowColor: "#173A57",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  pressed: { opacity: 0.8 },
  calendarBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#E8F6F7",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarIcon: { fontSize: 24 },
  triggerTextWrap: { flex: 1, alignItems: "flex-end" },
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
    fontWeight: "700",
    textAlign: "right",
    marginTop: 4,
  },
  helper: {
    color: "#607484",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "right",
    marginTop: 6,
    marginHorizontal: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8, 28, 42, 0.62)",
    justifyContent: "center",
    padding: 16,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#173A57",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EDF1",
    gap: 12,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F1F6F8",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: { flex: 1, alignItems: "flex-end" },
  close: { color: "#607484", fontSize: 30, lineHeight: 32 },
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
    marginTop: 3,
  },
  content: { padding: 16, paddingBottom: 18 },
  monthNav: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  navArrow: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F1F6F8",
    borderWidth: 1,
    borderColor: "#D8E5EA",
    alignItems: "center",
    justifyContent: "center",
  },
  navArrowText: {
    color: "#173A57",
    fontSize: 27,
    fontWeight: "900",
    lineHeight: 30,
  },
  monthTitleWrap: { alignItems: "center", flex: 1 },
  monthTitle: { color: "#173A57", fontSize: 20, fontWeight: "900" },
  yearTitle: {
    color: "#607484",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  yearTools: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 14,
  },
  yearTool: {
    minWidth: 44,
    minHeight: 36,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: "#F6F9FA",
    borderWidth: 1,
    borderColor: "#D8E5EA",
    alignItems: "center",
    justifyContent: "center",
  },
  yearToolText: { color: "#173A57", fontSize: 12, fontWeight: "900" },
  todayChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#E8F6F7",
    alignItems: "center",
    justifyContent: "center",
  },
  todayChipText: { color: "#087E8B", fontSize: 13, fontWeight: "900" },
  disabled: { opacity: 0.35 },
  weekRow: { flexDirection: "row-reverse", marginBottom: 7 },
  weekCell: { width: "14.2857%", alignItems: "center" },
  weekText: { color: "#607484", fontSize: 12, fontWeight: "900" },
  daysGrid: { flexDirection: "row-reverse", flexWrap: "wrap" },
  dayCell: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
    marginBottom: 3,
  },
  dayText: { color: "#173A57", fontSize: 16, fontWeight: "800" },
  dayOutsideText: { color: "#B1BDC4" },
  daySelected: {
    backgroundColor: "#087E8B",
    shadowColor: "#087E8B",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  daySelectedText: { color: "#FFFFFF", fontWeight: "900" },
  dayToday: { borderColor: "#087E8B", backgroundColor: "#E8F6F7" },
  dayDisabled: { opacity: 0.24 },
  dayDisabledText: { color: "#A8B6BF" },
  dayPressed: { backgroundColor: "#EDF4FC" },
  footerActions: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E5EDF1",
  },
  confirmButton: {
    flex: 1.5,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#087E8B",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  cancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#F1F6F8",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: { color: "#173A57", fontSize: 15, fontWeight: "900" },
  clearButton: {
    minWidth: 64,
    minHeight: 50,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#FFF0F2",
    alignItems: "center",
    justifyContent: "center",
  },
  clearButtonText: { color: "#B63A49", fontSize: 14, fontWeight: "900" },
});
