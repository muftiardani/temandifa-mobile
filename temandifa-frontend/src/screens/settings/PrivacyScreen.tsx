import React from "react";
import { Text, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "../../context/ThemeContext";

export default function PrivacyScreen() {
  const { theme } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Kebijakan Privasi
      </Text>

      <Text style={[styles.paragraph, { color: theme.colors.textSecondary }]}>
        Terakhir Diperbarui: 1 Januari 2026
      </Text>

      <Text style={[styles.heading, { color: theme.colors.text }]}>
        Pengumpulan Data
      </Text>
      <Text style={[styles.paragraph, { color: theme.colors.textSecondary }]}>
        TemanDifa mengumpulkan data yang diperlukan untuk fungsi utama aplikasi,
        seperti akses kamera untuk deteksi objek dan akses mikrofon untuk
        perintah suara. Kami tidak menjual data Anda ke pihak ketiga.
      </Text>

      <Text style={[styles.heading, { color: theme.colors.text }]}>
        Keamanan Data
      </Text>
      <Text style={[styles.paragraph, { color: theme.colors.textSecondary }]}>
        Semua data transmisi (gambar dan suara) dikirim menggunakan protokol
        aman (HTTPS). Data sensitif seperti password disimpan dalam bentuk
        terenkripsi (Hashed).
      </Text>

      <Text style={[styles.heading, { color: theme.colors.text }]}>
        Izin Akses
      </Text>
      <Text style={[styles.paragraph, { color: theme.colors.textSecondary }]}>
        Aplikasi ini memerlukan izin akses Kamera dan Mikrofon untuk bekerja.
        Anda dapat mencabut izin ini kapan saja melalui pengaturan HP Anda.
      </Text>
    </ScrollView>
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
