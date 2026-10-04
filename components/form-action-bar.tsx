import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

const SAVE_TEAL = "#169D90";

type FormActionBarProps = {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  hint?: string;
  topBorder?: boolean;
  bottomPadding?: number;
};

export function FormActionBar({
  label,
  onPress,
  busy = false,
  disabled = false,
  hint,
  topBorder = true,
  bottomPadding = 18,
}: FormActionBarProps) {
  return (
    <View
      style={[
        styles.wrap,
        topBorder && styles.topBorder,
        { paddingBottom: Math.max(bottomPadding, 16) },
      ]}
    >
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <Pressable
        onPress={onPress}
        disabled={busy || disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
          (busy || disabled) && styles.disabled,
        ]}
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.text}>{label}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingTop: 12,
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
  button: {
    minHeight: 70,
    borderRadius: 24,
    backgroundColor: SAVE_TEAL,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    shadowColor: "#0D6F67",
    shadowOpacity: 0.12,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.995 }] },
  disabled: { opacity: 0.5 },
});
