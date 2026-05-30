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
} from '@mantine/core';
import {
  IconArrowLeft,
  IconAlertCircle,
  IconShieldCheck,
  IconShieldX,
  IconHourglass,
  IconBuildingWarehouse,
  IconPackage,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { daasAPI } from '@/lib/buildpad/hooks/api';
import type { RawMaterial, Supplier, Offer, QualityControl, Warehouse, User } from '@/types/sima-arome';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';

export default function RawMaterialIntakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  useSetModuleTitle('Detail Penerimaan');

  const [loading, setLoading] = useState(true);
  const [material, setMaterial] = useState<RawMaterial | null>(null);
  const [supplierName, setSupplierName] = useState('Unknown Supplier');
  const [warehouseName, setWarehouseName] = useState('Unknown Warehouse');
  const [receiverName, setReceiverName] = useState('System Receiver');
  const [qcRecord, setQcRecord] = useState<QualityControl | null>(null);
  const [inspectorName, setInspectorName] = useState('QC Inspector');

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);

        // 1. Fetch raw material
        const mat = await daasAPI.getItem<RawMaterial>('raw_materials', id);
        if (!mat) return;
        setMaterial(mat);

        // 2. Fetch Supplier
        let sId = mat.supplier_id;
        if (!sId && mat.offer_id) {
          try {
            const offer = await daasAPI.getItem<Offer>('offers', mat.offer_id);
            if (offer) sId = offer.supplier_id;
          } catch (err) {
            console.warn('Failed to resolve supplier via offer:', err);
          }
        }

        if (sId) {
          try {
            const supplier = await daasAPI.getItem<Supplier>('suppliers', sId);
            if (supplier) setSupplierName(supplier.name);
          } catch (err) {
            console.warn('Failed to fetch supplier:', err);
          }
        }

        // 3. Fetch Warehouse
        if (mat.warehouse_id) {
          try {
            const wh = await daasAPI.getItem<Warehouse>('warehouses', mat.warehouse_id);
            if (wh) setWarehouseName(wh.name);
          } catch (err) {
            console.warn('Failed to fetch warehouse:', err);
          }
        }

        // 4. Fetch Receiver (Procurement User)
        if (mat.received_by) {
          try {
            const rec = await daasAPI.getItem<User>('daas_users', mat.received_by);
            if (rec) {
              const fullName = [rec.fullname || (rec as any).first_name, (rec as any).last_name].filter(Boolean).join(' ');
              setReceiverName(fullName || rec.email);
            }
          } catch (err) {
            console.warn('Failed to fetch receiver profile:', err);
          }
        }

        // 5. Fetch related QC Record if exists
        try {
          const qcResults = await daasAPI.getItems<QualityControl>('quality_control', {
            filter: { raw_material_id: { _eq: id } },
            limit: 1,
          });

          if (qcResults && qcResults.length > 0) {
            const qc = qcResults[0];
            setQcRecord(qc);

            // Fetch inspector profile
            if (qc.checked_by) {
              try {
                const inspector = await daasAPI.getItem<User>('daas_users', qc.checked_by);
                if (inspector) {
                  const fullName = [inspector.fullname || (inspector as any).first_name, (inspector as any).last_name].filter(Boolean).join(' ');
                  setInspectorName(fullName || inspector.email);
                }
              } catch (err) {
                console.warn('Failed to fetch inspector details:', err);
              }
            }
          }
        } catch (qcErr) {
          console.warn('No QC record found:', qcErr);
        }
      } catch (err) {
        console.error('Error loading detail page:', err);
        notifications.show({
          title: 'Error',
          message: 'Gagal memuat rincian bahan baku.',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [id]);

  // Breadcrumbs items
  const breadcrumbItems = [
    { title: 'Dashboard', href: '/dashboard/raw-materials' },
    { title: 'Penerimaan', href: '/dashboard/raw-materials/intake' },
    { title: material?.intake_number || 'Detail', href: `/dashboard/raw-materials/intake/${id}` },
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
          <Text c="dimmed">Memuat detail kedatangan batch...</Text>
        </Stack>
      </Container>
    );
  }

  if (!material) {
    return (
      <Container size="xl" py="xl">
        <Notification color="red" title="Error" icon={<IconAlertCircle size={20} />}>
          Transaksi Penerimaan Bahan Baku dengan ID {id} tidak ditemukan.
        </Notification>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Navigation & Breadcrumbs */}
        <Group justify="space-between">
          <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>
          <Button
            component={Link}
            href="/dashboard/raw-materials/intake"
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            color="gray"
          >
            Kembali ke Daftar
          </Button>
        </Group>

        {/* Header Title */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Title order={1} style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-primary, #1e5b3a)' }}>
              Penerimaan: {material.intake_number || 'INTAKE-LOG'}
            </Title>
            <Text c="dimmed">Logistik masuk dan pemeriksaan kelayakan kualitas bahan</Text>
          </div>
          <Badge
            size="lg"
            variant="filled"
            color={
              material.status === 'PENDING_QC'
                ? 'grape'
                : material.status === 'QC_ACCEPTED' || material.status === 'IN_PRODUCTION'
                  ? 'teal'
                  : 'red'
            }
          >
            {material.status === 'PENDING_QC'
              ? 'Pending QC'
              : material.status === 'QC_ACCEPTED' || material.status === 'IN_PRODUCTION'
                ? 'Lolos QC'
                : 'Ditolak QC'}
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Left: General Info Card */}
          <Card p="xl" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
            <Group gap="xs" mb="sm">
              <IconPackage size={20} color="#1e5b3a" />
              <Title order={3} style={{ fontFamily: 'var(--ds-font-display)', color: '#1e5b3a' }}>
                Informasi Penerimaan Bahan
              </Title>
            </Group>
            <Divider mb="lg" />

            <SimpleGrid cols={2} spacing="md">
              <div>
                <Text size="xs" c="dimmed" fw={700}>NOMOR INTAKE</Text>
                <Text fw={700} size="md" c="var(--ds-gray-800)">{material.intake_number || 'N/A'}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" fw={700}>NAMA BAHAN BAKU</Text>
                <Text fw={600} size="md" c="var(--ds-gray-800)">{material.material_name}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" fw={700}>KATEGORI BAHAN</Text>
                <Text fw={600} size="sm" c="var(--ds-gray-800)">{material.category || 'Essential Oil'}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" fw={700}>NOMOR BATCH PEMASOK</Text>
                <Text fw={600} size="sm" c="var(--ds-gray-800)">{material.batch_code}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" fw={700}>PEMASOK (SUPPLIER)</Text>
                <Text fw={600} size="sm" c="var(--ds-gray-800)">{supplierName}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" fw={700}>VOLUME KEDATANGAN</Text>
                <Text fw={700} size="md" c="#e67700">{material.weight_kg} {material.unit || 'kg'}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" fw={700}>TANGGAL KEDATANGAN</Text>
                <Text fw={600} size="sm" c="var(--ds-gray-800)">
                  {new Date(material.received_at).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" fw={700}>TANGGAL KEDALUWARSA</Text>
                <Text fw={600} size="sm" c="var(--ds-gray-800)">
                  {material.expired_date
                    ? new Date(material.expired_date).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Tidak Dicantumkan'}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" fw={700}>GUDANG ALOKASI</Text>
                <Text fw={600} size="sm" c="var(--ds-gray-800)">{warehouseName}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" fw={700}>DITERIMA OLEH</Text>
                <Text fw={600} size="sm" c="var(--ds-gray-800)">{receiverName}</Text>
              </div>
            </SimpleGrid>

            <Divider my="md" />

            <div>
              <Text size="xs" c="dimmed" fw={700} mb={4}>CATATAN LOGISTIK / KONDISI CARGO</Text>
              <Paper p="sm" withBorder style={{ backgroundColor: '#f8f9fa', borderRadius: 8 }}>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {material.notes || 'Tidak ada catatan khusus yang terekam pada saat cargo masuk.'}
                </Text>
              </Paper>
            </div>
          </Card>

          {/* Right: Quality Control (QC) Inspection Result Card */}
          <Stack gap="lg">
            {qcRecord ? (
              <Card p="xl" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
                <Group gap="xs" mb="sm">
                  {qcRecord.qc_status === 'PASSED' ? (
                    <IconShieldCheck size={24} color="#0ca678" />
                  ) : (
                    <IconShieldX size={24} color="#f03e3e" />
                  )}
                  <Title order={3} style={{ fontFamily: 'var(--ds-font-display)', color: qcRecord.qc_status === 'PASSED' ? '#0ca678' : '#f03e3e' }}>
                    Hasil Inspeksi Laboratorium QC
                  </Title>
                </Group>
                <Divider mb="lg" />

                <Stack gap="md">
                  <SimpleGrid cols={2} spacing="md">
                    <div>
                      <Text size="xs" c="dimmed" fw={700}>KEPUTUSAN KELAYAKAN</Text>
                      <Badge
                        variant="filled"
                        size="md"
                        color={qcRecord.qc_status === 'PASSED' ? 'teal' : 'red'}
                        mt={4}
                      >
                        {qcRecord.qc_status === 'PASSED' ? 'Lolos QC (PASSED)' : 'Ditolak QC (FAILED)'}
                      </Badge>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed" fw={700}>TANGGAL INSPEKSI</Text>
                      <Text fw={600} size="sm" c="var(--ds-gray-800)">
                        {new Date(qcRecord.created_at).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed" fw={700}>INSPEKTOR LAB</Text>
                      <Text fw={600} size="sm" c="var(--ds-gray-800)">{inspectorName}</Text>
                    </div>
                  </SimpleGrid>

                  <Divider />

                  <div>
                    <Text size="xs" c="dimmed" fw={700} mb={4}>TEMUAN PEMERIKSAAN & ANALISIS UJI</Text>
                    <Paper p="sm" withBorder style={{ backgroundColor: qcRecord.qc_status === 'PASSED' ? '#f4faf6' : '#fff5f5', border: qcRecord.qc_status === 'PASSED' ? '1px solid #c2ffd8' : '1px solid #ffe3e3', borderRadius: 8 }}>
                      <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{qcRecord.qc_notes}</Text>
                    </Paper>
                  </div>
                </Stack>
              </Card>
            ) : (
              /* If no QC record has been generated yet, show locked lockbox card */
              <Card p="xl" radius="md" withBorder style={{ backgroundColor: '#fff9db', borderColor: '#ffe066', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '320px' }}>
                <Stack align="center" gap="md" style={{ textAlign: 'center', maxWidth: '360px' }}>
                  <IconHourglass size={48} color="#f08c00" style={{ animation: 'pulse 2s infinite' }} />
                  <Title order={3} c="#f08c00">Menunggu Uji Lab QC</Title>
                  <Text size="sm" c="var(--ds-gray-700)">
                    Batch bahan baku ini **belum disetujui** oleh tim Quality Control.
                  </Text>
                  <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
                    Sesuai Prosedur ERP: Bahan baku tidak dapat dialokasikan ke mesin formulasi produksi compounding sebelum status berubah menjadi "Lolos QC".
                  </Text>
                </Stack>
              </Card>
            )}

            {/* Warehouse Storage Zone Security Details */}
            <Card p="xl" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
              <Group gap="xs" mb="sm">
                <IconBuildingWarehouse size={20} color="#1e5b3a" />
                <Title order={3} style={{ fontFamily: 'var(--ds-font-display)', color: '#1e5b3a' }}>
                  Petunjuk Penyimpanan Gudang
                </Title>
              </Group>
              <Divider mb="lg" />
              <Stack gap="xs">
                <Text size="xs" c="dimmed">STANDAR TEMPERATUR</Text>
                <Text size="sm" fw={600}>Cold Storage Zone A (Target: 2°C - 5°C)</Text>
                <Text size="xs" c="dimmed" mt="xs">PROSEDUR PENANGANAN BAHAN</Text>
                <Text size="xs" c="var(--ds-gray-700)">
                  - Pastikan kemasan diletakkan di atas pallet plastik untuk menghindari kelembaban lantai.
                </Text>
                <Text size="xs" c="var(--ds-gray-700)">
                  - Gunakan metode FIFO (First-In, First-Out) dalam pengambilan bahan untuk mencegah penimbunan kedaluwarsa.
                </Text>
              </Stack>
            </Card>
          </Stack>
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
