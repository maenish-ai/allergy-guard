import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type FormActionBarProps = {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  hint?: string;
  topBorder?: boolean;
  bottomPadding?: number;
  sticky?: boolean;
};

export function FormActionBar({
  label,
  onPress,
  busy = false,
  disabled = false,
  hint,
  topBorder = true,
  bottomPadding = 18,
  sticky = false,
}: FormActionBarProps) {
  const blocked = busy || disabled;

  return (
    <View
      style={[
        styles.wrap,
        sticky && styles.stickyWrap,
        topBorder && styles.topBorder,
        { paddingBottom: Math.max(bottomPadding, 16) },
      ]}
    >
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={[styles.buttonShell, blocked && styles.disabledShell]}>
        <TouchableOpacity
          onPress={onPress}
          disabled={blocked}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint="اضغط لحفظ البيانات"
          style={styles.touchTarget}
        >
          {busy ? (
            <ActivityIndicator color="#075D69" size="small" />
          ) : (
            <Text style={styles.text}>{label}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  stickyWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    elevation: 18,
    shadowColor: "#17324D",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  topBorder: {
    borderTopWidth: 1,
    borderTopColor: "#E3E8EB",
  },
  hint: {
    color: "#697A87",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    textAlign: "right",
    marginBottom: 8,
  },
  buttonShell: {
    width: "100%",
    minHeight: 70,
    borderRadius: 22,
    backgroundColor: "#DDF7F4",
    borderWidth: 3,
    borderColor: "#087E8B",
    overflow: "hidden",
  },
  touchTarget: {
    width: "100%",
    minHeight: 70,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  text: {
    color: "#075D69",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  disabledShell: { opacity: 0.5 },
});
