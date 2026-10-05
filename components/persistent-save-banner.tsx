import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type PersistentSaveBannerProps = {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
};

export function PersistentSaveBanner({
  label,
  onPress,
  busy = false,
  disabled = false,
}: PersistentSaveBannerProps) {
  return (
    <View style={styles.wrap}>
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
          <View style={styles.content}>
            <Text style={styles.icon}>💾</Text>
            <Text style={styles.text}>{label}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#D8E5EA",
    zIndex: 40,
    elevation: 10,
  },
  button: {
    minHeight: 66,
    width: "100%",
    borderRadius: 20,
    backgroundColor: "#087E8B",
    borderWidth: 2,
    borderColor: "#075D69",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    shadowColor: "#173A57",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  content: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  icon: { fontSize: 22 },
  text: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.995 }] },
  disabled: { opacity: 0.55 },
});
