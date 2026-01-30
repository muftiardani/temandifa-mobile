import React from "react";
import { StyleSheet } from "react-native";
import { useThemeStore } from "../../stores/themeStore";
import { ThemedText } from "../../components/atoms/ThemedText";
import { InfoScreenLayout } from "../../components/layouts/InfoScreenLayout";

export default function HelpScreen() {
  const { theme } = useThemeStore();

  return (
    <InfoScreenLayout title="Panduan Penggunaan">
      <ThemedText variant="subtitle" style={styles.heading} color="primary">
        1. Deteksi Objek
      </ThemedText>
      <ThemedText style={styles.paragraph} color={theme.colors.textSecondary}>
        Pilih menu &quot;Kamera&quot; di halaman utama. Arahkan kamera ke objek
        di sekitar Anda. Aplikasi akan menyebutkan nama objek yang terdeteksi
        secara otomatis.
      </ThemedText>

      <ThemedText variant="subtitle" style={styles.heading} color="primary">
        2. Membaca Teks (OCR)
      </ThemedText>
      <ThemedText style={styles.paragraph} color={theme.colors.textSecondary}>
        Pilih menu &quot;Scan&quot; di halaman utama. Potret dokumen atau
        tulisan. Tunggu beberapa saat, dan aplikasi akan membacakan tulisan
        tersebut untuk Anda.
      </ThemedText>

      <ThemedText variant="subtitle" style={styles.heading} color="primary">
        3. Perintah Suara
      </ThemedText>
      <ThemedText style={styles.paragraph} color={theme.colors.textSecondary}>
        Gunakan menu &quot;Voice&quot; untuk merekam suara Anda. Aplikasi akan
        mengubah suara menjadi teks (Transkripsi) yang dapat disimpan atau
        dibacakan ulang.
      </ThemedText>

      <ThemedText variant="subtitle" style={styles.heading} color="primary">
        Butuh Bantuan Lebih?
      </ThemedText>
      <ThemedText style={styles.paragraph} color={theme.colors.textSecondary}>
        Hubungi tim support kami di support@temandifa.com
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
