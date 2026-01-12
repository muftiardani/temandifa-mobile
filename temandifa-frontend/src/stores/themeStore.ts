import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { darkTheme, lightTheme, ThemeType } from "../constants/theme";

interface ThemeState {
  isDark: boolean;
  theme: ThemeType;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: Appearance.getColorScheme() === "dark",
      theme: Appearance.getColorScheme() === "dark" ? darkTheme : lightTheme,
      toggleTheme: () =>
        set((state) => {
          const newIsDark = !state.isDark;
          return {
            isDark: newIsDark,
            theme: newIsDark ? darkTheme : lightTheme,
          };
        }),
      setTheme: (isDark: boolean) =>
        set({
          isDark,
          theme: isDark ? darkTheme : lightTheme,
        }),
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ isDark: state.isDark }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.theme = state.isDark ? darkTheme : lightTheme;
        }
      },
    }
  )
);
