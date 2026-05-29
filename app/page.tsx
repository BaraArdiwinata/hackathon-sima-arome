"use client";

import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { ColorSchemeToggle } from "@/components/ColorSchemeToggle";

export default function HomePage() {
  return (
    <Stack gap="lg" p="xl" style={{ maxWidth: 800, margin: "0 auto", marginTop: "10vh" }}>
      <Group justify="space-between">
        <Title order={1} style={{ fontFamily: "var(--ds-font-display, serif)" }}>
          Sima Arôme
        </Title>
        <ColorSchemeToggle />
      </Group>
      <Title order={2} style={{ fontFamily: "var(--ds-font-subheader, sans-serif)", fontWeight: 500, color: "var(--ds-primary)" }}>
        Supply Chain Management System
      </Title>
      <Text c="dimmed" style={{ fontFamily: "var(--ds-font-family, sans-serif)", lineHeight: 1.6 }}>
        Sistem manajemen rantai pasok terintegrasi untuk otomatisasi pengadaan AHP, kontrol kualitas (QC), manajemen gudang cold storage, dan pelacakan silsilah (traceability) produksi parfum.
      </Text>
      <Group>
        <Button size="md" radius="md">Masuk ke Sistem</Button>
        <Button variant="light" color="secondary" size="md" radius="md">
          Hubungi Admin
        </Button>
      </Group>
    </Stack>
  );
}
