import React from "react";
import { StyleSheet } from "react-native";
import { useThemeStore } from "../../stores/themeStore";
import { ThemedText } from "../../components/atoms/ThemedText";
import { InfoScreenLayout } from "../../components/layouts/InfoScreenLayout";

export default function PrivacyScreen() {
  const { theme } = useThemeStore();

  return (
    <InfoScreenLayout title="Kebijakan Privasi">
      <ThemedText style={styles.paragraph} color={theme.colors.textSecondary}>
        Terakhir Diperbarui: 1 Januari 2026
      </ThemedText>

      <ThemedText variant="subtitle" style={styles.heading}>
        Pengumpulan Data
      </ThemedText>
      <ThemedText style={styles.paragraph} color={theme.colors.textSecondary}>
        TemanDifa mengumpulkan data yang diperlukan untuk fungsi utama aplikasi,
        seperti akses kamera untuk deteksi objek dan akses mikrofon untuk
        perintah suara. Kami tidak menjual data Anda ke pihak ketiga.
      </ThemedText>

      <ThemedText variant="subtitle" style={styles.heading}>
        Keamanan Data
      </ThemedText>
      <ThemedText style={styles.paragraph} color={theme.colors.textSecondary}>
        Semua data transmisi (gambar dan suara) dikirim menggunakan protokol
        aman (HTTPS). Data sensitif seperti password disimpan dalam bentuk
        terenkripsi (Hashed).
      </ThemedText>

      <ThemedText variant="subtitle" style={styles.heading}>
        Izin Akses
      </ThemedText>
      <ThemedText style={styles.paragraph} color={theme.colors.textSecondary}>
        Aplikasi ini memerlukan izin akses Kamera dan Mikrofon untuk bekerja.
        Anda dapat mencabut izin ini kapan saja melalui pengaturan HP Anda.
      </ThemedText>
    </InfoScreenLayout>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
  },
});
