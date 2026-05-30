'use client';

import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Stack,
  Text,
  Title,
  Group,
  Table,
  Badge,
  Button,
  Loader,
  Alert,
  TextInput,
  Select,
  Modal,
  Textarea,
  ActionIcon,
  Divider,
} from '@mantine/core';
import {
  IconSearch,
  IconPlus,
  IconCheck,
  IconEye,
  IconRefresh,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { daasAPI } from '@/lib/buildpad/hooks/api';
import { logAuditTrail } from '@/lib/api/audit';
import type { Supplier } from '@/types/sima-arome';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';

export default function SupplierManagementPage() {
  useSetModuleTitle('Manajemen Pemasok');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Modal State
  const [opened, setOpened] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhoneNumber, setFormPhoneNumber] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await daasAPI.getItems<Supplier>('suppliers');
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat daftar pemasok. Silakan segarkan halaman.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setFormCode(`SUP-${randomSuffix}`);
    setFormName('');
    setFormContactPerson('');
    setFormPhoneNumber('');
    setFormEmail('');
    setFormAddress('');
    setFormStatus('ACTIVE');
    setOpened(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formCode || !formName || !formPhoneNumber || !formAddress) {
      notifications.show({
        title: 'Formulir Belum Lengkap',
        message: 'Mohon isi semua bidang wajib.',
        color: 'red'
      });
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        code: formCode,
        name: formName,
        contact_person: formContactPerson || 'N/A',
        phone_number: formPhoneNumber,
        email: formEmail || 'N/A',
        address: formAddress,
        status: formStatus,
        favorite: false,
      };

      const newItem = await daasAPI.createItem<{ id: string }>('suppliers', payload);

      // Log Audit Trail
      await logAuditTrail(
        'Pemasok Baru Dibuat',
        'suppliers',
        newItem.id,
        undefined,
        `Membuat profil pemasok baru ${formName} dengan kode ${formCode}`
      );

      notifications.show({
        title: 'Pemasok Terdaftar',
        message: `Pemasok ${formName} berhasil disimpan ke basis data master.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });

      setOpened(false);
      fetchData();
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Pendaftaran Gagal',
        message: 'Gagal meregistrasikan pemasok baru. Kode pemasok mungkin sudah terdaftar.',
        color: 'red'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter logic
  const filteredSuppliers = React.useMemo(() => {
    return suppliers.filter(s => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.code?.toLowerCase().includes(search.toLowerCase()) ||
        s.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.address.toLowerCase().includes(search.toLowerCase());

      const matchStatus = !filterStatus || s.status === filterStatus;

      return matchSearch && matchStatus;
    });
  }, [suppliers, search, filterStatus]);

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Title order={1} style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-primary, #1e5b3a)' }}>
              Manajemen Pemasok (Suppliers)
            </Title>
            <Text c="dimmed">Daftar rekanan produsen minyak atsiri, rekap kontak perusahaan, dan status operasional</Text>
          </div>
          <Button
            leftSection={<IconPlus size={16} />}
            color="emerald"
            onClick={handleOpenModal}
            style={{ backgroundColor: '#1e5b3a' }}
          >
            Tambah Pemasok
          </Button>
        </Group>

        {/* Toolbar Filters */}
        <Paper p="md" radius="md" withBorder>
          <Group gap="md" wrap="wrap">
            <TextInput
              placeholder="Cari pemasok berdasarkan nama, kode, narahubung..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ minWidth: 320 }}
            />
            <Select
              placeholder="Filter Status"
              clearable
              value={filterStatus}
              onChange={setFilterStatus}
              data={[
                { value: 'ACTIVE', label: 'Aktif' },
                { value: 'INACTIVE', label: 'Nonaktif' },
              ]}
              style={{ minWidth: 160 }}
            />
            <Button
              variant="subtle"
              color="emerald"
              onClick={fetchData}
              title="Refresh Pemasok"
            >
              <IconRefresh size={18} />
            </Button>
          </Group>
        </Paper>

        {/* Table View */}
        <Paper p="md" radius="md" withBorder>
          {loading ? (
            <Stack align="center" py="xl">
              <Loader size="md" color="emerald" />
              <Text size="sm" c="dimmed">Memuat daftar pemasok...</Text>
            </Stack>
          ) : filteredSuppliers.length === 0 ? (
            <Stack align="center" py="xl">
              <Text size="sm" c="dimmed">Tidak ada data pemasok ditemukan.</Text>
            </Stack>
          ) : (
            <Table.ScrollContainer minWidth={800}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Kode Pemasok</Table.Th>
                    <Table.Th>Nama Pemasok</Table.Th>
                    <Table.Th>Narahubung (PIC)</Table.Th>
                    <Table.Th>No. Telepon</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Alamat</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th style={{ width: 80 }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredSuppliers.map((s) => (
                    <Table.Tr key={s.id}>
                      <Table.Td>
                        <Text size="xs" fw={700}>{s.code || 'N/A'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600} c="var(--ds-primary, #1e5b3a)">{s.name}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" fw={500}>{s.contact_person || 'N/A'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs">{s.phone_number}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" style={{ fontStyle: s.email ? 'normal' : 'italic' }}>
                          {s.email || 'N/A'}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ maxWidth: 220 }}>
                        <Text size="xs" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.address}>
                          {s.address}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={s.status === 'INACTIVE' ? 'red' : 'teal'} variant="light" size="xs">
                          {s.status === 'INACTIVE' ? 'Nonaktif' : 'Aktif'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Button
                          component={Link}
                          href={`/dashboard/raw-materials/supplier/${s.id}`}
                          variant="subtle"
                          color="emerald"
                          p={4}
                        >
                          <IconEye size={18} />
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Paper>
      </Stack>

      {/* Create Supplier Modal */}
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Daftarkan Pemasok Baru"
        radius="md"
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Group grow>
              <TextInput
                label="Kode Pemasok"
                placeholder="Contoh: SUP-123"
                value={formCode}
                onChange={(e) => setFormCode(e.currentTarget.value)}
                required
              />
              <Select
                label="Status Operasional"
                data={[
                  { value: 'ACTIVE', label: 'Aktif' },
                  { value: 'INACTIVE', label: 'Nonaktif' },
                ]}
                value={formStatus}
                onChange={(val) => setFormStatus(val as 'ACTIVE' | 'INACTIVE')}
                required
              />
            </Group>

            <TextInput
              label="Nama Perusahaan Pemasok"
              placeholder="Contoh: CV. Aroma Nusantara"
              value={formName}
              onChange={(e) => setFormName(e.currentTarget.value)}
              required
            />

            <TextInput
              label="Narahubung (Contact Person)"
              placeholder="Contoh: Bara Ardiwinata"
              value={formContactPerson}
              onChange={(e) => setFormContactPerson(e.currentTarget.value)}
            />

            <TextInput
              label="Nomor Telepon Kantor/PIC"
              placeholder="Contoh: 0812-3456-7890"
              value={formPhoneNumber}
              onChange={(e) => setFormPhoneNumber(e.currentTarget.value)}
              required
            />

            <TextInput
              label="Alamat Email Pemasok"
              placeholder="Contoh: info@aromanusantara.com"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.currentTarget.value)}
            />

            <Textarea
              label="Alamat Lengkap Kantor/Gudang Pemasok"
              placeholder="Contoh: Jl. Rungkut Industri Raya No.15, Surabaya"
              value={formAddress}
              onChange={(e) => setFormAddress(e.currentTarget.value)}
              minRows={3}
              required
            />

            <Divider my="xs" />

            <Group justify="flex-end">
              <Button variant="outline" color="gray" onClick={() => setOpened(false)}>Batal</Button>
              <Button type="submit" color="emerald" loading={submitting} style={{ backgroundColor: '#1e5b3a' }}>
                Daftarkan Pemasok
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
