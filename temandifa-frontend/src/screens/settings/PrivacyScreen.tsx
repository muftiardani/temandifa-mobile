import React from "react";
import { StyleSheet, ScrollView } from "react-native";
import { useThemeStore } from "../../stores/themeStore";
import { ThemedText } from "../../components/atoms/ThemedText";
import { ThemedView } from "../../components/atoms/ThemedView";

export default function PrivacyScreen() {
  const { theme } = useThemeStore();

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText variant="title" style={styles.title}>
          Kebijakan Privasi
        </ThemedText>

        <ThemedText style={styles.paragraph} color={theme.colors.textSecondary}>
          Terakhir Diperbarui: 1 Januari 2026
        </ThemedText>

        <ThemedText variant="subtitle" style={styles.heading}>
          Pengumpulan Data
        </ThemedText>
        <ThemedText style={styles.paragraph} color={theme.colors.textSecondary}>
          TemanDifa mengumpulkan data yang diperlukan untuk fungsi utama
          aplikasi, seperti akses kamera untuk deteksi objek dan akses mikrofon
          untuk perintah suara. Kami tidak menjual data Anda ke pihak ketiga.
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
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
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
