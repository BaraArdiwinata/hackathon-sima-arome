'use client';

import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Group,
  Table,
  Badge,
  Button,
  Loader,
  Alert,
  ThemeIcon,
} from '@mantine/core';
import {
  IconBuildingFactory,
  IconPackageImport,
  IconScale,
  IconHourglassLow,
  IconCheck,
  IconX,
  IconTrendingUp,
  IconAward,
  IconRefresh,
} from '@tabler/icons-react';
import { useSetModuleTitle } from '@/lib/hooks/useSetModuleTitle';
import { daasAPI } from '@/lib/buildpad/hooks/api';
import type { RawMaterial, Supplier, Offer } from '@/types/sima-arome';
import { calculateSupplierScore, getRecommendation } from '@/lib/ahpEngine';

export default function RawMaterialsDashboardPage() {
  useSetModuleTitle('Dashboard Analitik');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch collections via server-side proxy
      const [suppliersData, rawMaterialsData, offersData] = await Promise.all([
        daasAPI.getItems<Supplier>('suppliers'),
        daasAPI.getItems<RawMaterial>('raw_materials'),
        daasAPI.getItems<Offer>('offers'),
      ]);

      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
      setRawMaterials(Array.isArray(rawMaterialsData) ? rawMaterialsData : []);
      setOffers(Array.isArray(offersData) ? offersData : []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Gagal memuat data analitik pengadaan. Silakan segarkan halaman.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 1. Calculate Core KPIs
  const totalSuppliersCount = suppliers.length;
  const totalIntakeCount = rawMaterials.length;
  const totalIncomingQuantity = rawMaterials.reduce((sum, item) => sum + Number(item.weight_kg || 0), 0);

  const pendingQcCount = rawMaterials.filter(item => item.status === 'PENDING_QC').length;
  const acceptedQcCount = rawMaterials.filter(item => item.status === 'QC_ACCEPTED' || item.status === 'IN_PRODUCTION').length;
  const rejectedQcCount = rawMaterials.filter(item => item.status === 'QC_REJECTED').length;

  // 2. Resolve Supplier Names for recent intakes
  const supplierMap = React.useMemo(() => {
    const map = new Map<string, string>();
    suppliers.forEach(s => map.set(s.id, s.name));
    return map;
  }, [suppliers]);

  // If supplier_id is null/missing but offer_id is populated, resolve through offers table
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

  // Recent Intakes (Latest 5 items)
  const recentIntakes = React.useMemo(() => {
    return [...rawMaterials]
      .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
      .slice(0, 5);
  }, [rawMaterials]);

  // 3. Dynamic AHP Supplier Rankings
  // We use a balanced standard weight vector: Quality=0.40, Accuracy=0.20, Timeliness=0.15, Price=0.15, Service=0.10
  const ahpWeights = [0.40, 0.20, 0.15, 0.15, 0.10];
  const rankedSuppliers = React.useMemo(() => {
    return suppliers
      .map(sup => {
        // Filter deliveries from this supplier
        const deliveries = rawMaterials.filter(item => {
          if (item.supplier_id === sup.id) return true;
          if (item.offer_id && offerToSupplierMap.get(item.offer_id) === sup.id) return true;
          return false;
        });

        const totalDeliveries = deliveries.length;
        const accepted = deliveries.filter(item => item.status === 'QC_ACCEPTED' || item.status === 'IN_PRODUCTION').length;
        const rejected = deliveries.filter(item => item.status === 'QC_REJECTED').length;

        // Product Quality ratio (0-100)
        const qualityScore = totalDeliveries > 0 ? (accepted / totalDeliveries) * 100 : 100;
        
        // Mock accuracy & timeliness metrics based on rejection and offer profiles
        const accuracyScore = totalDeliveries > 0 ? Math.max(0, 100 - (rejected / totalDeliveries) * 50) : 100;
        
        const supOffers = offers.filter(o => o.supplier_id === sup.id);
        const avgLeadTime = supOffers.length > 0 ? supOffers.reduce((sum, o) => sum + o.lead_time, 0) / supOffers.length : 5;
        const timelinessScore = Math.max(40, 100 - avgLeadTime * 5); // Faster is better

        // Calculate Price Competitiveness relative to global average
        const avgPrice = supOffers.length > 0 ? supOffers.reduce((sum, o) => sum + Number(o.price), 0) / supOffers.length : 1500000;
        const priceScore = avgPrice < 1200000 ? 95 : avgPrice < 2000000 ? 80 : 60;

        // Service is simulated or default
        const serviceScore = sup.favorite ? 90 : 75;

        const scores = {
          productQuality: qualityScore,
          deliveryAccuracy: accuracyScore,
          deliveryTimeliness: timelinessScore,
          priceCompetitiveness: priceScore,
          serviceResponsiveness: serviceScore,
        };

        const finalScore = calculateSupplierScore(scores, ahpWeights);

        return {
          id: sup.id,
          name: sup.name,
          code: sup.code || `SUP-${sup.id.substring(0, 4).toUpperCase()}`,
          finalScore,
          recommendation: getRecommendation(finalScore),
        };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 5);
  }, [suppliers, rawMaterials, offers, offerToSupplierMap]);

  // 4. Custom SVG Charting
  // 4a. Trend Data prep (last 7 days of received raw materials)
  const trendChartPoints = React.useMemo(() => {
    if (rawMaterials.length === 0) return [];
    
    // Group quantities by last 7 days
    const dailyMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      dailyMap[dateStr] = 0;
    }

    rawMaterials.forEach(item => {
      const dateStr = new Date(item.received_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      if (dailyMap[dateStr] !== undefined) {
        dailyMap[dateStr] += Number(item.weight_kg || 0);
      }
    });

    return Object.entries(dailyMap).map(([date, qty]) => ({ label: date, value: qty }));
  }, [rawMaterials]);

  const maxTrendValue = Math.max(...trendChartPoints.map(p => p.value), 100);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" justify="center" style={{ minHeight: '60vh' }}>
          <Loader size="xl" variant="bars" color="emerald" />
          <Text c="dimmed">Memuat analisa data pengadaan bahan baku...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Title order={1} style={{ fontFamily: 'var(--ds-font-display, inherit)', color: 'var(--ds-primary, #1e5b3a)', fontWeight: 700 }}>
              Dashboard Pengadaan & Bahan Baku
            </Title>
            <Text c="dimmed">Pemantauan penerimaan bahan baku, status laboratorium QC, dan peringkat kinerja pemasok (AHP)</Text>
          </div>
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="outline"
            color="emerald"
            onClick={fetchData}
            style={{ borderColor: '#1e5b3a', color: '#1e5b3a' }}
          >
            Segarkan Data
          </Button>
        </Group>

        {error && (
          <Alert icon={<IconRefresh size={16} />} title="Perhatian" color="red" variant="filled">
            {error}
          </Alert>
        )}

        {/* KPI Grid */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 6 }} spacing="md">
          {/* Card 1: Total Suppliers */}
          <Paper p="md" radius="md" withBorder style={{ borderTop: '4px solid #1e5b3a' }}>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap="xs">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Pemasok</Text>
                <Title order={2} style={{ color: '#1e5b3a' }}>{totalSuppliersCount}</Title>
                <Text size="xxs" c="dimmed">Mitra aktif terdaftar</Text>
              </Stack>
              <ThemeIcon size="lg" radius="sm" variant="light" color="emerald">
                <IconBuildingFactory size={20} />
              </ThemeIcon>
            </Group>
          </Paper>

          {/* Card 2: Total Intake */}
          <Paper p="md" radius="md" withBorder style={{ borderTop: '4px solid #3b5bdb' }}>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap="xs">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Penerimaan</Text>
                <Title order={2} style={{ color: '#3b5bdb' }}>{totalIntakeCount}</Title>
                <Text size="xxs" c="dimmed">Transaksi tercatat</Text>
              </Stack>
              <ThemeIcon size="lg" radius="sm" variant="light" color="blue">
                <IconPackageImport size={20} />
              </ThemeIcon>
            </Group>
          </Paper>

          {/* Card 3: Total Quantity */}
          <Paper p="md" radius="md" withBorder style={{ borderTop: '4px solid #e67700' }}>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap="xs">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Total Bahan (Kg)</Text>
                <Title order={2} style={{ color: '#e67700' }}>{Math.round(totalIncomingQuantity).toLocaleString('id-ID')}</Title>
                <Text size="xxs" c="dimmed">Volume masuk keseluruhan</Text>
              </Stack>
              <ThemeIcon size="lg" radius="sm" variant="light" color="orange">
                <IconScale size={20} />
              </ThemeIcon>
            </Group>
          </Paper>

          {/* Card 4: Pending QC */}
          <Paper p="md" radius="md" withBorder style={{ borderTop: '4px solid #cc5de8' }}>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap="xs">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Pending QC</Text>
                <Title order={2} style={{ color: '#cc5de8' }}>{pendingQcCount}</Title>
                <Text size="xxs" c="dimmed">Menunggu inspeksi</Text>
              </Stack>
              <ThemeIcon size="lg" radius="sm" variant="light" color="grape">
                <IconHourglassLow size={20} />
              </ThemeIcon>
            </Group>
          </Paper>

          {/* Card 5: Accepted QC */}
          <Paper p="md" radius="md" withBorder style={{ borderTop: '4px solid #0ca678' }}>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap="xs">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Lolos QC</Text>
                <Title order={2} style={{ color: '#0ca678' }}>{acceptedQcCount}</Title>
                <Text size="xxs" c="dimmed">Siap digunakan produksi</Text>
              </Stack>
              <ThemeIcon size="lg" radius="sm" variant="light" color="teal">
                <IconCheck size={20} />
              </ThemeIcon>
            </Group>
          </Paper>

          {/* Card 6: Rejected QC */}
          <Paper p="md" radius="md" withBorder style={{ borderTop: '4px solid #f03e3e' }}>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap="xs">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Ditolak QC</Text>
                <Title order={2} style={{ color: '#f03e3e' }}>{rejectedQcCount}</Title>
                <Text size="xxs" c="dimmed">Karantina / Dikembalikan</Text>
              </Stack>
              <ThemeIcon size="lg" radius="sm" variant="light" color="red">
                <IconX size={20} />
              </ThemeIcon>
            </Group>
          </Paper>
        </SimpleGrid>

        {/* Charts & KPI Leaderboard Section */}
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
          {/* Chart 1: SVG Trend Volume (2 cols width on large screens) */}
          <Paper p="xl" radius="md" withBorder style={{ gridColumn: 'span 2' }}>
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Title order={3} size="h4" style={{ fontFamily: 'var(--ds-font-display, inherit)', color: '#1e5b3a' }}>
                    Tren Volume Bahan Masuk (7 Hari Terakhir)
                  </Title>
                  <Text size="xs" c="dimmed">Akumulasi volume berat bahan baku yang diterima per hari (dalam Kilogram)</Text>
                </div>
                <Group gap="xs">
                  <IconTrendingUp size={16} color="#1e5b3a" />
                  <Text size="xs" fw={700} c="emerald">Real-time SCM</Text>
                </Group>
              </Group>

              {trendChartPoints.length === 0 ? (
                <Stack align="center" justify="center" h={250}>
                  <Text c="dimmed" size="sm">Belum ada rekaman penerimaan bahan.</Text>
                </Stack>
              ) : (
                <div style={{ width: '100%', height: 260, position: 'relative', marginTop: 10 }}>
                  <svg viewBox="0 0 500 220" width="100%" height="100%" style={{ overflow: 'visible' }}>
                    {/* SVG Grids */}
                    <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f3f5" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="40" y1="80" x2="480" y2="80" stroke="#f1f3f5" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="40" y1="140" x2="480" y2="140" stroke="#f1f3f5" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="40" y1="200" x2="480" y2="200" stroke="#dee2e6" strokeWidth="1" />

                    {/* Generate SVG Path Points */}
                    {(() => {
                      const points = trendChartPoints.map((p, i) => {
                        const x = 40 + (i * 440) / 6;
                        const y = 200 - (p.value / maxTrendValue) * 160;
                        return { x, y };
                      });

                      const pathData = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
                      const areaData = `${pathData} L ${points[points.length - 1].x} 200 L ${points[0].x} 200 Z`;

                      return (
                        <>
                          {/* Gradient Fill */}
                          <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#1e5b3a" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#1e5b3a" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Area */}
                          <path d={areaData} fill="url(#chartGradient)" />

                          {/* Line */}
                          <path d={pathData} fill="none" stroke="#1e5b3a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                          {/* Data Circles & Tooltips */}
                          {points.map((p, idx) => (
                            <g key={idx}>
                              <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke="#1e5b3a" strokeWidth="2.5" />
                              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1e5b3a">
                                {trendChartPoints[idx].value > 0 ? `${Math.round(trendChartPoints[idx].value)}` : ''}
                              </text>
                              {/* X Axis Labels */}
                              <text x={p.x} y="215" textAnchor="middle" fontSize="9" fill="#868e96">
                                {trendChartPoints[idx].label}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              )}
            </Stack>
          </Paper>

          {/* Chart 2: SVG Donut QC Status */}
          <Paper p="xl" radius="md" withBorder>
            <Stack gap="md" align="stretch">
              <div>
                <Title order={3} size="h4" style={{ fontFamily: 'var(--ds-font-display, inherit)', color: '#1e5b3a' }}>
                  Distribusi Kualitas (QC)
                </Title>
                <Text size="xs" c="dimmed">Rasio persentase status kelayakan dari semua batch bahan baku</Text>
              </div>

              {totalIntakeCount === 0 ? (
                <Stack align="center" justify="center" h={230}>
                  <Text c="dimmed" size="sm">Belum ada data pemeriksaan QC.</Text>
                </Stack>
              ) : (
                <Group justify="space-around" h={230} align="center">
                  <div style={{ position: 'relative', width: 140, height: 140 }}>
                    <svg viewBox="0 0 36 36" width="100%" height="100%">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e9ecef" strokeWidth="3.5" />
                      {(() => {
                        const pPending = (pendingQcCount / totalIntakeCount) * 100;
                        const pAccepted = (acceptedQcCount / totalIntakeCount) * 100;
                        const pRejected = (rejectedQcCount / totalIntakeCount) * 100;

                        const offset1 = 100 - pAccepted + 25;
                        const offset2 = 100 - pAccepted - pPending + 25;
                        const offset3 = 25;

                        return (
                          <>
                            {/* Lolos QC (Teal/Green) */}
                            {pAccepted > 0 && (
                              <circle 
                                cx="18" cy="18" r="15.915" 
                                fill="none" stroke="#0ca678" 
                                strokeWidth="3.6" 
                                strokeDasharray={`${pAccepted} ${100 - pAccepted}`} 
                                strokeDashoffset={offset3}
                              />
                            )}
                            {/* Pending QC (Purple/Grape) */}
                            {pPending > 0 && (
                              <circle 
                                cx="18" cy="18" r="15.915" 
                                fill="none" stroke="#cc5de8" 
                                strokeWidth="3.6" 
                                strokeDasharray={`${pPending} ${100 - pPending}`} 
                                strokeDashoffset={offset1}
                              />
                            )}
                            {/* Ditolak QC (Red) */}
                            {pRejected > 0 && (
                              <circle 
                                cx="18" cy="18" r="15.915" 
                                fill="none" stroke="#f03e3e" 
                                strokeWidth="3.6" 
                                strokeDasharray={`${pRejected} ${100 - pRejected}`} 
                                strokeDashoffset={offset2}
                              />
                            )}
                          </>
                        );
                      })()}
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                      <Text size="lg" fw={700} c="var(--ds-primary)">{totalIntakeCount}</Text>
                      <Text size="xxs" c="dimmed" tt="uppercase" lts={1}>Batch</Text>
                    </div>
                  </div>

                  <Stack gap="5" style={{ minWidth: 100 }}>
                    <Group gap="xs" wrap="nowrap">
                      <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#0ca678' }} />
                      <div>
                        <Text size="xs" fw={700}>Lolos QC</Text>
                        <Text size="xxs" c="dimmed">{acceptedQcCount} batch ({Math.round((acceptedQcCount / totalIntakeCount) * 100)}%)</Text>
                      </div>
                    </Group>
                    <Group gap="xs" wrap="nowrap">
                      <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#cc5de8' }} />
                      <div>
                        <Text size="xs" fw={700}>Pending QC</Text>
                        <Text size="xxs" c="dimmed">{pendingQcCount} batch ({Math.round((pendingQcCount / totalIntakeCount) * 100)}%)</Text>
                      </div>
                    </Group>
                    <Group gap="xs" wrap="nowrap">
                      <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#f03e3e' }} />
                      <div>
                        <Text size="xs" fw={700}>Ditolak QC</Text>
                        <Text size="xxs" c="dimmed">{rejectedQcCount} batch ({Math.round((rejectedQcCount / totalIntakeCount) * 100)}%)</Text>
                      </div>
                    </Group>
                  </Stack>
                </Group>
              )}
            </Stack>
          </Paper>
        </SimpleGrid>

        {/* Supplier Leaderboard & Recent Intakes Grid */}
        <SimpleGrid cols={{ base: 1, md: 5 }} spacing="lg">
          {/* Top Suppliers AHP Rank (2 cols) */}
          <Paper p="xl" radius="md" withBorder style={{ gridColumn: 'span 2' }}>
            <Stack gap="md">
              <Group justify="space-between">
                <Group gap="xs">
                  <IconAward size={22} color="#1e5b3a" />
                  <Title order={3} size="h4" style={{ fontFamily: 'var(--ds-font-display, inherit)', color: '#1e5b3a' }}>
                    Top Pemasok Terbaik (AHP)
                  </Title>
                </Group>
                <Badge color="emerald" variant="light" size="sm">Keputusan AI</Badge>
              </Group>
              <Text size="xs" c="dimmed" mt={-6}>
                Pemasok dengan nilai komprehensif tertinggi berdasarkan kualitas bahan baku (riwayat QC) dan kriteria AHP pengadaan
              </Text>

              {rankedSuppliers.length === 0 ? (
                <Stack align="center" justify="center" h={250}>
                  <Text c="dimmed" size="sm">Belum ada pemasok terdaftar.</Text>
                </Stack>
              ) : (
                <Stack gap="sm" mt="xs">
                  {rankedSuppliers.map((sup, index) => {
                    let recColor = 'gray';
                    if (sup.recommendation === 'Excellent Supplier') recColor = 'green';
                    else if (sup.recommendation === 'Good Supplier') recColor = 'blue';
                    else recColor = 'orange';

                    const recTextMap = {
                      'Excellent Supplier': 'Sangat Baik',
                      'Good Supplier': 'Baik',
                      'Needs Improvement': 'Butuh Evaluasi',
                    };

                    return (
                      <Paper key={sup.id} p="xs" radius="sm" withBorder style={{ backgroundColor: index === 0 ? '#f4faf6' : 'transparent', border: index === 0 ? '1px solid #c2ffd8' : '1px solid #e9ecef' }}>
                        <Group justify="space-between" wrap="nowrap">
                          <Group gap="sm" wrap="nowrap">
                            <Box style={{ 
                              width: 32, 
                              height: 32, 
                              borderRadius: '50%', 
                              backgroundColor: index === 0 ? '#1e5b3a' : '#e9ecef', 
                              color: index === 0 ? '#ffffff' : '#495057',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: 14
                            }}>
                              {index + 1}
                            </Box>
                            <div>
                              <Text size="sm" fw={700} c="var(--ds-gray-800)" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                                {sup.name}
                              </Text>
                              <Text size="xxs" c="dimmed">{sup.code}</Text>
                            </div>
                          </Group>

                          <Stack align="flex-end" gap="2">
                            <Text size="md" fw={800} c="#1e5b3a">
                              {Math.round(sup.finalScore)}%
                            </Text>
                            <Badge color={recColor} size="xs" variant="light">
                              {recTextMap[sup.recommendation]}
                            </Badge>
                          </Stack>
                        </Group>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          </Paper>

          {/* Recent Transactons Table (3 cols) */}
          <Paper p="xl" radius="md" withBorder style={{ gridColumn: 'span 3' }}>
            <Stack gap="md">
              <Title order={3} size="h4" style={{ fontFamily: 'var(--ds-font-display, inherit)', color: '#1e5b3a' }}>
                Penerimaan Bahan Baku Terbaru
              </Title>
              <Text size="xs" c="dimmed" mt={-10}>5 kedatangan pengiriman bahan baku terakhir yang dicatat ke sistem</Text>

              <Table.ScrollContainer minWidth={500} mt="xs">
                <Table striped highlightOnHover verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>No. Penerimaan</Table.Th>
                      <Table.Th>Bahan Baku</Table.Th>
                      <Table.Th>Pemasok</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Jumlah</Table.Th>
                      <Table.Th>Status QC</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {recentIntakes.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={5} style={{ textAlign: 'center', color: 'var(--ds-gray-500)' }}>
                          Belum ada transaksi penerimaan bahan baku.
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      recentIntakes.map(item => {
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
                            </Table.Td>
                            <Table.Td>
                              <Text size="xs" c="dimmed">{getSupplierName(item)}</Text>
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
            </Stack>
          </Paper>
        </SimpleGrid>
      </Stack>
    </Container>
  );
}

// Minimal Box placeholder for local usage
function Box({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={style}>{children}</div>;
}
