import React from "react";
import { Text, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "../../context/ThemeContext";

export default function HelpScreen() {
  const { theme } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Panduan Penggunaan
      </Text>

      <Text style={[styles.heading, { color: theme.colors.primary }]}>
        1. Deteksi Objek
      </Text>
      <Text style={[styles.paragraph, { color: theme.colors.textSecondary }]}>
        Pilih menu &quot;Kamera&quot; di halaman utama. Arahkan kamera ke objek
        di sekitar Anda. Aplikasi akan menyebutkan nama objek yang terdeteksi
        secara otomatis.
      </Text>

      <Text style={[styles.heading, { color: theme.colors.primary }]}>
        2. Membaca Teks (OCR)
      </Text>
      <Text style={[styles.paragraph, { color: theme.colors.textSecondary }]}>
        Pilih menu &quot;Scan&quot; di halaman utama. Potret dokumen atau
        tulisan. Tunggu beberapa saat, dan aplikasi akan membacakan tulisan
        tersebut untuk Anda.
      </Text>

      <Text style={[styles.heading, { color: theme.colors.primary }]}>
        3. Perintah Suara
      </Text>
      <Text style={[styles.paragraph, { color: theme.colors.textSecondary }]}>
        Gunakan menu &quot;Voice&quot; untuk merekam suara Anda. Aplikasi akan
        mengubah suara menjadi teks (Transkripsi) yang dapat disimpan atau
        dibacakan ulang.
      </Text>

      <Text style={[styles.heading, { color: theme.colors.primary }]}>
        Butuh Bantuan Lebih?
      </Text>
      <Text style={[styles.paragraph, { color: theme.colors.textSecondary }]}>
        Hubungi tim support kami di support@temandifa.com
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
