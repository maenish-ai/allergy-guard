import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
  const blocked = busy || disabled;

  return (
    <View style={styles.wrap}>
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
            <View style={styles.content}>
              <Text style={styles.text}>{label}</Text>
              <Text style={styles.helper}>اضغط هنا للحفظ</Text>
            </View>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#D8E5EA",
    zIndex: 40,
  },
  buttonShell: {
    width: "100%",
    minHeight: 72,
    borderRadius: 20,
    backgroundColor: "#DDF7F4",
    borderWidth: 3,
    borderColor: "#087E8B",
    overflow: "hidden",
  },
  touchTarget: {
    width: "100%",
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#075D69",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  helper: {
    color: "#173A57",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 3,
  },
  disabledShell: {
    opacity: 0.55,
  },
});
