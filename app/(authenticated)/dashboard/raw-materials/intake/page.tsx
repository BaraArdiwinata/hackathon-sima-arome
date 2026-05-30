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
  NumberInput,
  Textarea,
  Divider,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconSearch,
  IconPlus,
  IconCheck,
  IconEye,
  IconCalendar,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { daasAPI } from '@/lib/buildpad/hooks/api';
import { useAuth } from '@/lib/buildpad/hooks';
import { logAuditTrail } from '@/lib/api/audit';
import type { RawMaterial, Supplier, Offer, ProductSupplier, Warehouse } from '@/types/sima-arome';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';

export default function RawMaterialIntakePage() {
  useSetModuleTitle('Penerimaan Bahan Baku');
  const { user: currentUser } = useAuth();

  // List States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intakes, setIntakes] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [productSuppliers, setProductSuppliers] = useState<ProductSupplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Filter States
  const [search, setSearch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Modal State
  const [opened, setOpened] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [formIntakeNumber, setFormIntakeNumber] = useState('');
  const [formSupplierId, setFormSupplierId] = useState<string>('');
  const [formOfferId, setFormOfferId] = useState<string>('');
  const [formBatchCode, setFormBatchCode] = useState('');
  const [formMaterialName, setFormMaterialName] = useState('');
  const [formCategory, setFormCategory] = useState('Essential Oil');
  const [formWeightKg, setFormWeightKg] = useState<number>(50);
  const [formUnit, setFormUnit] = useState('kg');
  const [formReceivedAt, setFormReceivedAt] = useState<string | null>(() => new Date().toISOString().split('T')[0]);
  const [formExpiredDate, setFormExpiredDate] = useState<string | null>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1); // 1 year expiry default
    return d.toISOString().split('T')[0];
  });
  const [formNotes, setFormNotes] = useState('');
  const [formWarehouseId, setFormWarehouseId] = useState<string>('');
  const [formTotalPrice, setFormTotalPrice] = useState<number>(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [rmData, supData, offersData, psData, whData] = await Promise.all([
        daasAPI.getItems<RawMaterial>('raw_materials'),
        daasAPI.getItems<Supplier>('suppliers'),
        daasAPI.getItems<Offer>('offers'),
        daasAPI.getItems<ProductSupplier>('product_suppliers'),
        daasAPI.getItems<Warehouse>('warehouses'),
      ]);

      setIntakes(Array.isArray(rmData) ? rmData : []);
      setSuppliers(Array.isArray(supData) ? supData : []);
      setOffers(Array.isArray(offersData) ? offersData : []);
      setProductSuppliers(Array.isArray(psData) ? psData : []);
      
      const whList = Array.isArray(whData) ? whData : [];
      setWarehouses(whList);
      
      // Default to first active warehouse if available
      if (whList.length > 0) {
        setFormWarehouseId(whList[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data penerimaan. Silakan segarkan halaman.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Generate Intake Number on Modal Open
  const handleOpenModal = () => {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    
    setFormIntakeNumber(`INTAKE-${dateStr}-${randomSuffix}`);
    setFormSupplierId('');
    setFormOfferId('');
    setFormBatchCode('');
    setFormMaterialName('');
    setFormWeightKg(50);
    setFormTotalPrice(0);
    setFormNotes('');
    setOpened(true);
  };

  // Mappings
  const supplierMap = React.useMemo(() => {
    const map = new Map<string, string>();
    suppliers.forEach(s => map.set(s.id, s.name));
    return map;
  }, [suppliers]);

  const productSupplierMap = React.useMemo(() => {
    const map = new Map<string, string>();
    productSuppliers.forEach(p => map.set(p.id, p.name));
    return map;
  }, [productSuppliers]);

  const offerToSupplierMap = React.useMemo(() => {
    const map = new Map<string, string>();
    offers.forEach(o => map.set(o.id, o.supplier_id));
    return map;
  }, [offers]);

  const getSupplierName = (item: RawMaterial): string => {
    if (item.supplier_id && supplierMap.has(item.supplier_id)) {
      return supplierMap.get(item.supplier_id)!;
    }
    if (item.offer_id && offerToSupplierMap.has(item.offer_id)) {
      const sId = offerToSupplierMap.get(item.offer_id)!;
      return supplierMap.get(sId) || 'Pemasok Sima Arôme';
    }
    return 'Pemasok Sima Arôme';
  };

  // Filter supplier offers
  const filteredOffers = React.useMemo(() => {
    if (!formSupplierId) return [];
    return offers
      .filter(o => o.supplier_id === formSupplierId)
      .map(o => {
        const prodName = productSupplierMap.get(o.product_supplier_id) || 'Bahan Baku';
        return {
          value: o.id,
          label: `${prodName} (Rp ${o.price.toLocaleString('id-ID')}/${o.lead_time} hari)`,
          price: o.price,
          name: prodName
        };
      });
  }, [formSupplierId, offers, productSupplierMap]);

  // Recalculate price when offer or quantity changes
  const handleOfferChange = (offerId: string | null) => {
    if (!offerId) return;
    setFormOfferId(offerId);
    const selected = filteredOffers.find(o => o.value === offerId);
    if (selected) {
      setFormMaterialName(selected.name);
      const computedPrice = selected.price * formWeightKg;
      setFormTotalPrice(computedPrice);
    }
  };

  const handleWeightChange = (val: number | string) => {
    const qty = Number(val) || 0;
    setFormWeightKg(qty);
    const selected = filteredOffers.find(o => o.value === formOfferId);
    if (selected) {
      setFormTotalPrice(selected.price * qty);
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formSupplierId || !formOfferId || !formBatchCode || !formWarehouseId || !currentUser) {
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
        supplier_id: formSupplierId,
        offer_id: formOfferId,
        warehouse_id: formWarehouseId,
        intake_number: formIntakeNumber,
        batch_code: formBatchCode,
        material_name: formMaterialName,
        category: formCategory,
        weight_kg: formWeightKg,
        unit: formUnit,
        received_by: currentUser.id,
        received_at: formReceivedAt ? new Date(formReceivedAt).toISOString() : new Date().toISOString(),
        expired_date: formExpiredDate ? new Date(formExpiredDate).toISOString() : null,
        notes: formNotes,
        total_price: formTotalPrice,
        status: 'PENDING_QC',
      };

      const newItem = await daasAPI.createItem<{ id: string }>('raw_materials', payload);
      
      // Log Audit Trail
      await logAuditTrail(
        'Penerimaan Bahan Baku Dibuat',
        'raw_materials',
        newItem.id,
        undefined,
        `Mencatat penerimaan bahan baku ${formMaterialName} dengan nomor ${formIntakeNumber} dari supplier`
      );

      notifications.show({
        title: 'Berhasil Dicatat',
        message: `Bahan baku ${formMaterialName} berhasil masuk sistem dengan status Pending QC.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });

      setOpened(false);
      fetchData();
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Gagal Menyimpan',
        message: 'Terjadi kesalahan sistem saat menyimpan data penerimaan.',
        color: 'red'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Table Data Filtering
  const filteredIntakes = React.useMemo(() => {
    return intakes.filter(item => {
      // Search matches intake number or material name or batch code
      const searchMatch = 
        item.intake_number?.toLowerCase().includes(search.toLowerCase()) ||
        item.material_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.batch_code?.toLowerCase().includes(search.toLowerCase());

      // Supplier filter matches supplier_id or offer's supplier_id
      const supplierId = item.supplier_id || (item.offer_id ? offerToSupplierMap.get(item.offer_id) : null);
      const supplierMatch = !filterSupplier || supplierId === filterSupplier;

      // Status filter
      const statusMatch = !filterStatus || item.status === filterStatus;

      return searchMatch && supplierMatch && statusMatch;
    });
  }, [intakes, search, filterSupplier, filterStatus, offerToSupplierMap]);

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Page Title & Button */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Title order={1} style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-primary, #1e5b3a)' }}>
              Penerimaan Bahan Baku (Intake)
            </Title>
            <Text c="dimmed">Catat, cari, dan pantau logistik kedatangan bahan baku yang dikirim oleh pemasok</Text>
          </div>
          <Button
            leftSection={<IconPlus size={16} />}
            color="emerald"
            onClick={handleOpenModal}
            style={{ backgroundColor: '#1e5b3a' }}
          >
            Tambah Penerimaan
          </Button>
        </Group>

        {/* Filters */}
        <Paper p="md" radius="md" withBorder>
          <Group gap="md" wrap="wrap">
            <TextInput
              placeholder="Cari No. Intake, Bahan, atau Batch..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ minWidth: 260 }}
            />
            <Select
              placeholder="Filter Pemasok"
              clearable
              value={filterSupplier}
              onChange={setFilterSupplier}
              data={suppliers.map(s => ({ value: s.id, label: s.name }))}
              style={{ minWidth: 200 }}
            />
            <Select
              placeholder="Filter Status QC"
              clearable
              value={filterStatus}
              onChange={setFilterStatus}
              data={[
                { value: 'PENDING_QC', label: 'Pending QC' },
                { value: 'QC_ACCEPTED', label: 'Lolos QC' },
                { value: 'QC_REJECTED', label: 'Ditolak QC' },
              ]}
              style={{ minWidth: 160 }}
            />
          </Group>
        </Paper>

        {/* Table list */}
        <Paper p="md" radius="md" withBorder>
          {loading ? (
            <Stack align="center" py="xl">
              <Loader size="md" color="emerald" />
              <Text size="sm" c="dimmed">Memuat daftar penerimaan...</Text>
            </Stack>
          ) : filteredIntakes.length === 0 ? (
            <Stack align="center" py="xl">
              <Text size="sm" c="dimmed">Tidak ada transaksi penerimaan bahan baku ditemukan.</Text>
            </Stack>
          ) : (
            <Table.ScrollContainer minWidth={800}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>No. Penerimaan</Table.Th>
                    <Table.Th>Nama Bahan</Table.Th>
                    <Table.Th>No. Batch</Table.Th>
                    <Table.Th>Pemasok</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Jumlah</Table.Th>
                    <Table.Th>Tanggal Datang</Table.Th>
                    <Table.Th>Status QC</Table.Th>
                    <Table.Th style={{ width: 80 }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredIntakes.map((item) => {
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
                          <Text size="sm" fw={600}>{item.material_name}</Text>
                          <Text size="xxs" c="dimmed">{item.category || 'Essential Oil'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs">{item.batch_code}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" fw={500}>{getSupplierName(item)}</Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text size="sm" fw={700}>{item.weight_kg} {item.unit || 'kg'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs">
                            {new Date(item.received_at).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={badgeColor} variant="light" size="sm">
                            {badgeText}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Button
                            component={Link}
                            href={`/dashboard/raw-materials/intake/${item.id}`}
                            variant="subtle"
                            color="emerald"
                            p={4}
                          >
                            <IconEye size={18} />
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Paper>
      </Stack>

      {/* Create Modal */}
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Catat Penerimaan Bahan Baku Baru"
        size="lg"
        radius="md"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Group grow>
              <TextInput
                label="Nomor Penerimaan"
                value={formIntakeNumber}
                readOnly
                disabled
                required
              />
              <Select
                label="Lokasi Gudang Penyimpanan"
                placeholder="Pilih Gudang"
                data={warehouses.map(w => ({ value: w.id, label: `${w.name} (${w.code})` }))}
                value={formWarehouseId}
                onChange={(val) => setFormWarehouseId(val || '')}
                required
              />
            </Group>

            <Select
              label="Pemasok (Supplier)"
              placeholder="Pilih Pemasok"
              searchable
              data={suppliers.filter(s => s.status !== 'INACTIVE').map(s => ({ value: s.id, label: s.name }))}
              value={formSupplierId}
              onChange={(val) => {
                setFormSupplierId(val || '');
                setFormOfferId('');
              }}
              required
            />

            <Select
              label="Bahan Baku Ditawarkan"
              placeholder={formSupplierId ? "Pilih Bahan" : "Pilih Pemasok Terlebih Dahulu"}
              disabled={!formSupplierId}
              data={filteredOffers}
              value={formOfferId}
              onChange={handleOfferChange}
              required
            />

            <Group grow>
              <TextInput
                label="Nomor Batch Pemasok"
                placeholder="Contoh: RM-LAV-2026"
                value={formBatchCode}
                onChange={(e) => setFormBatchCode(e.currentTarget.value)}
                required
              />
              <TextInput
                label="Kategori Bahan"
                value={formCategory}
                onChange={(e) => setFormCategory(e.currentTarget.value)}
                required
              />
            </Group>

            <Group grow>
              <NumberInput
                label="Jumlah (Volume)"
                min={0.1}
                decimalScale={2}
                value={formWeightKg}
                onChange={handleWeightChange}
                required
              />
              <Select
                label="Satuan"
                data={['kg', 'liter', 'gram']}
                value={formUnit}
                onChange={(val) => setFormUnit(val || 'kg')}
                required
              />
            </Group>

            <Group grow>
              <DateInput
                label="Tanggal Penerimaan"
                placeholder="Pilih Tanggal"
                value={formReceivedAt}
                onChange={setFormReceivedAt}
                leftSection={<IconCalendar size={16} />}
                required
              />
              <DateInput
                label="Tanggal Kedaluwarsa"
                placeholder="Pilih Tanggal"
                value={formExpiredDate}
                onChange={setFormExpiredDate}
                leftSection={<IconCalendar size={16} />}
              />
            </Group>

            <Textarea
              label="Catatan Kondisi Fisik / Cargo"
              placeholder="Masukkan catatan kedatangan (misalnya: kemasan segel aman, suhu cargo 18 derajat celcius...)"
              value={formNotes}
              onChange={(e) => setFormNotes(e.currentTarget.value)}
              minRows={3}
            />

            <Divider my="xs" />

            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" c="dimmed">ESTIMASI TOTAL BIAYA</Text>
                <Text size="lg" fw={800} c="var(--ds-primary, #1e5b3a)">
                  Rp {formTotalPrice.toLocaleString('id-ID')}
                </Text>
              </div>
              <Group>
                <Button variant="outline" color="gray" onClick={() => setOpened(false)}>Batal</Button>
                <Button type="submit" color="emerald" loading={submitting} style={{ backgroundColor: '#1e5b3a' }}>
                  Simpan Penerimaan
                </Button>
              </Group>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
