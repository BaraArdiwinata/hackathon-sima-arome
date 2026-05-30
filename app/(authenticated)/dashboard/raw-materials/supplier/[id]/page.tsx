'use client';

import React, { useEffect, useState, use } from 'react';
import {
  Container,
  Paper,
  Stack,
  Text,
  Title,
  Group,
  SimpleGrid,
  Badge,
  Button,
  Divider,
  Loader,
  Notification,
  Card,
  Anchor,
  Breadcrumbs,
  Table,
  ThemeIcon,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconAlertCircle,
  IconBuildingFactory,
  IconTruck,
  IconFileCheck,
  IconFileX,
  IconMail,
  IconPhone,
  IconMapPin,
  IconUser,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { daasAPI } from '@/lib/buildpad/hooks/api';
import type { Supplier, RawMaterial, Offer } from '@/types/sima-arome';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';

export default function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  useSetModuleTitle('Profil Pemasok');

  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [deliveries, setDeliveries] = useState<RawMaterial[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    async function fetchSupplierDetail() {
      try {
        setLoading(true);

        // 1. Fetch supplier profile
        const sup = await daasAPI.getItem<Supplier>('suppliers', id);
        if (!sup) return;
        setSupplier(sup);

        // 2. Fetch all raw materials and offers to compute metrics and histories
        const [rmData, offersData] = await Promise.all([
          daasAPI.getItems<RawMaterial>('raw_materials'),
          daasAPI.getItems<Offer>('offers'),
        ]);

        const allOffers = Array.isArray(offersData) ? offersData : [];
        setOffers(allOffers);

        // Map offers to their supplier_id for lookup
        const offerToSupplierMap = new Map<string, string>();
        allOffers.forEach(o => offerToSupplierMap.set(o.id, o.supplier_id));

        // Filter raw materials delivered by this supplier
        const rawMaterialsList = Array.isArray(rmData) ? rmData : [];
        const supplierDeliveries = rawMaterialsList.filter(item => {
          if (item.supplier_id === id) return true;
          if (item.offer_id && offerToSupplierMap.get(item.offer_id) === id) return true;
          return false;
        });

        // Sort deliveries by date received descending
        setDeliveries(
          supplierDeliveries.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
        );

      } catch (err) {
        console.error('Error fetching supplier details:', err);
        notifications.show({
          title: 'Error',
          message: 'Gagal memuat profil dan riwayat pemasok.',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSupplierDetail();
  }, [id]);

  // Aggregate Metrics
  const totalDeliveries = deliveries.length;
  const totalAcceptedQC = deliveries.filter(
    item => item.status === 'QC_ACCEPTED' || item.status === 'IN_PRODUCTION'
  ).length;
  const totalRejectedQC = deliveries.filter(item => item.status === 'QC_REJECTED').length;
  const totalPendingQC = deliveries.filter(item => item.status === 'PENDING_QC').length;

  const qualityRatio = totalDeliveries > 0 ? Math.round((totalAcceptedQC / (totalAcceptedQC + totalRejectedQC || 1)) * 100) : 100;

  // Breadcrumbs items
  const breadcrumbItems = [
    { title: 'Dashboard', href: '/dashboard/raw-materials' },
    { title: 'Pemasok', href: '/dashboard/raw-materials/supplier' },
    { title: supplier?.name || 'Detail', href: `/dashboard/raw-materials/supplier/${id}` },
  ].map((item, index) => (
    <Anchor component={Link} href={item.href} key={index} style={{ fontSize: 'var(--ds-font-size-xs)' }}>
      {item.title}
    </Anchor>
  ));

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" justify="center" style={{ minHeight: '300px' }}>
          <Loader size="lg" color="emerald" />
          <Text c="dimmed">Memuat profil dan data transaksi...</Text>
        </Stack>
      </Container>
    );
  }

  if (!supplier) {
    return (
      <Container size="xl" py="xl">
        <Notification color="red" title="Error" icon={<IconAlertCircle size={20} />}>
          Pemasok dengan ID {id} tidak ditemukan.
        </Notification>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Navigation */}
        <Group justify="space-between">
          <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>
          <Button
            component={Link}
            href="/dashboard/raw-materials/supplier"
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            color="gray"
          >
            Kembali ke Daftar
          </Button>
        </Group>

        {/* Profile Header */}
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="md">
            <Box style={{ 
              width: 50, 
              height: 50, 
              borderRadius: 8, 
              backgroundColor: 'var(--ds-primary-100, #ebf7f0)', 
              color: 'var(--ds-primary, #1e5b3a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IconBuildingFactory size={28} />
            </Box>
            <div>
              <Title order={1} style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-primary, #1e5b3a)' }}>
                {supplier.name}
              </Title>
              <Text size="sm" c="dimmed">Kode Pemasok: {supplier.code || 'N/A'}</Text>
            </div>
          </Group>
          <Badge
            size="lg"
            variant="filled"
            color={supplier.status === 'INACTIVE' ? 'red' : 'teal'}
          >
            {supplier.status === 'INACTIVE' ? 'Nonaktif' : 'Aktif'}
          </Badge>
        </Group>

        {/* Aggregated KPI Cards */}
        <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md">
          {/* Deliveries */}
          <Paper p="md" radius="md" withBorder style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <ThemeIcon size={44} radius="md" variant="light" color="blue">
              <IconTruck size={24} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">Total Kedatangan</Text>
              <Title order={3}>{totalDeliveries}</Title>
            </div>
          </Paper>

          {/* Passed */}
          <Paper p="md" radius="md" withBorder style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <ThemeIcon size={44} radius="md" variant="light" color="teal">
              <IconFileCheck size={24} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">Batch Lolos QC</Text>
              <Title order={3} c="teal.7">{totalAcceptedQC}</Title>
            </div>
          </Paper>

          {/* Rejected */}
          <Paper p="md" radius="md" withBorder style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <ThemeIcon size={44} radius="md" variant="light" color="red">
              <IconFileX size={24} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">Batch Ditolak QC</Text>
              <Title order={3} c="red.7">{totalRejectedQC}</Title>
            </div>
          </Paper>

          {/* Quality Ratio */}
          <Paper p="md" radius="md" withBorder style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <ThemeIcon size={44} radius="md" variant="light" color="emerald">
              <IconFileCheck size={24} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">Rasio Kualitas Lolos</Text>
              <Title order={3} c="var(--ds-primary)">{qualityRatio}%</Title>
            </div>
          </Paper>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
          {/* Left: Contact Info Card (1 col) */}
          <Card p="xl" radius="md" withBorder style={{ backgroundColor: '#ffffff', height: 'fit-content' }}>
            <Title order={3} mb="md" style={{ fontFamily: 'var(--ds-font-display)', color: '#1e5b3a' }}>
              Narahubung & Alamat
            </Title>
            <Divider mb="lg" />

            <Stack gap="md">
              <Group gap="sm" wrap="nowrap">
                <IconUser size={18} color="#868e96" />
                <div>
                  <Text size="xs" c="dimmed">PIC NARAHUBUNG</Text>
                  <Text fw={600} size="sm">{supplier.contact_person || 'N/A'}</Text>
                </div>
              </Group>

              <Group gap="sm" wrap="nowrap">
                <IconPhone size={18} color="#868e96" />
                <div>
                  <Text size="xs" c="dimmed">NOMOR TELEPON</Text>
                  <Text fw={600} size="sm">{supplier.phone_number}</Text>
                </div>
              </Group>

              <Group gap="sm" wrap="nowrap">
                <IconMail size={18} color="#868e96" />
                <div>
                  <Text size="xs" c="dimmed">ALAMAT EMAIL</Text>
                  <Text fw={600} size="sm" style={{ fontStyle: supplier.email ? 'normal' : 'italic' }}>
                    {supplier.email || 'N/A'}
                  </Text>
                </div>
              </Group>

              <Group gap="sm" wrap="nowrap" align="flex-start">
                <IconMapPin size={18} color="#868e96" style={{ marginTop: 4 }} />
                <div>
                  <Text size="xs" c="dimmed">ALAMAT KANTOR/GUDANG</Text>
                  <Text fw={500} size="sm" style={{ lineHeight: 1.4 }}>{supplier.address}</Text>
                </div>
              </Group>
            </Stack>
          </Card>

          {/* Right: History Deliveries (2 cols) */}
          <Paper p="xl" radius="md" withBorder style={{ gridColumn: 'span 2' }}>
            <Title order={3} mb="sm" style={{ fontFamily: 'var(--ds-font-display)', color: '#1e5b3a' }}>
              Riwayat Pengiriman Bahan Baku
            </Title>
            <Text size="xs" c="dimmed" mb="lg">
              Semua batch kedatangan bahan baku yang dipasok oleh perusahaan ini
            </Text>

            <Table.ScrollContainer minWidth={500}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>No. Penerimaan</Table.Th>
                    <Table.Th>Bahan Baku</Table.Th>
                    <Table.Th>Nomor Batch</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Jumlah</Table.Th>
                    <Table.Th>Status QC</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {deliveries.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5} style={{ textAlign: 'center', color: 'var(--ds-gray-500)' }}>
                        Belum ada riwayat pengiriman tercatat dari pemasok ini.
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    deliveries.map(item => {
                      let badgeColor = 'gray';
                      let badgeText = 'Tertunda';
                      if (item.status === 'PENDING_QC') {
                        badgeColor = 'grape';
                        badgeText = 'Pending QC';
                      } else if (item.status === 'QC_ACCEPTED' || item.status === 'IN_PRODUCTION') {
                        badgeColor = 'teal';
                        badgeText = 'Lolos QC';
                      } else if (item.status === 'QC_REJECTED') {
                        badgeColor = 'red';
                        badgeText = 'Ditolak QC';
                      }

                      return (
                        <Table.Tr key={item.id}>
                          <Table.Td>
                            <Text size="xs" fw={700}>{item.intake_number || 'N/A'}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" fw={600}>{item.material_name}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs">{item.batch_code}</Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text size="xs" fw={700}>{item.weight_kg} {item.unit || 'kg'}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge color={badgeColor} variant="light" size="xs">
                              {badgeText}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                  )}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>
        </SimpleGrid>
      </Stack>
    </Container>
  );
}

// Simple helper Box to replace div
function Box({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={style}>{children}</div>;
}
