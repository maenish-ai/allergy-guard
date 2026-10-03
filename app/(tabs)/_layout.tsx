import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 7);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.muted,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "800" },
        tabBarStyle: {
          paddingTop: 7,
          paddingBottom: bottomPadding,
          height: 58 + bottomPadding,
          backgroundColor: "#FFFFFF",
          borderTopColor: "#D9E5EA",
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color }) => <IconSymbol size={23} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: "المرضى",
          tabBarIcon: ({ color }) => <IconSymbol size={23} name="person.3.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: "السجلات",
          tabBarIcon: ({ color }) => <IconSymbol size={23} name="list.bullet" color={color} />,
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: "الطوارئ",
          tabBarIcon: ({ color }) => <IconSymbol size={23} name="cross.case.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "الإعدادات",
          tabBarIcon: ({ color }) => <IconSymbol size={23} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
