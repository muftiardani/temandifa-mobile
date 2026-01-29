import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import en from "./locales/en.json";
import id from "./locales/id.json";

// Detect user language
const getLocales = () => {
  try {
    return Localization.getLocales();
  } catch {
    return [{ languageCode: "id" }]; // Fallback
  }
};

const locales = getLocales();
const deviceLanguage = locales[0]?.languageCode || "id";

// eslint-disable-next-line import/no-named-as-default-member
i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    id: { translation: id },
  },
  lng: deviceLanguage, // Default to device language
  fallbackLng: "id", // Fallback to Indonesian if detection fails or language not supported
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false, // Handle async loading manually if needed, or disable suspense for RN
  },
});

export default i18next;
