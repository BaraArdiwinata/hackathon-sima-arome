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
  SimpleGrid,
  Select,
  Slider,
  Divider,
  Card,
} from '@mantine/core';
import {
  IconAward,
  IconCheck,
  IconAlertTriangle,
  IconScale,
  IconListNumbers,
  IconUsers,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { daasAPI } from '@/lib/buildpad/hooks/api';
import type { Supplier, RawMaterial, Offer } from '@/types/sima-arome';
import { calculateAHPWeights, calculateSupplierScore, getRecommendation, type SupplierScoreInput } from '@/lib/ahpEngine';
import { notifications } from '@mantine/notifications';

// Available options for pairwise comparison (Saaty scale)
const COMPARISON_OPTIONS = [
  { value: '9', label: '9 - Mutlak Lebih Penting' },
  { value: '7', label: '7 - Sangat Kuat Lebih Penting' },
  { value: '5', label: '5 - Kuat Lebih Penting' },
  { value: '3', label: '3 - Sedikit Lebih Penting' },
  { value: '1', label: '1 - Sama Pentingnya' },
  { value: '0.333', label: '1/3 - Sedikit Kurang Penting' },
  { value: '0.2', label: '1/5 - Kuat Kurang Penting' },
  { value: '0.143', label: '1/7 - Sangat Kuat Kurang Penting' },
  { value: '0.111', label: '1/9 - Mutlak Kurang Penting' },
];

export default function SupplierEvaluationPage() {
  useSetModuleTitle('Evaluasi Pemasok (AHP)');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  // 1. AHP Comparison Matrix State (5x5)
  // Row/Col index mappings:
  // 0: Kualitas Produk, 1: Akurasi Pengiriman, 2: Ketepatan Waktu, 3: Daya Saing Harga, 4: Responsivitas Layanan
  const [matrix, setMatrix] = useState<number[][]>([
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
  ]);

  // 2. Qualitative Supplier Scores (Prices and Service) that users can adjust
  const [supplierQualitativeRatings, setSupplierQualitativeRatings] = useState<Record<string, { price: number; service: number }>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [supData, rmData, offersData] = await Promise.all([
        daasAPI.getItems<Supplier>('suppliers'),
        daasAPI.getItems<RawMaterial>('raw_materials'),
        daasAPI.getItems<Offer>('offers'),
      ]);

      const activeSuppliers = (Array.isArray(supData) ? supData : []).filter(s => s.status !== 'INACTIVE');
      setSuppliers(activeSuppliers);
      setRawMaterials(Array.isArray(rmData) ? rmData : []);
      setOffers(Array.isArray(offersData) ? offersData : []);

      // Initialize qualitative sliders for each supplier
      const initRatings: Record<string, { price: number; service: number }> = {};
      activeSuppliers.forEach(sup => {
        initRatings[sup.id] = {
          price: 80, // Default good starting score
          service: sup.favorite ? 90 : 75,
        };
      });
      setSupplierQualitativeRatings(initRatings);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data evaluasi pemasok. Silakan segarkan halaman.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle cell modification in comparison matrix
  const handleMatrixCellChange = (r: number, c: number, valueStr: string | null) => {
    if (!valueStr) return;
    const value = parseFloat(valueStr);
    
    setMatrix(prev => {
      const next = prev.map(row => [...row]);
      next[r][c] = value;
      // Reciprocal cell is set automatically
      next[c][r] = 1 / value;
      return next;
    });
  };

  // 3. Compute AHP Weights and Consistency
  const ahpResult = React.useMemo(() => {
    try {
      return calculateAHPWeights(matrix);
    } catch (err) {
      console.error('AHP Weight calculation error:', err);
      return {
        weights: [0.2, 0.2, 0.2, 0.2, 0.2],
        consistencyRatio: 0,
        isConsistent: true,
        lambdaMax: 5,
      };
    }
  }, [matrix]);

  // 4. Map supplier-offer lookups
  const offerToSupplierMap = React.useMemo(() => {
    const map = new Map<string, string>();
    offers.forEach(o => map.set(o.id, o.supplier_id));
    return map;
  }, [offers]);

  // Handle Qualitative Slider Adjustments
  const handleRatingChange = (supId: string, key: 'price' | 'service', val: number) => {
    setSupplierQualitativeRatings(prev => ({
      ...prev,
      [supId]: {
        ...prev[supId],
        [key]: val,
      }
    }));
  };

  // 5. Final Dynamic AHP Supplier Rankings
  const rankedSuppliers = React.useMemo(() => {
    return suppliers
      .map(sup => {
        // Query cargo deliveries
        const deliveries = rawMaterials.filter(item => {
          if (item.supplier_id === sup.id) return true;
          if (item.offer_id && offerToSupplierMap.get(item.offer_id) === sup.id) return true;
          return false;
        });

        const totalDeliveries = deliveries.length;
        const accepted = deliveries.filter(item => item.status === 'QC_ACCEPTED' || item.status === 'IN_PRODUCTION').length;
        const rejected = deliveries.filter(item => item.status === 'QC_REJECTED').length;

        // C1: Product Quality (0-100)
        const qualityScore = totalDeliveries > 0 ? (accepted / totalDeliveries) * 100 : 100;
        
        // C2: Delivery Accuracy (0-100)
        const accuracyScore = totalDeliveries > 0 ? Math.max(0, 100 - (rejected / totalDeliveries) * 50) : 100;
        
        // C3: Delivery Timeliness (0-100) based on offers lead time average
        const supOffers = offers.filter(o => o.supplier_id === sup.id);
        const avgLeadTime = supOffers.length > 0 ? supOffers.reduce((sum, o) => sum + o.lead_time, 0) / supOffers.length : 5;
        const timelinessScore = Math.max(40, 100 - avgLeadTime * 5);

        // C4 & C5: Price and Service ratings from sliders
        const ratings = supplierQualitativeRatings[sup.id] || { price: 80, service: 75 };

        const scores: SupplierScoreInput = {
          productQuality: qualityScore,
          deliveryAccuracy: accuracyScore,
          deliveryTimeliness: timelinessScore,
          priceCompetitiveness: ratings.price,
          serviceResponsiveness: ratings.service,
        };

        const finalScore = calculateSupplierScore(scores, ahpResult.weights);

        return {
          id: sup.id,
          name: sup.name,
          code: sup.code || 'N/A',
          scores,
          finalScore,
          recommendation: getRecommendation(finalScore),
        };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [suppliers, rawMaterials, offers, offerToSupplierMap, supplierQualitativeRatings, ahpResult.weights]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" justify="center" style={{ minHeight: '60vh' }}>
          <Loader size="xl" color="emerald" />
          <Text c="dimmed">Menginisialisasi worksheet perhitungan AHP...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Title */}
        <div>
          <Title order={1} style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-primary, #1e5b3a)' }}>
            Lembar Evaluasi Kinerja Pemasok (AHP)
          </Title>
          <Text c="dimmed">
            Gunakan metode ilmiah *Analytic Hierarchy Process* (AHP) untuk menentukan prioritas kriteria dan peringkat pemasok terbaik
          </Text>
        </div>

        {error && <Alert color="red">{error}</Alert>}

        <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
          
          {/* Column Left: Comparison Matrix & Weights (Spans 2 cols on desktop) */}
          <Stack gap="lg" style={{ gridColumn: 'span 2' }}>
            {/* Matrix Card */}
            <Paper p="xl" radius="md" withBorder>
              <Group gap="xs" mb="sm">
                <IconScale size={20} color="#1e5b3a" />
                <Title order={3} style={{ fontFamily: 'var(--ds-font-display)', color: '#1e5b3a' }}>
                  Matriks Perbandingan Berpasangan Kriteria
                </Title>
              </Group>
              <Text size="xs" c="dimmed" mb="lg">
                Pilih bobot nilai kepentingan komparatif baris dibanding kolom (1: Sama, 3: Sedikit, 5: Kuat, 7: Sangat Kuat, 9: Mutlak)
              </Text>

              <Table.ScrollContainer minWidth={600}>
                <Table withTableBorder withColumnBorders verticalSpacing="xs">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ width: 120 }}>Kriteria</Table.Th>
                      <Table.Th style={{ fontSize: 11, textAlign: 'center' }}>Kualitas (C1)</Table.Th>
                      <Table.Th style={{ fontSize: 11, textAlign: 'center' }}>Akurasi (C2)</Table.Th>
                      <Table.Th style={{ fontSize: 11, textAlign: 'center' }}>Ketepatan (C3)</Table.Th>
                      <Table.Th style={{ fontSize: 11, textAlign: 'center' }}>Harga (C4)</Table.Th>
                      <Table.Th style={{ fontSize: 11, textAlign: 'center' }}>Layanan (C5)</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {matrix.map((rowArr, rIdx) => {
                      const criteriaLabels = [
                        'Kualitas (C1)',
                        'Akurasi (C2)',
                        'Ketepatan (C3)',
                        'Harga (C4)',
                        'Layanan (C5)',
                      ];

                      return (
                        <Table.Tr key={rIdx}>
                          <Table.Td style={{ fontWeight: 700, fontSize: 11 }}>{criteriaLabels[rIdx]}</Table.Td>
                          {rowArr.map((val, cIdx) => {
                            // Diagonal cells are locked at 1
                            if (rIdx === cIdx) {
                              return (
                                <Table.Td key={cIdx} style={{ backgroundColor: '#f8f9fa', textAlign: 'center', fontWeight: 'bold' }}>
                                  1
                                </Table.Td>
                              );
                            }

                            // Lower-left triangle is display only (reciprocals)
                            if (rIdx > cIdx) {
                              const reciprocalVal = val < 1 ? `1/${Math.round(1 / val)}` : `${Math.round(val)}`;
                              return (
                                <Table.Td key={cIdx} style={{ backgroundColor: '#f8f9fa', textAlign: 'center', fontSize: 11, color: '#868e96' }}>
                                  {val < 1 ? reciprocalVal : val.toFixed(2)}
                                </Table.Td>
                              );
                            }

                            // Upper-right triangle is select editable
                            return (
                              <Table.Td key={cIdx} p="2">
                                <Select
                                  value={String(matrix[rIdx][cIdx])}
                                  onChange={(v) => handleMatrixCellChange(rIdx, cIdx, v)}
                                  data={COMPARISON_OPTIONS}
                                  size="xs"
                                  variant="unstyled"
                                  styles={{
                                    input: {
                                      textAlign: 'center',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      color: '#1e5b3a',
                                      backgroundColor: '#ebf7f0',
                                      borderRadius: '4px',
                                      height: '28px'
                                    }
                                  }}
                                />
                              </Table.Td>
                            );
                          })}
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Paper>

            {/* Weights Results Card */}
            <Paper p="xl" radius="md" withBorder>
              <Title order={3} mb="md" style={{ fontFamily: 'var(--ds-font-display)', color: '#1e5b3a' }}>
                Hasil Bobot Keputusan Prioritas Kriteria
              </Title>
              <Divider mb="lg" />

              <Stack gap="md">
                {(() => {
                  const labels = [
                    'Kualitas Produk (Product Quality - C1)',
                    'Akurasi Pengiriman (Delivery Accuracy - C2)',
                    'Ketepatan Waktu Pengiriman (Delivery Timeliness - C3)',
                    'Daya Saing Harga (Price Competitiveness - C4)',
                    'Responsivitas Layanan (Service Responsiveness - C5)',
                  ];

                  return labels.map((lbl, idx) => {
                    const weightPct = Math.round(ahpResult.weights[idx] * 100);
                    return (
                      <div key={idx}>
                        <Group justify="space-between" mb="3">
                          <Text size="xs" fw={700} c="var(--ds-gray-700)">{lbl}</Text>
                          <Text size="xs" fw={800} c="#1e5b3a">{weightPct}%</Text>
                        </Group>
                        <div style={{ height: 10, width: '100%', backgroundColor: '#e9ecef', borderRadius: 5, overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              width: `${weightPct}%`, 
                              backgroundColor: '#1e5b3a',
                              transition: 'width 0.5s ease'
                            }} 
                          />
                        </div>
                      </div>
                    );
                  });
                })()}

                {/* Consistency Ratio Audit Alert */}
                {ahpResult.isConsistent ? (
                  <Alert icon={<IconCheck size={16} />} title="Perbandingan Konsisten" color="teal">
                    Matriks Perbandingan Berpasangan Anda memiliki rasio konsistensi yang valid (CR = {ahpResult.consistencyRatio.toFixed(3)} &lt; 0.1). Keputusan prioritas siap digunakan.
                  </Alert>
                ) : (
                  <Alert icon={<IconAlertTriangle size={16} />} title="Perbandingan Tidak Konsisten!" color="orange">
                    Matriks memiliki tingkat inkonsistensi yang melebihi batas aman (CR = {ahpResult.consistencyRatio.toFixed(3)} &ge; 0.1). Mohon sesuaikan kembali beberapa perbandingan kriteria agar hasil keputusan lebih logis dan konsisten.
                  </Alert>
                )}
              </Stack>
            </Paper>
          </Stack>

          {/* Column Right: Supplier Sliders (Price & Service) - 1 col width */}
          <Paper p="xl" radius="md" withBorder style={{ height: 'fit-content' }}>
            <Group gap="xs" mb="sm">
              <IconUsers size={20} color="#1e5b3a" />
              <Title order={3} style={{ fontFamily: 'var(--ds-font-display)', color: '#1e5b3a' }}>
                Penilaian Kualitatif Pemasok
              </Title>
            </Group>
            <Text size="xs" c="dimmed" mb="lg">
              Kualitas (C1) dan Ketepatan (C2, C3) dihitung otomatis oleh sistem. Sesuaikan peringkat Harga (C4) dan Layanan (C5) pemasok berikut:
            </Text>

            <Stack gap="xl">
              {suppliers.map(sup => {
                const ratings = supplierQualitativeRatings[sup.id] || { price: 80, service: 75 };
                return (
                  <Card key={sup.id} p="sm" withBorder radius="sm">
                    <Text size="sm" fw={700} c="var(--ds-primary)" mb="xs">{sup.name}</Text>
                    
                    {/* Price Slider */}
                    <div style={{ marginBottom: 12 }}>
                      <Group justify="space-between" mb={2}>
                        <Text size="xxs" fw={700} c="dimmed">DAYA SAING HARGA (C4)</Text>
                        <Text size="xxs" fw={700} c="blue">{ratings.price}/100</Text>
                      </Group>
                      <Slider
                        size="sm"
                        color="blue"
                        value={ratings.price}
                        onChange={(val) => handleRatingChange(sup.id, 'price', val)}
                        styles={{ thumb: { borderWidth: 1 } }}
                      />
                    </div>

                    {/* Service Slider */}
                    <div>
                      <Group justify="space-between" mb={2}>
                        <Text size="xxs" fw={700} c="dimmed">RESPONSIVITAS PIC (C5)</Text>
                        <Text size="xxs" fw={700} c="teal">{ratings.service}/100</Text>
                      </Group>
                      <Slider
                        size="sm"
                        color="teal"
                        value={ratings.service}
                        onChange={(val) => handleRatingChange(sup.id, 'service', val)}
                        styles={{ thumb: { borderWidth: 1 } }}
                      />
                    </div>
                  </Card>
                );
              })}
            </Stack>
          </Paper>
        </SimpleGrid>

        {/* Dynamic AHP Supplier Rankings Output Table */}
        <Paper p="xl" radius="md" withBorder>
          <Group gap="xs" mb="sm">
            <IconListNumbers size={20} color="#1e5b3a" />
            <Title order={3} style={{ fontFamily: 'var(--ds-font-display)', color: '#1e5b3a' }}>
              Hasil Rekomendasi Peringkat Kinerja Pemasok
            </Title>
          </Group>
          <Text size="xs" c="dimmed" mb="lg">
            Hasil perangkingan ilmiah dihitung dari perkalian silang bobot kriteria dengan performa logistik database dan penilaian kualitatif Anda
          </Text>

          <Table.ScrollContainer minWidth={800}>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 80 }}>Peringkat</Table.Th>
                  <Table.Th>Pemasok</Table.Th>
                  <Table.Th style={{ fontSize: 11, textAlign: 'center' }}>Kualitas (C1)</Table.Th>
                  <Table.Th style={{ fontSize: 11, textAlign: 'center' }}>Akurasi (C2)</Table.Th>
                  <Table.Th style={{ fontSize: 11, textAlign: 'center' }}>Timeliness (C3)</Table.Th>
                  <Table.Th style={{ fontSize: 11, textAlign: 'center' }}>Harga (C4)</Table.Th>
                  <Table.Th style={{ fontSize: 11, textAlign: 'center' }}>Layanan (C5)</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Skor AHP</Table.Th>
                  <Table.Th>Rekomendasi</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rankedSuppliers.map((sup) => {
                  let recColor = 'gray';
                  let recText = 'Tertunda';
                  if (sup.recommendation === 'Excellent Supplier') {
                    recColor = 'green';
                    recText = 'Sangat Baik (Pemasok Utama)';
                  } else if (sup.recommendation === 'Good Supplier') {
                    recColor = 'blue';
                    recText = 'Baik (Pemasok Cadangan)';
                  } else {
                    recColor = 'orange';
                    recText = 'Butuh Rapor Evaluasi';
                  }

                  return (
                    <Table.Tr key={sup.id} style={{ backgroundColor: sup.rank === 1 ? '#f4faf6' : 'transparent' }}>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Box style={{ 
                          width: 28, 
                          height: 28, 
                          borderRadius: '50%', 
                          backgroundColor: sup.rank === 1 ? '#1e5b3a' : '#e9ecef', 
                          color: sup.rank === 1 ? '#ffffff' : '#495057',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: 12
                        }}>
                          {sup.rank}
                        </Box>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={700}>{sup.name}</Text>
                        <Text size="xxs" c="dimmed">{sup.code}</Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center', fontSize: 11 }}>{Math.round(sup.scores.productQuality)}%</Table.Td>
                      <Table.Td style={{ textAlign: 'center', fontSize: 11 }}>{Math.round(sup.scores.deliveryAccuracy)}%</Table.Td>
                      <Table.Td style={{ textAlign: 'center', fontSize: 11 }}>{Math.round(sup.scores.deliveryTimeliness)}%</Table.Td>
                      <Table.Td style={{ textAlign: 'center', fontSize: 11 }}>{Math.round(sup.scores.priceCompetitiveness)}%</Table.Td>
                      <Table.Td style={{ textAlign: 'center', fontSize: 11 }}>{Math.round(sup.scores.serviceResponsiveness)}%</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="md" fw={800} c="#1e5b3a">{Math.round(sup.finalScore)}%</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={recColor} variant="light" size="sm">
                          {recText}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      </Stack>
    </Container>
  );
}

// Minimal Box placeholder for local usage
function Box({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={style}>{children}</div>;
}
