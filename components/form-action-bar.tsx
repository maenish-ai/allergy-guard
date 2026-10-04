import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type FormActionBarProps = {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  color?: string;
  hint?: string;
  topBorder?: boolean;
  bottomPadding?: number;
};

export function FormActionBar({
  label,
  onPress,
  busy = false,
  disabled = false,
  color = "#087E8B",
  hint,
  topBorder = true,
  bottomPadding = 18,
}: FormActionBarProps) {
  return (
    <View
      style={[
        styles.wrap,
        topBorder && styles.topBorder,
        { paddingBottom: Math.max(bottomPadding, 14) },
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
          { backgroundColor: color },
          pressed && styles.pressed,
          (busy || disabled) && styles.disabled,
        ]}
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.text}>✓ {label}</Text>
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
    borderTopColor: "#D8E5EA",
  },
  hint: {
    color: "#607484",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    textAlign: "right",
    marginBottom: 8,
  },
  button: {
    minHeight: 62,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    shadowColor: "#173A57",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  disabled: { opacity: 0.5 },
});
